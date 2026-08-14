import { globalState } from "@/constants/globalState";
import { Person } from "@/constants/interfaces";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { fetchUserProfileById, getCurrentUser, UserProfile } from "./auth";
import { supabase } from "./supabaseConfig";

export interface EmergencyRecord {
  id: string;
  title: string;
  description: string | null;
  location_text: string;
  latitude: number;
  longitude: number;
  location_geom?: any;
  severity: string | null;
  is_resolved: boolean | null;
  false_alarm: boolean | null;
  creator_id: string | null;
  responders_count: number | null;
  created_at: string | null;
  resolved_at: string | null;
  response_time_seconds: number | null;
  voice_notes: string[] | null;
  visual_media: string[] | null;
  nearest_landmark: string | null;
}

export interface CreateEmergencyParams {
  title: string;
  description: string;
  location_text: string;
  latitude: number;
  longitude: number;
  severity: "Critical" | "Moderate" | "Low";
  nearest_landmark: string;
  voiceNotesUris?: string[];
  visualMediaFiles?: { uri: string; type: "image" | "video" }[];
}

/**
 * Uploads a local voice note audio file to Supabase Storage.
 * Uses bucket 'emergencies' (with fallback to 'images' if bucket not found)
 * under folder 'incidentDetailsMedia/audio/'.
 */
