import { safeLogError } from "./safeRequest";
import { supabase } from "./supabaseConfig";

export interface HotspotRecord {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number | null;
  risk_level: string | null;
  incident_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const RISK_RANK: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

function riskRank(riskLevel: string | null): number {
  return RISK_RANK[(riskLevel || "").toLowerCase()] ?? -1;
}

/**
 * Fetches all recorded danger-zone hotspots for the "Hotspots" news section, most severe and
 * most incident-heavy first (risk_level is free-text, not a DB enum, so severity ordering is
 * done client-side rather than relying on alphabetical sort).
 */
export async function fetchHotspots(): Promise<{ data: HotspotRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("hotspots")
      .select(
        "id, name, description, latitude, longitude, radius_meters, risk_level, incident_count, created_at, updated_at"
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      safeLogError("fetchHotspots error:", error);
      return { data: [], error: error.message };
    }

    const sorted = ((data ?? []) as HotspotRecord[]).sort((a, b) => {
      const rankDiff = riskRank(b.risk_level) - riskRank(a.risk_level);
      if (rankDiff !== 0) return rankDiff;
      return (b.incident_count ?? 0) - (a.incident_count ?? 0);
    });

    return { data: sorted, error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to load hotspots";
    safeLogError("fetchHotspots exception:", err);
    return { data: [], error: msg };
  }
}
