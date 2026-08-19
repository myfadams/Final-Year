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
import {
  computeNotificationFeed,
  fireLocalNotificationsForNewItems,
  getUnseenNotificationCount,
  markNotificationsAsSeen,
  NotificationFeedItem,
} from "@/backend/notificationEngine";
import { loadNotificationPreferences } from "@/backend/notificationPreferences";

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

  const runCheck = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      const prefs = await loadNotificationPreferences();
      const items = await computeNotificationFeed(userIdRef.current, locationRef.current);
      latestItemsRef.current = items;

      await fireLocalNotificationsForNewItems(items, prefs);

      const count = await getUnseenNotificationCount(items, prefs);
      setUnreadCount(count);
    } catch (err) {
      console.warn("NotificationBadgeProvider check warning:", err);
    }
  }, []);

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
