import { ChatMessage } from "@/constants/interfaces";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { getCurrentUser } from "./auth";
import { createSafeRealtimeChannel, supabase } from "./supabaseConfig";
import { safeSupabaseRequest } from "./safeRequest";


export interface PrivateChat {
  id: string;
  user_id_1: string;
  user_id_2: string;
  contact_name: string | null;
  contact_relationship: string | null;
  contact_avatar_url: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendMessageParams {
  chatId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  senderAvatarUrl?: string;
  type: "text" | "audio" | "media" | "location_share";
  textContent?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
  locationTimestampText?: string;
}

/**
 * Maps a raw row from `private_chat_messages` to the UI `ChatMessage` interface.
 */
export function mapDbMessageToChatMessage(row: any, currentUserId: string): ChatMessage {
  const isMe = row.sender_id === currentUserId;
  const createdDate = row.created_at ? new Date(row.created_at) : new Date();
  const formattedTime = createdDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: String(row.id),
    chatId: row.chat_id,
    senderId: row.sender_id,
    sender: isMe ? "me" : "other",
    senderName: row.sender_name || undefined,
    senderRole: row.sender_role || undefined,
    senderAvatar: row.sender_avatar_url || undefined,
    timestamp: formattedTime,
    type: row.type || "text",
    text: row.text_content || undefined,
    audioUri: row.audio_url || undefined,
    audioDuration: row.audio_duration_sec != null ? Number(row.audio_duration_sec) : undefined,
    mediaUri: row.media_url || undefined,
    mediaType: row.media_type || undefined,
    locationCoords:
      row.location_lat != null && row.location_lng != null
        ? { latitude: Number(row.location_lat), longitude: Number(row.location_lng) }
        : undefined,
    locationTimestampText: row.location_timestamp_text || undefined,
    status: "sent",
    createdTimestamp: createdDate.getTime(),
    createdAtIso: row.created_at,
  };
}

// ── Local Storage & Offline Message Caching ──────────────────────────────────

const CHAT_MESSAGES_CACHE_PREFIX = "@resq_chat_messages_";
const PRIVATE_CHAT_CACHE_PREFIX = "@resq_private_chat_";