export async function uploadEmergencyAudio(fileUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);
  const ext = fileUri.split(".").pop() || "m4a";
  const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `incidentDetailsMedia/audio/${fileName}`;

  // Primary bucket: 'emergencies'
  let bucketName = "emergencies";
  let { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, arrayBuffer, {
      contentType: `audio/${ext}`,
      upsert: true,
    });

  // Fallback to 'images' bucket if 'emergencies' bucket does not exist
  if (uploadError && uploadError.message?.toLowerCase().includes("bucket not found")) {
    console.warn(`Bucket '${bucketName}' not found, falling back to 'images'...`);
    bucketName = "images";
    const fallbackRes = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: `audio/${ext}`,
        upsert: true,
      });
    uploadError = fallbackRes.error;
  }

  if (uploadError) {
    throw new Error(`Voice note upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Uploads an image or video file to Supabase Storage.
 * Uses bucket 'emergencies' (with fallback to 'images' if bucket not found)
 * under folder 'incidentDetailsMedia/media/'.
 */
export async function uploadEmergencyMedia(
  fileUri: string,
  mediaType: "image" | "video"
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);
  const ext =
    fileUri.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
  const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `incidentDetailsMedia/media/${fileName}`;

  const contentType =
    mediaType === "video"
      ? `video/${ext === "mov" ? "quicktime" : "mp4"}`
      : `image/${ext === "png" ? "png" : "jpeg"}`;

  // Primary bucket: 'emergencies'
  let bucketName = "emergencies";
  let { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  // Fallback to 'images' bucket if 'emergencies' bucket does not exist
  if (uploadError && uploadError.message?.toLowerCase().includes("bucket not found")) {
    console.warn(`Bucket '${bucketName}' not found, falling back to 'images'...`);
    bucketName = "images";
    const fallbackRes = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });
    uploadError = fallbackRes.error;
  }

  if (uploadError) {
    throw new Error(`Visual media upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Validates, uploads media assets, and inserts a new emergency record into Supabase `public.emergencies`.
 */
export async function createEmergencyReport(
  params: CreateEmergencyParams
): Promise<{ data: EmergencyRecord | null; error: Error | null }> {
  try {
    // 1. Validation
    if (!params.title || !params.title.trim()) {
      return { data: null, error: new Error("Incident title is required.") };
    }
    if (!params.description || !params.description.trim()) {
      return { data: null, error: new Error("Incident description is required.") };
    }
    if (!params.location_text || !params.location_text.trim()) {
      return { data: null, error: new Error("Location details are required.") };
    }
    if (
      typeof params.latitude !== "number" ||
      isNaN(params.latitude) ||
      typeof params.longitude !== "number" ||
      isNaN(params.longitude)
    ) {
      return { data: null, error: new Error("Valid GPS coordinates (latitude and longitude) are required.") };
    }
    if (!params.severity) {
      return { data: null, error: new Error("Severity level is required.") };
    }

    // 2. Authentication check
    const { user } = await getCurrentUser();
    if (!user) {
      return { data: null, error: new Error("You must be logged in to report an emergency.") };
    }

    // 3. Upload Voice Notes first
    const voiceNoteUrls: string[] = [];
    if (params.voiceNotesUris && params.voiceNotesUris.length > 0) {
      for (const uri of params.voiceNotesUris) {
        // Skip web/http URLs if already uploaded
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          voiceNoteUrls.push(uri);
        } else {
          const uploadedUrl = await uploadEmergencyAudio(uri);
          voiceNoteUrls.push(uploadedUrl);
        }
      }
    }

    // 4. Upload Visual Media first
    const visualMediaUrls: string[] = [];
    if (params.visualMediaFiles && params.visualMediaFiles.length > 0) {
      for (const item of params.visualMediaFiles) {
        if (item.uri.startsWith("http://") || item.uri.startsWith("https://")) {
          visualMediaUrls.push(item.uri);
        } else {
          const uploadedUrl = await uploadEmergencyMedia(item.uri, item.type);
          visualMediaUrls.push(uploadedUrl);
        }
      }
    }

    // 5. Insert Emergency record into database
    const payload = {
      title: params.title.trim(),
      description: params.description.trim(),
      location_text: params.location_text.trim(),
      latitude: params.latitude,
      longitude: params.longitude,
      severity: params.severity,
      is_resolved: false,
      false_alarm: false,
      creator_id: user.id,
      responders_count: 0,
      voice_notes: voiceNoteUrls,
      visual_media: visualMediaUrls,
      nearest_landmark: params.nearest_landmark.trim(),
    };

    const { data, error } = await supabase
      .from("emergencies")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert emergency error:", error);
      return { data: null, error: new Error(error.message || "Failed to create emergency record.") };
    }

    return { data: data as EmergencyRecord, error: null };
  } catch (err: any) {
    console.error("Error creating emergency report:", err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetches all emergency records from Supabase, excluding those created by the given user.
 * Returns records ordered by created_at descending (newest first).
 */
export async function fetchEmergencies(
  excludeUserId: string
): Promise<{ data: EmergencyRecord[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("emergencies")
      .select("*")
      .neq("creator_id", excludeUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchEmergencies error:", error);
      return { data: [], error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    // Filter out emergencies where user's response history status is 'done'
    if (excludeUserId) {
      const historyMap = await fetchUserEmergencyHistoryMap(excludeUserId);
      const filtered = (data as EmergencyRecord[]).filter((rec) => {
        const userStatus = historyMap[rec.id];
        return userStatus !== "done" && userStatus !== "done_helping";
      });
      return { data: filtered, error: null };
    }

    return { data: (data as EmergencyRecord[]) || [], error: null };
  } catch (err: any) {
    console.error("fetchEmergencies exception:", err);
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Subscribes to real-time changes on the emergencies table.
 * Calls `onUpdate` whenever any INSERT/UPDATE/DELETE occurs (except for the current user's own records).
 * Returns the channel so the caller can unsubscribe later.
 */
export function subscribeToEmergencies(
  excludeUserId: string,
  onUpdate: () => void,
  onStatusChange?: (status: string) => void
) {
  try {
    const channelName = `emergencies-all-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergencies" },
        (payload) => {
          // Ignore changes caused by the current user
          const record = (payload.new || payload.old) as EmergencyRecord | null;
          if (record && record.creator_id === excludeUserId) return;
          onUpdate();
        }
      )
      .subscribe((status, err) => {
        if (onStatusChange) {
          onStatusChange(status);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`Emergencies realtime channel notice [${status}]:`, err?.message || "Network offline");
        }
      });

    return channel;
  } catch (err) {
    console.warn("subscribeToEmergencies setup warning:", err);
    return null;
  }
}

/**
 * Fetches a single emergency record by ID from Supabase.
 */
export async function fetchEmergencyById(
  id: string
): Promise<{ data: EmergencyRecord | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("emergencies")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    return { data: (data as EmergencyRecord) || null, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Utility to convert a Supabase EmergencyRecord (and optional creator UserProfile) to a standard UI Person object.
 */
export function mapEmergencyRecordToPerson(
  r: EmergencyRecord,
  creatorProfile?: UserProfile | null
): Person {
  const creatorName = creatorProfile?.name || "Resident in Distress";
  const urgency: Person["urgency"] =
    r.severity === "Critical"
      ? "critical"
      : r.severity === "Moderate"
        ? "high"
        : "medium";

  return {
    id: r.id,
    name: creatorName,
    title: r.title,
    creatorId: r.creator_id ?? undefined,
    address: r.nearest_landmark || r.location_text || "Location details unavailable",
    avatarColor: "#AF101A",
    markerColor: "#AF101A",
    latitude: typeof r.latitude === "number" ? r.latitude : 6.675155,
    longitude: typeof r.longitude === "number" ? r.longitude : -1.571569,
    urgency,
    description: r.description || r.title || "",
    requesterDesc: r.description || `${r.title} near ${r.nearest_landmark || r.location_text}`,
    images: r.visual_media || [],
    knownHealthProblems: creatorProfile?.known_health_problems || ["None"],
    falseAlarm: r.false_alarm ?? false,
    isResolved: r.is_resolved ?? false,
  };
}

export interface EmergencyResponderRecord {
  id?: string;
  emergency_id: string;
  responder_id: string;
  status: "responding" | "arrived";
  responded_at?: string | null;
  arrived_at?: string | null;
}

export interface EmergencyResponseHistoryRecord {
  id?: string;
  emergency_id: string;
  responder_id: string;
  transport_mode: string;
  estimated_arrival_seconds?: number | null;
  estimated_arrival_at?: string | null;
  responded_at?: string | null;
  actual_arrival_at?: string | null;
  cancelled_at?: string | null;
  status: "responding" | "arrived" | "cancelled";
  created_at?: string | null;
}

/**
 * Creates/upserts responder record in emergency_responders table
 * and inserts a new attempt record into emergency_response_history table.
 */
export async function recordEmergencyResponse(params: {
  emergencyId: string;
  transportMode: string;
  estimatedArrivalSeconds: number;
}): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return { success: false, error: new Error("User not authenticated.") };
    }

    const userId = user.id;
    const nowIso = new Date().toISOString();
    const estimatedArrivalAt = new Date(
      Date.now() + params.estimatedArrivalSeconds * 1000
    ).toISOString();

    // 1. Upsert current relationship in emergency_responders table
    const { error: responderErr } = await supabase
      .from("emergency_responders")
      .upsert(
        {
          emergency_id: params.emergencyId,
          responder_id: userId,
          status: "responding",
          responded_at: nowIso,
          arrived_at: null,
        },
        { onConflict: "emergency_id,responder_id" }
      );

    if (responderErr) {
      console.warn("emergency_responders upsert warning:", responderErr.message);
    }

    // 2. Insert new attempt record into emergency_response_history table
    const { error: historyErr } = await supabase
      .from("emergency_response_history")
      .insert([
        {
          emergency_id: params.emergencyId,
          responder_id: userId,
          transport_mode: params.transportMode,
          estimated_arrival_seconds: params.estimatedArrivalSeconds,
          estimated_arrival_at: estimatedArrivalAt,
          responded_at: nowIso,
          status: "responding",
          created_at: nowIso,
        },
      ]);

    if (historyErr) {
      console.warn("emergency_response_history insert warning:", historyErr.message);
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("recordEmergencyResponse error:", err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Marks responder as arrived in emergency_response_history table and stops responding active transit.
 */
export async function confirmEmergencyArrival(params: {
  emergencyId: string;
}): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return { success: false, error: new Error("User not authenticated.") };
    }

    const userId = user.id;
    const nowIso = new Date().toISOString();

    // 1. Update active history record in emergency_response_history table to status 'arrived'
    const { error: historyErr } = await supabase
      .from("emergency_response_history")
      .update({
        status: "arrived",
        actual_arrival_at: nowIso,
      })
      .eq("emergency_id", params.emergencyId)
      .eq("responder_id", userId);

    if (historyErr) {
      console.warn("confirmEmergencyArrival emergency_response_history warning:", historyErr.message);
    }

    // 2. Stop responding active transit (remove from emergency_responders table)
    // await cancelEmergencyResponse({ emergencyId: params.emergencyId });
    const { error: responderErr } = await supabase
      .from("emergency_responders")
      .delete()
      .eq("emergency_id", params.emergencyId)
      .eq("responder_id", userId);

    // 3. Ensure history status remains 'arrived'
    await supabase
      .from("emergency_response_history")
      .update({
        status: "arrived",
        actual_arrival_at: nowIso,
      })
      .eq("emergency_id", params.emergencyId)
      .eq("responder_id", userId);

    return { success: true, error: null };
  } catch (err: any) {
    console.error("confirmEmergencyArrival error:", err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Marks responder's participation in emergency as completed ('done') in emergency_response_history table.
 * Removes emergency from responder's personal feed without resolving emergency for others.
 */
export async function markEmergencyResponseDone(params: {
  emergencyId: string;
}): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return { success: false, error: new Error("User not authenticated.") };
    }

    const userId = user.id;

    // 1. Update emergency_response_history status to 'done_helping' for this user
    const { error: historyErr } = await supabase
      .from("emergency_response_history")
      .update({
        status: "done_helping",
      })
      .eq("emergency_id", params.emergencyId)
      .eq("responder_id", userId);

    if (historyErr) {
      console.warn("markEmergencyResponseDone emergency_response_history warning:", historyErr.message);
    }

    // 2. Remove user from emergency_responders table if still present
    await supabase
      .from("emergency_responders")
      .delete()
      .eq("emergency_id", params.emergencyId)
      .eq("responder_id", userId);

    // 3. Clear active emergency state in globalState if it matches
    if (globalState.activeEmergencyId === params.emergencyId) {
      globalState.activeEmergencyId = null;
      globalState.activeEmergencyPerson = null;
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("markEmergencyResponseDone error:", err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetches user's emergency_response_history records and maps emergency_id to latest status ('responding', 'arrived', 'done', 'cancelled').
 */
export async function fetchUserEmergencyHistoryMap(
  userId: string
): Promise<Record<string, "responding" | "arrived" | "done" | "done_helping" | "cancelled">> {
  try {
    if (!userId) return {};
    const { data, error } = await supabase
      .from("emergency_response_history")
      .select("emergency_id, status, created_at")
      .eq("responder_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return {};

    const historyMap: Record<string, "responding" | "arrived" | "done" | "done_helping" | "cancelled"> = {};
    data.forEach((r: any) => {
      if (r.emergency_id && !historyMap[r.emergency_id]) {
        historyMap[r.emergency_id] = r.status;
      }
    });

    return historyMap;
  } catch (_) {
    return {};
  }
}

/**
 * Fetches current user's response status for a specific emergency from emergency_response_history table.
 */
export async function fetchUserEmergencyStatus(
  emergencyId: string
): Promise<"responding" | "arrived" | "done" | "done_helping" | "cancelled" | null> {
  try {
    const { user } = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("emergency_response_history")
      .select("status")
      .eq("emergency_id", emergencyId)
      .eq("responder_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return (data.status as any) || null;
  } catch (_) {
    return null;
  }
}

/**
 * Cancels emergency response attempt by removing the responder from emergency_responders table
 * and updating the attempt status to 'cancelled' in emergency_response_history table.
 */
export async function cancelEmergencyResponse(params: {
  emergencyId: string;
}): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return { success: false, error: new Error("User not authenticated.") };
    }

    const userId = user.id;
    const nowIso = new Date().toISOString();

    // 1. REMOVE user from emergency_responders table (User is NO LONGER an active responder)
    const { error: responderErr } = await supabase
      .from("emergency_responders")
      .delete()
      .eq("emergency_id", params.emergencyId)
      .eq("responder_id", userId);

    if (responderErr) {
      console.warn("cancelEmergencyResponse emergency_responders delete warning:", responderErr.message);
    }

    // 2. Update active history record in emergency_response_history table (Archive / Audit trail only)
    const { error: historyErr } = await supabase
      .from("emergency_response_history")
      .update({
        status: "cancelled",
        cancelled_at: nowIso,
      })
      .eq("emergency_id", params.emergencyId)
      .eq("responder_id", userId)
      .eq("status", "responding");

    if (historyErr) {
      console.warn("cancelEmergencyResponse emergency_response_history warning:", historyErr.message);
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("cancelEmergencyResponse error:", err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetches total count of current active responders directly from emergency_responders table.
 */
export async function fetchActiveRespondersCount(
  emergencyId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("emergency_responders")
      .select("id", { count: "exact", head: true })
      .eq("emergency_id", emergencyId);

    if (error) return 0;
    return count || 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Fetches all active responders for a given emergency strictly from emergency_responders table,
 * joined with user profile details from users table.
 */
export async function fetchEmergencyResponders(
  emergencyId: string
): Promise<{ data: any[]; error: Error | null }> {
  try {
    const { data: responders, error } = await supabase
      .from("emergency_responders")
      .select("*")
      .eq("emergency_id", emergencyId);

    if (error) {
      console.warn("fetchEmergencyResponders warning:", error.message);
      return { data: [], error: new Error(error.message) };
    }

    if (!responders || responders.length === 0) {
      return { data: [], error: null };
    }

    const userIds = responders.map((r: any) => r.responder_id).filter(Boolean);
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("*")
        .in("id", userIds);

      if (usersData) {
        usersData.forEach((u: any) => {
          usersMap[u.id] = u;
        });
      }
    }

    const result = responders.map((r: any) => {
      const u = usersMap[r.responder_id];
      return {
        ...r,
        responderName: u?.name || "Responder",
        responderRole: (u?.role || "RESPONDER").toUpperCase(),
        responderPhone: u?.phone || null,
        profile_img_url: u?.profile_img_url || null,
      };
    });

    return { data: result, error: null };
  } catch (err: any) {
    console.error("fetchEmergencyResponders exception:", err);
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetches the emergency that the currently authenticated user is responding to from emergency_responders table.
 * Returns the responder record, emergency record, and mapped Person object if found, or null if not actively responding.
 */
export async function getCurrentRespondingEmergency(): Promise<{
  data: {
    responderRecord: EmergencyResponderRecord;
    emergency: EmergencyRecord;
    person: Person;
  } | null;
  error: Error | null;
}> {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      globalState.activeEmergencyId = null;
      globalState.activeEmergencyPerson = null;
      return { data: null, error: null };
    }

    // 1. Fetch active responder record for current user from emergency_responders table
    const { data: responderRecord, error: responderErr } = await supabase
      .from("emergency_responders")
      .select("*")
      .eq("responder_id", user.id)
      .maybeSingle();

    if (responderErr) {
      console.warn("getCurrentRespondingEmergency responder fetch warning:", responderErr.message);
      return { data: null, error: new Error(responderErr.message) };
    }

    if (!responderRecord || !responderRecord.emergency_id) {
      globalState.activeEmergencyId = null;
      globalState.activeEmergencyPerson = null;
      return { data: null, error: null };
    }

    // 2. Fetch emergency details from emergencies table
    const { data: emergencyRecord, error: empErr } = await fetchEmergencyById(
      responderRecord.emergency_id
    );

    if (empErr || !emergencyRecord || emergencyRecord.is_resolved) {
      globalState.activeEmergencyId = null;
      globalState.activeEmergencyPerson = null;
      return { data: null, error: empErr || null };
    }

    // 3. Fetch creator profile for complete Person object mapping if creator_id exists
    let creatorProfile = null;
    if (emergencyRecord.creator_id) {
      creatorProfile = await fetchUserProfileById(emergencyRecord.creator_id);
    }

    const person = mapEmergencyRecordToPerson(emergencyRecord, creatorProfile);

    // Sync globalState with active responding emergency
    globalState.activeEmergencyId = responderRecord.emergency_id;
    globalState.activeEmergencyPerson = person;

    return {
      data: {
        responderRecord,
        emergency: emergencyRecord,
        person,
      },
      error: null,
    };
  } catch (err: any) {
    console.error("getCurrentRespondingEmergency error:", err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Subscribes to real-time changes on emergency_responders and emergencies tables for the current user.
 * Automatically updates globalState.activeEmergencyId and globalState.activeEmergencyPerson in real-time.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToCurrentRespondingEmergency(
  onUpdate?: (data: {
    responderRecord: EmergencyResponderRecord;
    emergency: EmergencyRecord;
    person: Person;
  } | null) => void
): () => void {
  let responderChannel: any = null;
  let emergencyChannel: any = null;
  let isSubscribed = true;

  const refreshState = async () => {
    if (!isSubscribed) return;
    const res = await getCurrentRespondingEmergency();

    // Explicitly set globalState properties
    globalState.activeEmergencyId = res.data?.emergency?.id || null;
    globalState.activeEmergencyPerson = res.data?.person || null;

    if (onUpdate && isSubscribed) {
      onUpdate(res.data);
    }
    return res.data;
  };

  // Immediate initial sync
  refreshState();

  (async () => {
    try {
      const { user } = await getCurrentUser();
      if (!user || !isSubscribed) return;

      const uid = user.id;
      const nonce = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // 1. Channel for user's responder record changes
      const responderChannelName = `resp-sub-${uid}-${nonce}`;
      responderChannel = supabase
        .channel(responderChannelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "emergency_responders",
            filter: `responder_id=eq.${uid}`,
          },
          () => {
            refreshState();
          }
        )
        .subscribe();

      // 2. Channel for emergency record updates (e.g. resolution)
      const emergencyChannelName = `emp-sub-${uid}-${nonce}`;
      emergencyChannel = supabase
        .channel(emergencyChannelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "emergencies",
          },
          (payload) => {
            if (
              globalState.activeEmergencyId &&
              payload.new &&
              (payload.new as any).id === globalState.activeEmergencyId
            ) {
              refreshState();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("subscribeToCurrentRespondingEmergency setup error:", err);
    }
  })();

  return () => {
    isSubscribed = false;
    if (responderChannel) {
      try {
        supabase.removeChannel(responderChannel);
      } catch (_) { }
    }
    if (emergencyChannel) {
      try {
        supabase.removeChannel(emergencyChannel);
      } catch (_) { }
    }
  };
}

/**
 * Fetches emergency record along with creator user profile and active responders.
 */
export async function fetchEmergencyDetails(emergencyId: string): Promise<{
  emergency: EmergencyRecord | null;
  creator: UserProfile | null;
  responders: any[];
  error: Error | null;
}> {
  try {
    const { data: emergency, error: empError } = await fetchEmergencyById(emergencyId);
    if (empError) {
      return { emergency: null, creator: null, responders: [], error: empError };
    }
    if (!emergency) {
      return { emergency: null, creator: null, responders: [], error: null };
    }

    let creator: UserProfile | null = null;
    if (emergency.creator_id) {
      creator = await fetchUserProfileById(emergency.creator_id);
    }

    const { data: responders } = await fetchEmergencyResponders(emergencyId);

    return {
      emergency,
      creator,
      responders: responders || [],
      error: null,
    };
  } catch (err: any) {
    return {
      emergency: null,
      creator: null,
      responders: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Subscribes to real-time changes for a single emergency record by ID.
 */
export function subscribeToEmergencyById(
  emergencyId: string,
  onUpdate: (updatedRecord: Partial<EmergencyRecord>) => void
) {
  try {
    const channelName = `incident-detail-${emergencyId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergencies",
          filter: `id=eq.${emergencyId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as Partial<EmergencyRecord>);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn("subscribeToEmergencyById setup warning:", err);
    return null;
  }
}

/**
 * Subscribes to real-time changes on emergency_responders table for a specific emergency.
 */
export function subscribeToEmergencyResponders(
  emergencyId: string,
  onUpdate: () => void
) {
  try {
    const channelName = `incident-responders-${emergencyId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_responders",
          filter: `emergency_id=eq.${emergencyId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn("subscribeToEmergencyResponders setup warning:", err);
    return null;
  }
}

/**
 * Unsubscribes and removes a Supabase realtime channel.
 */
export function unsubscribeChannel(channel: any) {
  if (channel) {
    try {
      supabase.removeChannel(channel);
    } catch (_) { }
  }
}

