import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { getCurrentUser } from "./auth";
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