export async function getCachedChatMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    if (!chatId) return [];
    const raw = await AsyncStorage.getItem(`${CHAT_MESSAGES_CACHE_PREFIX}${chatId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("getCachedChatMessages notice:", err);
    return [];
  }
}

export async function setCachedChatMessages(chatId: string, messages: ChatMessage[]): Promise<void> {
  try {
    if (!chatId || !messages) return;
    const toCache = messages.slice(-100);
    await AsyncStorage.setItem(`${CHAT_MESSAGES_CACHE_PREFIX}${chatId}`, JSON.stringify(toCache));
  } catch (err) {
    console.warn("setCachedChatMessages notice:", err);
  }
}

export async function getCachedPrivateChat(otherUserId: string): Promise<PrivateChat | null> {
  try {
    if (!otherUserId) return null;
    const raw = await AsyncStorage.getItem(`${PRIVATE_CHAT_CACHE_PREFIX}${otherUserId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedPrivateChat(otherUserId: string, chat: PrivateChat): Promise<void> {
  try {
    if (!otherUserId || !chat) return;
    await AsyncStorage.setItem(`${PRIVATE_CHAT_CACHE_PREFIX}${otherUserId}`, JSON.stringify(chat));
  } catch { }
}

/**
 * Finds an existing private chat between current user and target contact user,
 * or creates a new row if one does not exist yet.
 */
export async function getOrCreatePrivateChat(
  otherUserId: string,
  contactInfo?: { name?: string; relationship?: string; avatarUrl?: string }
): Promise<{ chat: PrivateChat | null; error: string | null }> {
  try {
    const cached = await getCachedPrivateChat(otherUserId);

    const { user: currentUser, error: userError } = await getCurrentUser();
    if (userError || !currentUser) {
      if (cached) return { chat: cached, error: null };
      return { chat: null, error: userError || "User not authenticated" };
    }

    if (currentUser.id === otherUserId) {
      return { chat: null, error: "Cannot create a private chat with yourself." };
    }

    // Query for existing chat regardless of user ordering
    const { data: existingChats, error: queryError } = await supabase
      .from("private_chat")
      .select("*")
      .or(
        `and(user_id_1.eq.${currentUser.id},user_id_2.eq.${otherUserId}),and(user_id_1.eq.${otherUserId},user_id_2.eq.${currentUser.id})`
      )
      .limit(1);

    if (queryError) {
      console.warn("Error querying private chat (checking local cache):", queryError.message);
      if (cached) return { chat: cached, error: null };
      return { chat: null, error: queryError.message };
    }

    if (existingChats && existingChats.length > 0) {
      const found = existingChats[0] as PrivateChat;
      await setCachedPrivateChat(otherUserId, found);
      return { chat: found, error: null };
    }

    // Insert new private chat pairing
    const { data: newChat, error: insertError } = await supabase
      .from("private_chat")
      .insert({
        user_id_1: currentUser.id,
        user_id_2: otherUserId,
        contact_name: contactInfo?.name || null,
        contact_relationship: contactInfo?.relationship || null,
        contact_avatar_url: contactInfo?.avatarUrl || null,
      })
      .select("*")
      .single();

    if (insertError) {
      console.warn("Error creating private chat (checking local cache):", insertError.message);
      if (cached) return { chat: cached, error: null };
      return { chat: null, error: insertError.message };
    }

    const created = newChat as PrivateChat;
    await setCachedPrivateChat(otherUserId, created);
    return { chat: created, error: null };
  } catch (err: any) {
    console.warn("getOrCreatePrivateChat exception (checking local cache):", err?.message || err);
    const cached = await getCachedPrivateChat(otherUserId);
    if (cached) return { chat: cached, error: null };
    return { chat: null, error: err?.message || "Failed to initialize private chat" };
  }
}

/**
 * Fetches paginated messages for a given chatId, ordered by created_at DESC (newest first).
 * Reverses the array before returning so it's chronologically ordered (oldest to newest).
 */
export async function fetchChatMessages(
  chatId: string,
  currentUserId: string,
  limit: number = 35,
  beforeCreatedAt?: string
): Promise<{ messages: ChatMessage[]; hasMore: boolean; error: string | null }> {
  try {
    let query = supabase
      .from("private_chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (beforeCreatedAt) {
      query = query.lt("created_at", beforeCreatedAt);
    }

    const { data, error } = await safeSupabaseRequest<any[]>(
      () => query,
      { retryId: `fetchChatMessages_${chatId}` }
    );

    if (error) {
      console.warn("Fetch chat messages notice (falling back to cache):", error.message || error);
      const cached = await getCachedChatMessages(chatId);
      return { messages: cached, hasMore: false, error: null };
    }

    if (!data) {
      const cached = await getCachedChatMessages(chatId);
      return { messages: cached, hasMore: false, error: null };
    }

    const hasMore = data.length === limit;
    const mapped = data.map((row) => mapDbMessageToChatMessage(row, currentUserId));

    // Reverse to get chronological order (oldest -> newest)
    const sorted = mapped.reverse();

    // Store in cache for offline fallback
    if (!beforeCreatedAt) {
      await setCachedChatMessages(chatId, sorted);
    }

    return { messages: sorted, hasMore, error: null };
  } catch (err: any) {
    console.warn("fetchChatMessages notice (falling back to cache):", err?.message || err);
    const cached = await getCachedChatMessages(chatId);
    return { messages: cached, hasMore: false, error: null };
  }
}

/**
 * Inserts a message row into `private_chat_messages` and updates `private_chat` last message details.
 */
export async function sendChatMessage(
  params: SendMessageParams
): Promise<{ message: any | null; error: string | null }> {
  try {
    const {
      chatId,
      senderId,
      senderName,
      senderRole,
      senderAvatarUrl,
      type,
      textContent,
      audioUrl,
      audioDurationSec,
      mediaUrl,
      mediaType,
      locationLat,
      locationLng,
      locationLabel,
      locationTimestampText,
    } = params;

    const { data: insertedMsg, error: insertError } = await supabase
      .from("private_chat_messages")
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        sender_name: senderName || null,
        sender_role: senderRole || null,
        sender_avatar_url: senderAvatarUrl || null,
        type,
        text_content: textContent || null,
        audio_url: audioUrl || null,
        audio_duration_sec: audioDurationSec != null ? Math.round(audioDurationSec) : null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        location_lat: locationLat != null ? locationLat : null,
        location_lng: locationLng != null ? locationLng : null,
        location_label: locationLabel || null,
        location_timestamp_text: locationTimestampText || null,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting chat message:", insertError);
      return { message: null, error: insertError.message };
    }

    // Determine preview text for chat header/list
    let preview = textContent || "";
    if (type === "audio") {
      preview = "🎤 Voice Note";
    } else if (type === "media") {
      preview = mediaType === "video" ? "🎥 Video Attachment" : "📷 Photo Attachment";
    } else if (type === "location_share") {
      preview = "📍 Shared Location";
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("private_chat")
      .update({
        last_message_at: nowIso,
        last_message_preview: preview,
        updated_at: nowIso,
      })
      .eq("id", chatId);

    return { message: insertedMsg, error: null };
  } catch (err: any) {
    console.error("sendChatMessage exception:", err);
    return { message: null, error: err.message || "Failed to send message" };
  }
}

/**
 * Uploads a local voice note audio file to Supabase Storage in bucket `images` under `privateChatMedia/audio/`.
 */
export async function uploadChatAudio(fileUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);
  const ext = fileUri.split(".").pop() || "m4a";
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `privateChatMedia/audio/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, arrayBuffer, {
      contentType: `audio/${ext}`,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Audio upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Uploads an image or video file to Supabase Storage in bucket `images` under `privateChatMedia/media/`.
 */
export async function uploadChatMedia(
  fileUri: string,
  mediaType: "image" | "video"
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);
  const ext = fileUri.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `privateChatMedia/media/${fileName}`;

  const contentType =
    mediaType === "video"
      ? `video/${ext === "mov" ? "quicktime" : "mp4"}`
      : `image/${ext === "png" ? "png" : "jpeg"}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Media upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Subscribes to Supabase Realtime changes for a specific chat ID.
 * Listens for new message INSERTs and private_chat UPDATEs.
 * Returns an unsubscribe callback for proper cleanup.
 */
export function subscribeToChatMessages(
  chatId: string,
  onNewMessage: (rawMsg: any) => void,
  onChatUpdated?: (chat: any) => void
): () => void {
  try {
    const channel = createSafeRealtimeChannel(`private-chat-${chatId}`, (ch) =>
      ch
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "private_chat_messages",
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            if (payload.new) {
              onNewMessage(payload.new);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "private_chat",
            filter: `id=eq.${chatId}`,
          },
          (payload) => {
            if (payload.new) {
              onChatUpdated?.(payload.new);
            }
          }
        )
    );

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) { }
    };
  } catch (err: any) {
    console.warn("subscribeToChatMessages setup notice:", err?.message || err);
    return () => { };
  }
}

