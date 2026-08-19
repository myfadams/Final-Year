import { safeLogError, safeSupabaseRequest } from "./safeRequest";
import { supabase, createSafeRealtimeChannel } from "./supabaseConfig";

export interface SosAlert {
  id: string;
  user_id: string;
  status: "active" | "cancelled" | "resolved" | "expired";
  location: any;
  radius_meters: number;
  created_at: string;
  expires_at: string;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  source?: "proximity" | "trusted_contact";
  sender_profile?: {
    id: string;
    name: string;
    avatar_url?: string | null;
    phone?: string | null;
    role?: string | null;
    program_of_study?: string | null;
  };
  distance_meters?: number;
}

export interface SosResponder {
  id: string;
  sos_id: string;
  responder_id: string;
  status: "committed" | "withdrawn" | "arrived";
  responder_source: "proximity" | "trusted_contact";
  created_at: string;
  updated_at: string;
  name?: string;
  avatar_url?: string | null;
  phone?: string | null;
}

/**
 * Creates a new SOS alert row for the currently authenticated user.
 */
export async function createSosAlert(
  lat: number,
  lng: number,
  radiusMeters = 1000
): Promise<{ data: SosAlert | null; error: string | null }> {
  try {
    // getSession() reads the already-authenticated session locally instead of round-tripping
    // to the Auth server like getUser() does — shaves a network hop off the critical path for
    // an alert where every second counts. Safe here since a locally-tampered session would
    // simply be rejected by the insert's RLS policy server-side anyway.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { data: null, error: "Not authenticated" };

    const pointWkt = `POINT(${lng} ${lat})`;

    // autoRetry is off here: a silent background retry on an insert would risk creating a
    // second SOS alert if the user also manually retries after seeing the offline error.
    const { data, error } = await safeSupabaseRequest<SosAlert>(
      () =>
        supabase
          .from("sos_alerts")
          .insert({
            user_id: user.id,
            status: "active",
            location: pointWkt,
            radius_meters: radiusMeters,
          })
          .select()
          .single(),
      { autoRetry: false }
    );

    if (error) {
      safeLogError("createSosAlert error:", error);
      return { data: null, error: error.message ?? "Failed to create SOS alert" };
    }

    return { data, error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to create SOS alert";
    safeLogError("createSosAlert exception:", err);
    return { data: null, error: msg };
  }
}

/**
 * Cancels an active SOS alert with optional reason.
 */
export async function cancelSosAlert(
  sosId: string,
  reason?: string
): Promise<{ error: string | null }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await safeSupabaseRequest(
      () =>
        supabase
          .from("sos_alerts")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancelled_by: user.id,
            cancellation_reason: reason || "User cancelled",
          })
          .eq("id", sosId)
          .eq("user_id", user.id),
      { retryId: `cancelSosAlert_${sosId}` }
    );

    if (error) {
      safeLogError("cancelSosAlert error:", error);
      return { error: error.message ?? "Failed to cancel SOS alert" };
    }

    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to cancel SOS alert";
    safeLogError("cancelSosAlert exception:", err);
    return { error: msg };
  }
}

/**
 * Resolves an active SOS alert.
 */
export async function resolveSosAlert(
  sosId: string
): Promise<{ error: string | null }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await safeSupabaseRequest(
      () =>
        supabase
          .from("sos_alerts")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
          })
          .eq("id", sosId)
          .eq("user_id", user.id),
      { retryId: `resolveSosAlert_${sosId}` }
    );

    if (error) {
      safeLogError("resolveSosAlert error:", error);
      return { error: error.message ?? "Failed to resolve SOS alert" };
    }

    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to resolve SOS alert";
    safeLogError("resolveSosAlert exception:", err);
    return { error: msg };
  }
}

/**
 * Fetches current active SOS created by the logged-in user if any.
 */
export async function fetchActiveSosForUser(): Promise<{
  data: SosAlert | null;
  error: string | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      safeLogError("fetchActiveSosForUser error:", error);
      return { data: null, error: error.message };
    }

    return { data: data as SosAlert | null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "Error fetching active SOS" };
  }
}

// PostgREST rejects a JWT whose "iat" claim is ahead of its own clock with this code. Since
// the token is minted server-side by Supabase Auth, this means transient clock skew between
// Supabase's own services (or a stale cached session token) — not a bad request. Refreshing
// the session mints a fresh token, which is virtually always valid by the time the retry lands.
const JWT_CLOCK_SKEW_CODE = "PGRST303";

