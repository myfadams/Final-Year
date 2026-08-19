import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { getCurrentUser } from "@/backend/auth";
import { subscribeToEmergencies } from "@/backend/emergencies";
import { supabase } from "@/backend/supabaseConfig";
import {
  computeNotificationFeed,
  fireLocalNotificationsForNewItems,
} from "@/backend/notificationEngine";
import { loadNotificationPreferences } from "@/backend/notificationPreferences";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Mounted once at the resident app's root so nearby-emergency/hotspot/trusted-SOS local
 * notifications fire while the app is in use, not just while the Notifications screen is open.
 * Re-checks on emergency realtime changes and on a 5-minute interval.
 */
export function useEmergencyNotificationWatcher() {
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const runCheck = async () => {
      if (!userIdRef.current || !locationRef.current) return;
      try {
        const prefs = await loadNotificationPreferences();
        const items = await computeNotificationFeed(userIdRef.current, locationRef.current);
        await fireLocalNotificationsForNewItems(items, prefs);
      } catch (err) {
        console.warn("useEmergencyNotificationWatcher check warning:", err);
      }
    };

    (async () => {
      const { user } = await getCurrentUser();
      if (cancelled || !user) return;
      userIdRef.current = user.id;

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getLastKnownPositionAsync();
          if (pos) {
            locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          } else {
            const current = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            locationRef.current = {
              latitude: current.coords.latitude,
              longitude: current.coords.longitude,
            };
          }
        }
      } catch (_) {
        // Location unavailable — checks will just no-op until it is.
      }

      if (cancelled) return;

      await runCheck();

      channel = subscribeToEmergencies(user.id, () => {
        runCheck();
      });

      intervalId = setInterval(runCheck, REFRESH_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      }
    };
  }, []);
}
