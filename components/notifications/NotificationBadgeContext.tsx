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
import { supabase, createSafeRealtimeChannel } from "@/backend/supabaseConfig";
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
  // The full, live-updating notification feed — recomputed on every realtime trigger (new
  // emergency, SOS change, chat message, friend request/acceptance) as well as on a 5-minute
  // fallback interval. The Notifications feed screen renders straight from this instead of
  // doing its own separate fetch, so it updates in real time while open.
  feed: NotificationFeedItem[];
  // True while a check triggered by refreshNow() is in flight — lets the feed screen show a
  // pull-to-refresh spinner for a manually requested refresh specifically.
  isRefreshing: boolean;
  // Forces an immediate (non-debounced) recheck, for pull-to-refresh.
  refreshNow: () => Promise<void>;
  // Marks the given items as seen (or, if omitted, everything this provider last computed) and
  // recomputes the badge. The Notifications feed screen calls this with just the group of items
  // related to whichever single notification the user opened — not the whole feed — so opening
  // one notification only clears what's related to it.
  markCurrentFeedAsSeen: (items?: NotificationFeedItem[]) => Promise<void>;
}

const NotificationBadgeContext = createContext<NotificationBadgeContextType>({
  unreadCount: 0,
  feed: [],
  isRefreshing: false,
  refreshNow: async () => {},
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
  const [feed, setFeed] = useState<NotificationFeedItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const userIdRef = useRef<string | null>(null);
  const latestItemsRef = useRef<NotificationFeedItem[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setFeed(items);

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

  // Realtime events (a new emergency, an SOS status change, a chat message, a friend request)
  // can arrive in quick bursts — e.g. several chat messages in a row. Debouncing collapses a
  // burst into a single recompute instead of re-running the full feed query on every event.
  const scheduleCheck = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      runCheck();
    }, 1200);
  }, [runCheck]);

  const refreshNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsRefreshing(true);
    try {
      await runCheck();
    } finally {
      setIsRefreshing(false);
    }
  }, [runCheck]);

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
    let chatChannel: ReturnType<typeof supabase.channel> | null = null;
    let friendsChannel: ReturnType<typeof supabase.channel> | null = null;

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

      // Real-time triggers for every category the feed covers. Each just schedules a
      // (debounced) recompute rather than re-deriving anything itself — computeNotificationFeed
      // and its per-category detection functions already own the actual filtering logic, so
      // these only need to know "something relevant might have changed."
      emergenciesChannel = subscribeToEmergencies(user.id, () => {
        scheduleCheck();
      });

      unsubscribeSos = subscribeToSosAlerts(() => {
        scheduleCheck();
      });

      // No per-user filter is possible server-side here (a chat message row doesn't carry
      // "which of my chats" info the realtime filter syntax can express), so this listens
      // table-wide and lets computeChatMessageItems's own query do the real scoping — the same
      // pattern already used for subscribeToEmergencies above.
      chatChannel = createSafeRealtimeChannel("notification-chat-watch", (ch) =>
        ch.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "private_chat_messages" },
          () => scheduleCheck()
        )
      );

      friendsChannel = createSafeRealtimeChannel("notification-friends-watch", (ch) =>
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "friends" },
          () => scheduleCheck()
        )
      );

      intervalId = setInterval(runCheck, REFRESH_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (emergenciesChannel) {
        try {
          supabase.removeChannel(emergenciesChannel);
        } catch (_) {}
      }
      if (unsubscribeSos) unsubscribeSos();
      if (chatChannel) {
        try {
          supabase.removeChannel(chatChannel);
        } catch (_) {}
      }
      if (friendsChannel) {
        try {
          supabase.removeChannel(friendsChannel);
        } catch (_) {}
      }
    };
  }, [runCheck, scheduleCheck]);

  return (
    <NotificationBadgeContext.Provider
      value={{ unreadCount, feed, isRefreshing, refreshNow, markCurrentFeedAsSeen }}
    >
      {children}
    </NotificationBadgeContext.Provider>
  );
};
