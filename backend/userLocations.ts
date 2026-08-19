import { supabase } from "./supabaseConfig";
import { safeLogError } from "./safeRequest";

/**
 * Upserts the current user's latest location — overwrites the single existing row, no history
 * kept. This is what lets the server resolve "who's near this new SOS/emergency/hotspot" for
 * push notifications (see supabase/migrations/20260819_user_locations.sql); nothing about this
 * table is readable by other users directly, only by the service-role Edge Function.
 */
export async function reportCurrentLocation(
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  try {
    const pointWkt = `POINT(${lng} ${lat})`;
    const { error } = await supabase.from("user_locations").upsert(
      {
        user_id: userId,
        location: pointWkt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      safeLogError("reportCurrentLocation error:", error);
    }
  } catch (err) {
    console.warn("reportCurrentLocation warning:", err);
  }
}