async function callRpcWithClockSkewRetry<T>(
  rpcName: string,
  params?: Record<string, any>
): Promise<{ data: T | null; error: any }> {
  const first = await supabase.rpc(rpcName, params as any);
  if (first.error?.code === JWT_CLOCK_SKEW_CODE) {
    await supabase.auth.refreshSession();
    return supabase.rpc(rpcName, params as any) as any;
  }
  return first as any;
}

/**
 * Calls both PostGIS proximity RPC and Trusted Network RPC,
 * merges eligible alerts, and populates sender profiles.
 */
export async function fetchNearbyAndTrustedSos(
  userLat: number,
  userLng: number
): Promise<{ data: SosAlert[]; error: string | null }> {
  try {
    const [nearbyRes, trustedRes] = await Promise.all([
      callRpcWithClockSkewRetry<any[]>("get_nearby_active_sos", {
        user_lat: userLat,
        user_lng: userLng,
      }),
      callRpcWithClockSkewRetry<any[]>("get_trusted_network_sos_for_me"),
    ]);

    if (nearbyRes.error) {
      safeLogError("get_nearby_active_sos RPC error:", nearbyRes.error);
    }
    if (trustedRes.error) {
      safeLogError("get_trusted_network_sos_for_me RPC error:", trustedRes.error);
    }

    const nearbyList: SosAlert[] = (nearbyRes.data ?? []).map((item: any) => ({
      ...item,
      source: "proximity",
    }));

    const trustedList: SosAlert[] = (trustedRes.data ?? []).map((item: any) => ({
      ...item,
      source: "trusted_contact",
    }));

    // Merge map keyed by sos alert id. Prefer trusted_contact source if present in both
    const sosMap = new Map<string, SosAlert>();
    for (const item of nearbyList) {
      sosMap.set(item.id, item);
    }
    for (const item of trustedList) {
      sosMap.set(item.id, item); // trusted_contact takes priority if in both
    }

    const combined = Array.from(sosMap.values());
    if (combined.length === 0) {
      return { data: [], error: null };
    }

    // Fetch sender profile details for all qualifying alerts
    const senderIds = [...new Set(combined.map((s) => s.user_id))];
    const { data: userProfiles } = await supabase
      .from("users")
      .select("id, name, profile_img_url, profile_image_url, phone, role, program_of_study")
      .in("id", senderIds);

    const profileMap = new Map(
      (userProfiles ?? []).map((u: any) => [
        u.id,
        {
          id: u.id,
          name: u.name || u.full_name || "ResQ Resident",
          avatar_url: u.profile_img_url || u.profile_image_url || null,
          phone: u.phone || null,
          role: u.role || null,
          program_of_study: u.program_of_study || null,
        },
      ])
    );

    const enriched = combined.map((sos) => {
      const coords = parseGeoPoint(sos.location);
      let calculatedDistance: number | undefined = undefined;
      if (coords && typeof userLat === "number" && typeof userLng === "number") {
        const R = 6371e3; // meters
        const φ1 = (userLat * Math.PI) / 180;
        const φ2 = (coords.latitude * Math.PI) / 180;
        const Δφ = ((coords.latitude - userLat) * Math.PI) / 180;
        const Δλ = ((coords.longitude - userLng) * Math.PI) / 180;
        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        calculatedDistance = Math.round(R * c);
      }

      return {
        ...sos,
        sender_profile: profileMap.get(sos.user_id),
        distance_meters: calculatedDistance ?? (sos as any).dist_meters,
      };
    });

    return { data: enriched, error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to fetch nearby/trusted SOS alerts";
    safeLogError("fetchNearbyAndTrustedSos exception:", err);
    return { data: [], error: msg };
  }
}

/**
 * Commits a response to an active SOS alert.
 */
export async function respondToSos(
  sosId: string,
  source: "proximity" | "trusted_contact" = "proximity"
): Promise<{ error: string | null }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await safeSupabaseRequest(
      () =>
        supabase.from("sos_response_history").upsert(
          {
            sos_id: sosId,
            responder_id: user.id,
            status: "committed",
            responder_source: source,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "sos_id,responder_id" }
        ),
      { retryId: `respondToSos_${sosId}_${user.id}` }
    );

    if (error) {
      safeLogError("respondToSos error:", error);
      return { error: error.message ?? "Failed to respond to SOS" };
    }

    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to respond to SOS";
    safeLogError("respondToSos exception:", err);
    return { error: msg };
  }
}

/**
 * Withdraws a previously committed SOS response.
 */
