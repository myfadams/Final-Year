import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabaseConfig";
import { safeLogError } from "./safeRequest";

/**
 * Registers this device's Expo push token against the current user, so the server-side push
 * triggers (see supabase/migrations/20260819_push_triggers.sql) can reach it. No-ops silently
 * if permission isn't granted yet or a push token can't be obtained (e.g. simulator) — this is
 * expected to be called opportunistically, not to be the sole gate on notification permission.
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!expoPushToken) return;

    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,expo_push_token" }
    );

    if (error) {
      safeLogError("registerPushToken error:", error);
    }
  } catch (err) {
    console.warn("registerPushToken warning:", err);
  }
}