// ============================================================================
// UUID GENERATION & HELPERS
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return UUID_REGEX.test(str);
}

/**
 * Generates an RFC4122 v4 compliant UUID string for database Primary Key insertion.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    try {
      return (crypto as any).randomUUID();
    } catch (_) { }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// EMERGENCY CHAT & MESSAGES FUNCTIONS
// ============================================================================

export interface EmergencyChat {
  id: string;
  emergency_title: string;
  emergency_location: string | null;
  severity: string | null;
  creator_id: string | null;
  participant_ids: string[];
  is_active: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendEmergencyChatMessageParams {
  id?: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  senderAvatarUrl?: string;
  type: "text" | "audio" | "media" | "location_share" | "system" | "location" | "walk_safe" | "im_okay";
  textContent?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
  isSystemMessage?: boolean;
}

/**
 * Maps a raw row from `emergency_chat_messages` to the UI `ChatMessage` interface.
 */
export function mapDbEmergencyMessageToChatMessage(row: any, currentUserId: string): ChatMessage {
  const isSystem = row.is_system_message || row.type === "system";
  const isMe = !isSystem && row.sender_id === currentUserId;
  const createdDate = row.created_at ? new Date(row.created_at) : new Date();
  const formattedTime = createdDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  let msgType: ChatMessage["type"] = row.type || "text";
  if (isSystem) {
    msgType = "system";
  } else if (msgType === ("location" as any)) {
    msgType = "location_share";
  }

  return {
    id: String(row.id),
    chatId: row.chat_id,
    senderId: row.sender_id,
    sender: isSystem ? "system" : isMe ? "me" : "other",
    senderName: row.sender_name || undefined,
    senderRole: row.sender_role || undefined,
    senderAvatar: row.sender_avatar_url || undefined,
    timestamp: formattedTime,
    type: msgType,
    text: row.text_content || undefined,
    audioUri: row.audio_url || undefined,
    audioDuration: row.audio_duration_sec != null ? Number(row.audio_duration_sec) : undefined,
    mediaUri: row.media_url || undefined,
    mediaType: row.media_type || undefined,
    locationCoords:
      row.location_lat != null && row.location_lng != null
        ? { latitude: Number(row.location_lat), longitude: Number(row.location_lng) }
        : undefined,
    locationLabel: row.location_label || undefined,
    isSystemMessage: isSystem,
    status: "sent",
    createdTimestamp: createdDate.getTime(),
    createdAtIso: row.created_at,
  };
}