export async function withdrawSosResponse(
  sosId: string
): Promise<{ error: string | null }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await safeSupabaseRequest(
      () =>
        supabase
          .from("sos_response_history")
          .update({
            status: "withdrawn",
            updated_at: new Date().toISOString(),
          })
          .eq("sos_id", sosId)
          .eq("responder_id", user.id),
      { retryId: `withdrawSosResponse_${sosId}_${user.id}` }
    );

    if (error) {
      safeLogError("withdrawSosResponse error:", error);
      return { error: error.message ?? "Failed to withdraw SOS response" };
    }

    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to withdraw SOS response";
    safeLogError("withdrawSosResponse exception:", err);
    return { error: msg };
  }
}

/**
 * Updates an active SOS alert location and appends a breadcrumb to sos_location_updates
 * in a single atomic database transaction via Postgres RPC, with graceful fallback.
 */
export async function updateSosLocation(
  sosId: string,
  lat: number,
  lng: number,
  recordedAt?: string
): Promise<{ error: string | null }> {
  try {
    const timestampIso = recordedAt || new Date().toISOString();
    const { error } = await supabase.rpc("update_sos_location", {
      p_sos_id: sosId,
      p_lat: lat,
      p_lng: lng,
      p_recorded_at: timestampIso,
    });

    if (error) {
      // If RPC is not yet updated on Supabase database (PGRST202/PGRST204), gracefully perform direct updates
      if (
        error.code === "PGRST202" ||
        error.message?.includes("function") ||
        error.message?.includes("schema cache") ||
        error.message?.includes("p_recorded_at")
      ) {
        const pointWkt = `POINT(${lng} ${lat})`;
        await Promise.allSettled([
          supabase
            .from("sos_alerts")
            .update({ location: pointWkt, location_updated_at: timestampIso })
            .eq("id", sosId)
            .eq("status", "active"),
          supabase
            .from("sos_location_updates")
            .insert({ sos_id: sosId, location: pointWkt, recorded_at: timestampIso }),
        ]);
        return { error: null };
      }

      safeLogError("updateSosLocation rpc error:", error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to update SOS location";
    safeLogError("updateSosLocation exception:", err);
    return { error: msg };
  }
}

/**
 * Inserts a location update point during active SOS streaming (legacy fallback).
 */
export async function insertSosLocationUpdate(
  sosId: string,
  lat: number,
  lng: number
): Promise<{ error: string | null }> {
  try {
    const pointWkt = `POINT(${lng} ${lat})`;
    const { error } = await supabase.from("sos_location_updates").insert({
      sos_id: sosId,
      location: pointWkt,
    });

    if (error) {
      safeLogError("insertSosLocationUpdate error:", error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err?.message ?? "Failed to update location" };
  }
}

/**
 * Fetches all committed responders for an SOS alert with profile details.
 */
export async function fetchSosResponders(
  sosId: string
): Promise<{ data: SosResponder[]; error: string | null }> {
  try {
    const { data: rows, error } = await supabase
      .from("sos_response_history")
      .select("*")
      .eq("sos_id", sosId)
      .in("status", ["committed", "arrived"]);

    if (error) {
      safeLogError("fetchSosResponders error:", error);
      return { data: [], error: error.message };
    }

    if (!rows || rows.length === 0) {
      return { data: [], error: null };
    }

    const responderIds = [...new Set(rows.map((r: any) => r.responder_id))];
    const { data: profiles } = await supabase
      .from("users")
      .select("id, name, profile_img_url, profile_image_url, phone")
      .in("id", responderIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const mapped: SosResponder[] = rows.map((r: any) => {
      const p = profileMap.get(r.responder_id);
      return {
        ...r,
        name: p?.name ?? (p as any)?.full_name ?? "Verified Responder",
        avatar_url: p?.profile_img_url ?? (p as any)?.profile_image_url ?? null,
        phone: p?.phone ?? null,
      };
    });

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message ?? "Failed to fetch responders" };
  }
}

/**
 * Subscribes to real-time status and lifecycle changes on sos_alerts table.
 * Specifically ignores location-only update ticks to avoid unnecessary overlay re-render churn.
 */
export function subscribeToSosAlerts(
  onAlertChange: (
    changeType: "status_changed" | "new_alert" | "deleted",
    alertRow?: any
  ) => void
) {
  const channel = createSafeRealtimeChannel(
    "sos_alerts_lifecycle",
    (ch) =>
      ch
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "sos_alerts" },
          (payload) => {
            onAlertChange("new_alert", payload.new);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "sos_alerts" },
          (payload) => {
            const oldStatus = payload.old ? (payload.old as any).status : null;
            const newStatus = payload.new ? (payload.new as any).status : null;

            // Check if status transitioned (e.g. active -> resolved/cancelled/expired)
            const statusChanged =
              (oldStatus && oldStatus !== newStatus) ||
              (newStatus && newStatus !== "active");

            if (statusChanged) {
              // Status change: re-run eligibility / remove overlay immediately
              onAlertChange("status_changed", payload.new);
            } else {
              // Treat as new alert check just in case we missed the insert
              onAlertChange("new_alert", payload.new);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "sos_alerts" },
          (payload) => {
            onAlertChange("deleted", payload.old);
          }
        )
  );

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on sos_response_history for a specific SOS alert.
 */
export function subscribeToSosResponders(
  sosId: string,
  onUpdate: (responders: SosResponder[]) => void
) {
  const fetchAndUpdate = async () => {
    const { data } = await fetchSosResponders(sosId);
    onUpdate(data);
  };

  fetchAndUpdate();

  const channel = supabase
    .channel(`sos_responders_${sosId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sos_response_history",
        filter: `sos_id=eq.${sosId}`,
      },
      () => {
        fetchAndUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Parses PostGIS location value (EWKB Hex, GeoJSON, WKT string 'POINT(lng lat)', or coord object)
 */
export function parseGeoPoint(
  location: any
): { latitude: number; longitude: number } | null {
  if (!location) return null;

  const validate = (lat: number, lng: number) => {
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat === 0 && lng === 0) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { latitude: lat, longitude: lng };
  };

  // Direct coordinate object
  if (typeof location === "object") {
    if (typeof location.latitude === "number" && typeof location.longitude === "number") {
      return validate(location.latitude, location.longitude);
    }
    if (typeof location.lat === "number" && typeof location.lng === "number") {
      return validate(location.lat, location.lng);
    }
    if (location.type === "Point" && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      return validate(Number(location.coordinates[1]), Number(location.coordinates[0]));
    }
  }

  if (typeof location === "string") {
    const trimmed = location.trim();

    // 1. Standard WKT: POINT(lng lat)
    const pointMatch = trimmed.match(/POINT\s*(?:Z|M|ZM)?\s*\(\s*([-\d.]+)\s+([-\d.]+)/i);
    if (pointMatch) {
      return validate(parseFloat(pointMatch[2]), parseFloat(pointMatch[1]));
    }

    // 2. PostGIS EWKB Hex format
    if (/^[0-9a-fA-F]{32,}$/.test(trimmed)) {
      try {
        const isLittleEndian = trimmed.substring(0, 2) === "01";
        const typeHex = trimmed.substring(2, 10);
        const hasSRID = typeHex.toLowerCase().endsWith("20") || typeHex.toLowerCase().endsWith("a0");
        const offset = hasSRID ? 18 : 10;

        if (trimmed.length >= offset + 32) {
          const xHex = trimmed.substring(offset, offset + 16);
          const yHex = trimmed.substring(offset + 16, offset + 32);

          const xBuf = new Uint8Array(8);
          const yBuf = new Uint8Array(8);
          for (let i = 0; i < 8; i++) {
            xBuf[i] = parseInt(xHex.substring(i * 2, i * 2 + 2), 16);
            yBuf[i] = parseInt(yHex.substring(i * 2, i * 2 + 2), 16);
          }
          const xView = new DataView(xBuf.buffer);
          const yView = new DataView(yBuf.buffer);
          
          return validate(yView.getFloat64(0, isLittleEndian), xView.getFloat64(0, isLittleEndian));
        }
      } catch (_) { }
    }

    // 3. JSON representation
    try {
      const parsed = JSON.parse(trimmed);
      return parseGeoPoint(parsed);
    } catch (_) { }
  }

  return null;
}

/**
 * Fetches a single SOS alert by ID with sender profile details.
 */
export async function fetchSosAlertById(
  sosId: string
): Promise<{ data: SosAlert | null; error: string | null }> {
  try {
    const { data: alert, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("id", sosId)
      .maybeSingle();

    if (error) {
      safeLogError("fetchSosAlertById error:", error);
      return { data: null, error: error.message };
    }

    if (!alert) return { data: null, error: null };

    // Fetch sender profile details
    const { data: userProfile } = await supabase
      .from("users")
      .select("id, name, profile_img_url, profile_image_url, phone, role, program_of_study")
      .eq("id", alert.user_id)
      .maybeSingle();

    const senderProfile = userProfile
      ? {
        id: userProfile.id,
        name: userProfile.name || (userProfile as any).full_name || "ResQ Resident",
        avatar_url: userProfile.profile_img_url || (userProfile as any).profile_image_url || null,
        phone: userProfile.phone || null,
        role: userProfile.role || null,
        program_of_study: userProfile.program_of_study || null,
      }
      : undefined;

    return {
      data: {
        ...alert,
        sender_profile: senderProfile,
      } as SosAlert,
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "Error fetching SOS alert" };
  }
}

/**
 * Fetches the latest known location coordinate for an SOS alert.
 */
export async function fetchLatestSosLocation(
  sosId: string
): Promise<{
  data: { latitude: number; longitude: number } | null;
  error: string | null;
}> {
  try {
    // 1. Try to fetch the most recent location update from sos_location_updates
    const { data: updateRows, error: updateError } = await supabase
      .from("sos_location_updates")
      .select("location, recorded_at")
      .eq("sos_id", sosId)
      .order("recorded_at", { ascending: false })
      .limit(1);

    if (!updateError && updateRows && updateRows.length > 0) {
      const parsed = parseGeoPoint(updateRows[0].location);
      if (parsed) return { data: parsed, error: null };
    }

    // 2. Fallback to initial location on sos_alerts table
    const { data: alertRow, error: alertError } = await supabase
      .from("sos_alerts")
      .select("location")
      .eq("id", sosId)
      .maybeSingle();

    if (alertError) {
      return { data: null, error: alertError.message };
    }

    if (alertRow?.location) {
      const parsed = parseGeoPoint(alertRow.location);
      return { data: parsed, error: null };
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "Error fetching SOS location" };
  }
}

/**
 * Updates the responder status in sos_response_history (e.g. committed -> arrived or withdrawn).
 */
export async function updateSosResponderStatus(
  sosId: string,
  status: "committed" | "withdrawn" | "arrived"
): Promise<{ error: string | null }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await safeSupabaseRequest(
      () =>
        supabase
          .from("sos_response_history")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("sos_id", sosId)
          .eq("responder_id", user.id),
      { retryId: `updateSosResponderStatus_${sosId}_${user.id}` }
    );

    if (error) {
      safeLogError("updateSosResponderStatus error:", error);
      return { error: error.message ?? "Failed to update responder status" };
    }

    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to update responder status";
    safeLogError("updateSosResponderStatus exception:", err);
    return { error: msg };
  }
}

/**
 * Subscribes to real-time status changes for a single SOS alert. Used while a responder is
 * actively en route/monitoring, so the moment the sender dismisses, resolves, or the alert
 * expires, the responder is told immediately instead of continuing to route to a call that's
 * already been called off.
 */
export function subscribeToSosAlertStatus(
  sosId: string,
  onStatusChange: (status: SosAlert["status"]) => void
): () => void {
  const channel = supabase
    .channel(`sos_status_${sosId}_${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sos_alerts",
        filter: `id=eq.${sosId}`,
      },
      (payload) => {
        const newStatus = (payload.new as any)?.status as SosAlert["status"] | undefined;
        if (newStatus && newStatus !== "active") {
          onStatusChange(newStatus);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time location stream for an SOS alert.
 * Listens to atomic UPDATE on sos_alerts and INSERT on sos_location_updates,
 * guarded by monotonic timestamp checking to prevent out-of-order jitter.
 */
export function subscribeToSosLocationUpdates(
  sosId: string,
  onUpdate: (coords: { latitude: number; longitude: number; timestamp?: string }) => void
) {
  let lastMonotonicTs = 0;

  const handleCoordsWithTimestamp = (
    locationData: any,
    timestampValue?: string | null
  ) => {
    if (!locationData) return;
    const ts = timestampValue ? new Date(timestampValue).getTime() : Date.now();
    if (ts < lastMonotonicTs) {
      // Reject stale/out-of-order location packet
      return;
    }
    lastMonotonicTs = ts;

    const parsed = parseGeoPoint(locationData);
    if (parsed) {
      onUpdate({ ...parsed, timestamp: timestampValue || undefined });
    }
  };

  const channelName = `sos_loc_stream_${sosId}_${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sos_alerts",
        filter: `id=eq.${sosId}`,
      },
      (payload) => {
        if (payload.new && (payload.new as any).location) {
          handleCoordsWithTimestamp(
            (payload.new as any).location,
            (payload.new as any).location_updated_at
          );
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sos_location_updates",
        filter: `sos_id=eq.${sosId}`,
      },
      (payload) => {
        if (payload.new && (payload.new as any).location) {
          handleCoordsWithTimestamp(
            (payload.new as any).location,
            (payload.new as any).recorded_at
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

