import { ChatMessage } from "@/constants/interfaces";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { getCurrentUser } from "./auth";
import { createSafeRealtimeChannel, supabase } from "./supabaseConfig";


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

    const { data, error } = await query;

    if (error) {
      console.warn("Fetch chat messages notice (falling back to cache):", error.message);
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
