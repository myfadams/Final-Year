import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Location from "expo-location";
import { getCurrentUser } from "@/backend/auth";
import { subscribeToEmergencies } from "@/backend/emergencies";
import { subscribeToSosAlerts } from "@/backend/sos";
import { supabase } from "@/backend/supabaseConfig";
import { registerPushToken } from "@/backend/pushTokens";
import { reportCurrentLocation } from "@/backend/userLocations";
import {
  computeNotificationFeed,
  fireLocalNotificationsForNewItems,
  getUnseenNotificationCount,
  markNotificationsAsSeen,
  NotificationFeedItem,
} from "@/backend/notificationEngine";
import {
  loadNotificationPreferences,
  NotificationCategoryKey,
} from "@/backend/notificationPreferences";

// Categories with a server-side push trigger (see supabase/migrations/20260819_push_triggers.sql
// and 20260819_hotspot_push.sql) are excluded from local-notification firing here — otherwise a
// user with the app foregrounded would get the same alert twice: once from this client-side
// poll, once from the real push arriving. recentDigest/friendUpdates/dailyNews have no server
// trigger (yet), so they still rely on this local firing.
const SERVER_PUSH_CATEGORIES: NotificationCategoryKey[] = [
  "nearbyEmergencies",
  "hotspotAlerts",
  "trustedNetworkSos",
  "nearbySosAlerts",
  "chatMessages",
];

interface NotificationBadgeContextType {
  unreadCount: number;
  // Marks the given items as seen (or, if omitted, everything this provider last computed) and
  // recomputes the badge. The Notifications feed screen calls this with just the group of items
  // related to whichever single notification the user opened — not the whole feed — so opening
  // one notification only clears what's related to it.
  markCurrentFeedAsSeen: (items?: NotificationFeedItem[]) => Promise<void>;
}

const NotificationBadgeContext = createContext<NotificationBadgeContextType>({
  unreadCount: 0,
  markCurrentFeedAsSeen: async () => {},
});

export const useNotificationBadge = () => useContext(NotificationBadgeContext);

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Mounted once at the app root. Computes the notification feed on the same schedule the old
 * useEmergencyNotificationWatcher hook used (mount, emergency/SOS realtime events, 5-minute
 * interval) — but a single computation now serves two purposes: firing local OS notifications
 * for new items, and maintaining the unread count shown as a badge on every bell icon in the
 * app via useNotificationBadge().
 */
export const NotificationBadgeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const userIdRef = useRef<string | null>(null);
  const latestItemsRef = useRef<NotificationFeedItem[]>([]);

  const refreshAndReportLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      const pos = await Location.getLastKnownPositionAsync();
      if (pos) {
        locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }

      if (locationRef.current && userIdRef.current) {
        // Fire-and-forget — keeps user_locations.updated_at fresh so the server's 30-minute
        // staleness cutoff (see get_user_ids_near_point) doesn't drop this user from matching.
        reportCurrentLocation(userIdRef.current, locationRef.current.latitude, locationRef.current.longitude);
      }
    } catch (_) {
      // Location unavailable — location-gated categories will just no-op until it is.
    }
  }, []);

  const runCheck = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      await refreshAndReportLocation();

      const prefs = await loadNotificationPreferences();
      const items = await computeNotificationFeed(userIdRef.current, locationRef.current);
      latestItemsRef.current = items;

      const localOnlyItems = items.filter(
        (item) => !SERVER_PUSH_CATEGORIES.includes(item.category)
      );
      await fireLocalNotificationsForNewItems(localOnlyItems, prefs);

      const count = await getUnseenNotificationCount(items, prefs);
      setUnreadCount(count);
    } catch (err) {
      console.warn("NotificationBadgeProvider check warning:", err);
    }
  }, [refreshAndReportLocation]);

  const markCurrentFeedAsSeen = useCallback(async (items?: NotificationFeedItem[]) => {
    await markNotificationsAsSeen(items ?? latestItemsRef.current);
    // Recompute rather than zero out — the caller may have only marked a subset (e.g. one
    // chat's messages) as seen, so other still-unseen items should keep counting.
    const prefs = await loadNotificationPreferences();
    const count = await getUnseenNotificationCount(latestItemsRef.current, prefs);
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let emergenciesChannel: ReturnType<typeof supabase.channel> | null = null;
    let unsubscribeSos: (() => void) | null = null;

    (async () => {
      const { user } = await getCurrentUser();
      if (cancelled || !user) return;
      userIdRef.current = user.id;

      // Fire-and-forget — re-registers on every app start in case the token rotated. No-ops
      // silently if permission isn't granted yet (it'll register once the user enables
      // notifications from the Notification Preferences screen instead).
      registerPushToken(user.id);

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
        // Location unavailable — location-gated categories will just no-op until it is.
      }

      if (cancelled) return;

      await runCheck();

      emergenciesChannel = subscribeToEmergencies(user.id, () => {
        runCheck();
      });

      unsubscribeSos = subscribeToSosAlerts(() => {
        runCheck();
      });

      intervalId = setInterval(runCheck, REFRESH_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (emergenciesChannel) {
        try {
          supabase.removeChannel(emergenciesChannel);
        } catch (_) {}
      }
      if (unsubscribeSos) unsubscribeSos();
    };
  }, [runCheck]);

  return (
    <NotificationBadgeContext.Provider value={{ unreadCount, markCurrentFeedAsSeen }}>
      {children}
    </NotificationBadgeContext.Provider>
  );
};