// ── Emergency Chat Local Caching & Pending Messages ──────────────────────────

const EMERGENCY_CHAT_CACHE_PREFIX = "@resq_emergency_chat_messages_";
const EMERGENCY_PENDING_CACHE_PREFIX = "@resq_emergency_pending_messages_";

export async function getCachedEmergencyMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    if (!chatId) return [];
    const raw = await AsyncStorage.getItem(`${EMERGENCY_CHAT_CACHE_PREFIX}${chatId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("getCachedEmergencyMessages notice:", err);
    return [];
  }
}

export async function setCachedEmergencyMessages(chatId: string, messages: ChatMessage[]): Promise<void> {
  try {
    if (!chatId || !messages) return;
    const toCache = messages.slice(-150);
    await AsyncStorage.setItem(`${EMERGENCY_CHAT_CACHE_PREFIX}${chatId}`, JSON.stringify(toCache));
  } catch (err) {
    console.warn("setCachedEmergencyMessages notice:", err);
  }
}

export async function getPendingEmergencyMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    if (!chatId) return [];
    const raw = await AsyncStorage.getItem(`${EMERGENCY_PENDING_CACHE_PREFIX}${chatId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePendingEmergencyMessage(chatId: string, msg: ChatMessage): Promise<void> {
  try {
    if (!chatId || !msg) return;
    const pending = await getPendingEmergencyMessages(chatId);
    const existingIdx = pending.findIndex((p) => p.id === msg.id);
    if (existingIdx >= 0) {
      pending[existingIdx] = msg;
    } else {
      pending.push(msg);
    }
    await AsyncStorage.setItem(`${EMERGENCY_PENDING_CACHE_PREFIX}${chatId}`, JSON.stringify(pending));
  } catch (err) {
    console.warn("savePendingEmergencyMessage notice:", err);
  }
}

export async function removePendingEmergencyMessage(
  chatId: string,
  msgId?: string,
  text?: string
): Promise<void> {
  try {
    if (!chatId) return;
    const pending = await getPendingEmergencyMessages(chatId);
    const filtered = pending.filter((p) => {
      if (msgId && p.id === msgId) return false;
      if (text && p.text && p.text.trim() === text.trim()) return false;
      return true;
    });
    await AsyncStorage.setItem(`${EMERGENCY_PENDING_CACHE_PREFIX}${chatId}`, JSON.stringify(filtered));
  } catch { }
}

/**
 * Deduplicates and sorts messages chronologically by `createdTimestamp`.
 */
export function mergeAndDeduplicateMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();

  // Add existing messages
  existing.forEach((m) => {
    if (m && m.id) map.set(m.id, m);
  });

  // Merge incoming
  incoming.forEach((m) => {
    if (!m || !m.id) return;

    let currentKey = m.id;
    let current = map.get(m.id);

    // If no direct ID match, look for a pending/sending/failed item matching content & sender
    if (!current) {
      for (const [key, item] of map.entries()) {
        const isPending =
          item.status === "sending" ||
          item.status === "pending" ||
          item.status === "failed";

        if (isPending) {
          const sameSender =
            item.senderId === m.senderId ||
            item.sender === m.sender ||
            (m.sender === "me" && item.sender === "me");

          const sameText =
            !!item.text &&
            !!m.text &&
            item.text.trim().toLowerCase() === m.text.trim().toLowerCase();

          const sameAudio = !!item.audioUri && !!m.audioUri && item.audioUri === m.audioUri;
          const sameMedia = !!item.mediaUri && !!m.mediaUri && item.mediaUri === m.mediaUri;

          if (sameSender && (sameText || sameAudio || sameMedia)) {
            currentKey = key;
            current = item;
            break;
          }
        }
      }
    }

    if (!current) {
      map.set(m.id, m);
    } else {
      // If we matched a pending item with a different key, remove old pending key
      if (currentKey !== m.id) {
        map.delete(currentKey);
      }

      const currentIsPending =
        current.status === "sending" ||
        current.status === "pending" ||
        current.status === "failed";

      if (currentIsPending && (m.status === "sent" || !m.status)) {
        map.set(m.id, { ...current, ...m, status: "sent" });
      } else {
        const finalStatus =
          current.status === "sent" || m.status === "sent"
            ? "sent"
            : m.status || current.status;
        map.set(m.id, { ...current, ...m, status: finalStatus });
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = a.createdTimestamp || 0;
    const timeB = b.createdTimestamp || 0;
    return timeA - timeB;
  });
}

/**
 * Finds or creates an emergency chat record in table `emergency_chat`.
 * Merges responders from `emergency_responders` table with creator_id to form `participant_ids`.
 */
export async function getOrCreateEmergencyChat(params: {
  incidentId: string;
  title?: string;
  location?: string;
  severity?: string;
  creatorId?: string;
}): Promise<{ chat: EmergencyChat | null; error: string | null }> {
  try {
    const { incidentId: rawIncidentId, title, location, severity, creatorId } = params;
    if (!rawIncidentId) {
      return { chat: null, error: "Emergency Incident ID is required." };
    }

    const incidentId = isValidUuid(rawIncidentId) ? rawIncidentId : generateUUID();
    const validCreatorId = isValidUuid(creatorId) ? creatorId : null;

    // 1. Fetch active responders from `emergency_responders` table
    const responderIds: string[] = [];
    if (isValidUuid(incidentId)) {
      const { data: responders } = await supabase
        .from("emergency_responders")
        .select("responder_id")
        .eq("emergency_id", incidentId);
      if (responders) {
        responders.forEach((r: any) => {
          if (r.responder_id && isValidUuid(r.responder_id)) {
            responderIds.push(r.responder_id);
          }
        });
      }
    }
    const { user: currentUser } = await getCurrentUser();

    const participantSet = new Set<string>();
    if (creatorId && isValidUuid(creatorId)) participantSet.add(creatorId);
    if (currentUser?.id && isValidUuid(currentUser.id)) participantSet.add(currentUser.id);
    responderIds.forEach((id: string) => {
      if (isValidUuid(id)) participantSet.add(id);
    });
    const participantIds = Array.from(participantSet);

    // 2. Query for existing chat record in `emergency_chat`
    const { data: existingChat, error: fetchErr } = await supabase
      .from("emergency_chat")
      .select("*")
      .eq("id", incidentId)
      .maybeSingle();

    if (fetchErr && !fetchErr.message.includes("Rows contain no instances")) {
      console.warn("Notice querying emergency_chat table:", fetchErr.message);
    }

    const nowIso = new Date().toISOString();

    if (existingChat) {
      // Update participant_ids if changed
      const { data: updatedChat } = await supabase
        .from("emergency_chat")
        .update({
          participant_ids: participantIds,
          emergency_title: title || existingChat.emergency_title,
          emergency_location: location || existingChat.emergency_location,
          severity: severity || existingChat.severity,
          updated_at: nowIso,
        })
        .eq("id", incidentId)
        .select("*")
        .single();

      return { chat: (updatedChat || existingChat) as EmergencyChat, error: null };
    }

    // 3. Create new emergency_chat row
    const { data: newChat, error: insertErr } = await supabase
      .from("emergency_chat")
      .insert({
        id: incidentId,
        emergency_title: title || "Emergency Response",
        emergency_location: location || null,
        severity: severity || "Critical",
        creator_id: creatorId || null,
        participant_ids: participantIds,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.warn("Emergency chat insert notice (fallback to local mock object):", insertErr.message);
      const fallbackChat: EmergencyChat = {
        id: incidentId,
        emergency_title: title || "Emergency Response",
        emergency_location: location || null,
        severity: severity || "Critical",
        creator_id: creatorId || null,
        participant_ids: participantIds,
        is_active: true,
        resolved_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      return { chat: fallbackChat, error: null };
    }

    return { chat: newChat as EmergencyChat, error: null };
  } catch (err: any) {
    console.warn("getOrCreateEmergencyChat exception:", err?.message || err);
    return { chat: null, error: err?.message || "Failed to initialize emergency chat" };
  }
}

/**
 * Fetches paginated emergency chat messages from table `emergency_chat_messages`.
 * Ordered chronologically (oldest -> newest).
 */
export async function fetchEmergencyChatMessages(
  chatId: string,
  currentUserId: string,
  limit: number = 50,
  beforeCreatedAt?: string
): Promise<{ messages: ChatMessage[]; hasMore: boolean; error: string | null }> {
  try {
    if (!chatId) return { messages: [], hasMore: false, error: null };

    let query = supabase
      .from("emergency_chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (beforeCreatedAt) {
      query = query.lt("created_at", beforeCreatedAt);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("fetchEmergencyChatMessages warning (using cache):", error.message);
      const cached = await getCachedEmergencyMessages(chatId);
      return { messages: cached, hasMore: false, error: null };
    }

    if (!data) {
      const cached = await getCachedEmergencyMessages(chatId);
      return { messages: cached, hasMore: false, error: null };
    }

    const hasMore = data.length === limit;
    const mapped = data.map((row) => mapDbEmergencyMessageToChatMessage(row, currentUserId));

    // Reverse to ascending chronological order (oldest -> newest)
    const sorted = mapped.reverse();

    if (!beforeCreatedAt) {
      await setCachedEmergencyMessages(chatId, sorted);
    }

    return { messages: sorted, hasMore, error: null };
  } catch (err: any) {
    console.warn("fetchEmergencyChatMessages exception (using cache):", err?.message || err);
    const cached = await getCachedEmergencyMessages(chatId);
    return { messages: cached, hasMore: false, error: null };
  }
}

/**
 * Inserts a message row into `emergency_chat_messages` table using client-supplied unique ID.
 */
export async function sendEmergencyChatMessage(
  params: SendEmergencyChatMessageParams
): Promise<{ message: any | null; error: string | null }> {
  try {
    const {
      id,
      chatId,
      senderId,
      senderName,
      senderRole,
      senderAvatarUrl,
      type,
      textContent,
      audioUrl,
      audioDurationSec,
      mediaUrl,
      mediaType,
      locationLat,
      locationLng,
      locationLabel,
      isSystemMessage,
    }: SendEmergencyChatMessageParams = params;
    const { user: currentUser } = await getCurrentUser();
    const validChatId = isValidUuid(chatId) ? chatId : generateUUID();
    const validSenderId = currentUser?.id || (isValidUuid(senderId) ? senderId : generateUUID());

    let dbType = type;
    let dbIsSystem = !!isSystemMessage;

    if (dbType === ("system" as any)) {
      dbType = "text";
      dbIsSystem = true;
    } else if (dbType === ("location" as any)) {
      dbType = "location_share";
    }

    const payload: any = {
      chat_id: validChatId,
      sender_id: validSenderId,
      sender_name: senderName || null,
      sender_role: senderRole || null,
      sender_avatar_url: senderAvatarUrl || null,
      type: dbType,
      text_content: textContent || null,
      audio_url: audioUrl || null,
      audio_duration_sec: audioDurationSec != null ? Math.round(audioDurationSec) : null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      location_lat: locationLat != null ? locationLat : null,
      location_lng: locationLng != null ? locationLng : null,
      location_label: locationLabel || null,
      is_system_message: dbIsSystem,
    };

    if (id && isValidUuid(id)) {
      payload.id = id;
    } else {
      payload.id = generateUUID();
    }

    const { data: insertedMsg, error: insertError } = await supabase
      .from("emergency_chat_messages")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting emergency chat message:", insertError);
      return { message: null, error: insertError.message };
    }

    // Touch updated_at on emergency_chat
    await supabase
      .from("emergency_chat")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    return { message: insertedMsg, error: null };
  } catch (err: any) {
    console.error("sendEmergencyChatMessage exception:", err);
    return { message: null, error: err.message || "Failed to send message" };
  }
}

/**
 * Uploads a local voice note audio file to Supabase Storage bucket `images` under folder `emergencyChatMedia/audio/`.
 */
export async function uploadEmergencyChatAudio(fileUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);
  const ext = fileUri.split(".").pop() || "m4a";
  const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `emergencyChatMedia/audio/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, arrayBuffer, {
      contentType: `audio/${ext}`,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Emergency audio upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Uploads an image or video file to Supabase Storage bucket `images` under folder `emergencyChatMedia/media/`.
 */
export async function uploadEmergencyChatMedia(
  fileUri: string,
  mediaType: "image" | "video"
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);
  const ext = fileUri.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
  const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `emergencyChatMedia/media/${fileName}`;

  const contentType =
    mediaType === "video"
      ? `video/${ext === "mov" ? "quicktime" : "mp4"}`
      : `image/${ext === "png" ? "png" : "jpeg"}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Emergency media upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Subscribes to Supabase Realtime changes for a specific emergency chat ID.
 * Listens for INSERT on `emergency_chat_messages` and UPDATE on `emergency_chat`.
 */
export function subscribeToEmergencyChatMessages(
  chatId: string,
  onNewMessage: (rawMsg: any) => void,
  onChatUpdated?: (chat: any) => void,
  onStatusChange?: (status: string, err?: any) => void
): () => void {
  try {
    const channel = createSafeRealtimeChannel(
      `emergency-chat-${chatId}`,
      (ch) =>
        ch
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "emergency_chat_messages",
              filter: `chat_id=eq.${chatId}`,
            },
            (payload) => {
              if (payload.new) {
                onNewMessage(payload.new);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "emergency_chat",
              filter: `id=eq.${chatId}`,
            },
            (payload) => {
              if (payload.new) {
                onChatUpdated?.(payload.new);
              }
            }
          ),
      onStatusChange
    );

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) { }
    };
  } catch (err: any) {
    console.warn("subscribeToEmergencyChatMessages setup notice:", err?.message || err);
    return () => { };
  }
}

/**
 * Subscribes to Realtime changes on `emergency_responders` table for participant updates.
 */
export function subscribeToEmergencyResponders(
  emergencyId: string,
  onRespondersChanged: () => void
): () => void {
  try {
    const channel = createSafeRealtimeChannel(`emergency-responders-${emergencyId}`, (ch) =>
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_responders",
          filter: `emergency_id=eq.${emergencyId}`,
        },
        () => {
          onRespondersChanged();
        }
      )
    );

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) { }
    };
  } catch (err: any) {
    console.warn("subscribeToEmergencyResponders notice:", err?.message || err);
    return () => { };
  }
}

