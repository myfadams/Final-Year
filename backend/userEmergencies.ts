import { getCurrentUser } from "./auth";
import { EmergencyRecord } from "./emergencies";
import { supabase } from "./supabaseConfig";

export interface CreatedEmergencyRecord extends EmergencyRecord {
  activeRespondersCount?: number;
}

export interface UserResponderHistoryItem {
  historyId: string;
  emergencyId: string;
  transportMode: string;
  status: "responding" | "arrived" | "cancelled" | "done_helping";
  respondedAt: string | null;
  actualArrivalAt: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
  emergency: {
    id: string;
    title: string;
    description: string | null;
    locationText: string;
    nearestLandmark: string | null;
    severity: "Critical" | "Moderate" | "Low" | string;
    isResolved: boolean;
    falseAlarm: boolean;
    creatorId: string | null;
    creatorName?: string;
    respondersCount: number;
    createdAt: string | null;
    resolvedAt: string | null;
  } | null;
}

/**
 * Fetches all emergencies reported/created by the specified user.
 * Orders by created_at descending.
 */
export async function fetchEmergenciesCreatedByUser(
  userId?: string
): Promise<{ data: CreatedEmergencyRecord[]; error: Error | null }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { user } = await getCurrentUser();
      if (!user) {
        return { data: [], error: new Error("User not authenticated.") };
      }
      targetUserId = user.id;
    }

    const { data: emergenciesData, error } = await supabase
      .from("emergencies")
      .select("*")
      .eq("creator_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchEmergenciesCreatedByUser error:", error.message);
      return { data: [], error: new Error(error.message) };
    }

    if (!emergenciesData || emergenciesData.length === 0) {
      return { data: [], error: null };
    }

    // Fetch active responders counts for each emergency
    const emergencyIds = emergenciesData.map((e) => e.id);
    let activeRespondersCounts: Record<string, number> = {};

    if (emergencyIds.length > 0) {
      const { data: respData } = await supabase
        .from("emergency_responders")
        .select("emergency_id")
        .in("emergency_id", emergencyIds);

      if (respData) {
        respData.forEach((r: any) => {
          activeRespondersCounts[r.emergency_id] =
            (activeRespondersCounts[r.emergency_id] || 0) + 1;
        });
      }
    }

    const result: CreatedEmergencyRecord[] = emergenciesData.map((e: EmergencyRecord) => ({
      ...e,
      activeRespondersCount: activeRespondersCounts[e.id] ?? e.responders_count ?? 0,
    }));

    return { data: result, error: null };
  } catch (err: any) {
    console.error("fetchEmergenciesCreatedByUser exception:", err);
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetches responder history records for the authenticated user from emergency_response_history,
 * joined/mapped with the corresponding emergency records.
 */
export async function fetchUserResponderHistory(
  userId?: string
): Promise<{ data: UserResponderHistoryItem[]; error: Error | null }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { user } = await getCurrentUser();
      if (!user) {
        return { data: [], error: new Error("User not authenticated.") };
      }
      targetUserId = user.id;
    }

    const { data: historyData, error: historyErr } = await supabase
      .from("emergency_response_history")
      .select("*")
      .eq("responder_id", targetUserId)
      .order("created_at", { ascending: false });

    if (historyErr) {
      console.error("fetchUserResponderHistory error:", historyErr.message);
      return { data: [], error: new Error(historyErr.message) };
    }

    if (!historyData || historyData.length === 0) {
      return { data: [], error: null };
    }

    const emergencyIds = Array.from(
      new Set(historyData.map((h: any) => h.emergency_id).filter(Boolean))
    );

    let emergenciesMap: Record<string, EmergencyRecord> = {};
    let creatorsMap: Record<string, string> = {};

    if (emergencyIds.length > 0) {
      const { data: emergenciesList } = await supabase
        .from("emergencies")
        .select("*")
        .in("id", emergencyIds);

      if (emergenciesList) {
        emergenciesList.forEach((e: EmergencyRecord) => {
          emergenciesMap[e.id] = e;
        });

        const creatorIds = Array.from(
          new Set(emergenciesList.map((e: EmergencyRecord) => e.creator_id).filter(Boolean))
        ) as string[];

        if (creatorIds.length > 0) {
          const { data: usersList } = await supabase
            .from("users")
            .select("id, name")
            .in("id", creatorIds);

          if (usersList) {
            usersList.forEach((u: any) => {
              creatorsMap[u.id] = u.name;
            });
          }
        }
      }
    }

    const result: UserResponderHistoryItem[] = historyData.map((h: any) => {
      const emp = emergenciesMap[h.emergency_id] || null;
      return {
        historyId: h.id || `${h.emergency_id}-${h.created_at}`,
        emergencyId: h.emergency_id,
        transportMode: h.transport_mode || "Foot",
        status: h.status || "responding",
        respondedAt: h.responded_at || h.created_at,
        actualArrivalAt: h.actual_arrival_at || null,
        cancelledAt: h.cancelled_at || null,
        createdAt: h.created_at || null,
        emergency: emp
          ? {
              id: emp.id,
              title: emp.title,
              description: emp.description,
              locationText: emp.location_text,
              nearestLandmark: emp.nearest_landmark,
              severity: emp.severity || "Moderate",
              isResolved: emp.is_resolved ?? false,
              falseAlarm: emp.false_alarm ?? false,
              creatorId: emp.creator_id,
              creatorName: emp.creator_id ? creatorsMap[emp.creator_id] || "Resident" : "Resident",
              respondersCount: emp.responders_count ?? 0,
              createdAt: emp.created_at,
              resolvedAt: emp.resolved_at,
            }
          : null,
      };
    });

    return { data: result, error: null };
  } catch (err: any) {
    console.error("fetchUserResponderHistory exception:", err);
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Subscribes to real-time changes for user's created emergencies and response history.
 */
export function subscribeToUserEmergencies(
  userId: string,
  onUpdate: () => void
) {
  try {
    const nonce = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channelName = `user-emergencies-${userId}-${nonce}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergencies",
          filter: `creator_id=eq.${userId}`,
        },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_response_history",
          filter: `responder_id=eq.${userId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn("subscribeToUserEmergencies warning:", err);
    return null;
  }
}

/**
 * Marks an emergency as a false alarm in Supabase `emergencies` table.
 * Sets false_alarm = true, is_resolved = true, and resolved_at = now.
 */
export async function markEmergencyFalseAlarm(
  emergencyId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return { success: false, error: new Error("User not authenticated.") };
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("emergencies")
      .update({
        false_alarm: true,
        is_resolved: true,
        resolved_at: nowIso,
      })
      .eq("id", emergencyId)
      .eq("creator_id", user.id);

    if (error) {
      console.error("markEmergencyFalseAlarm error:", error.message);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("markEmergencyFalseAlarm exception:", err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Marks an emergency as resolved in Supabase `emergencies` table.
 */
export async function markEmergencyResolved(
  emergencyId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return { success: false, error: new Error("User not authenticated.") };
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("emergencies")
      .update({
        is_resolved: true,
        resolved_at: nowIso,
      })
      .eq("id", emergencyId)
      .eq("creator_id", user.id);

    if (error) {
      console.error("markEmergencyResolved error:", error.message);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("markEmergencyResolved exception:", err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

