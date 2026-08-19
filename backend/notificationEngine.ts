import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { fetchEmergencies, EmergencyRecord } from "./emergencies";
import { fetchNearbyAndTrustedSos, parseGeoPoint, SosAlert } from "./sos";
import { fetchKnustUpdates } from "./externalNews";
import { supabase } from "./supabaseConfig";
import {
  NotificationCategoryKey,
  NotificationPreferences,
} from "./notificationPreferences";

// Without this, local notifications fire silently while the app is foregrounded instead of
// showing a banner. Runs once, as a side effect of importing this module.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationFeedItem {
  id: string;
  category: NotificationCategoryKey;
  title: string;
  body: string;
  createdAtMs: number;
  distanceMeters: number | null;
  latitude: number | null;
  longitude: number | null;
  emergencyId?: string;
  // Explicit navigation target for categories that aren't map-coordinate-based (chat, friend
  // requests, news). When present, the Notifications feed screen prefers this over the
  // lat/lng-to-map fallback used by the location-based categories.
  navigateTo?: { pathname: string; params?: Record<string, string> };
}

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Permissions ────────────────────────────────────────────────────────────

export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("emergency-alerts", {
        name: "Emergency Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#AF101A",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (err) {
    console.warn("ensureNotificationPermissions warning:", err);
    return false;
  }
}

export async function getNotificationPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  try {
    const result = await Notifications.getPermissionsAsync();
    if (result.granted) return "granted";
    if (result.canAskAgain) return "undetermined";
    return "denied";
  } catch {
    return "undetermined";
  }
}

// ─── Hotspot clustering ─────────────────────────────────────────────────────
// Simple greedy clustering: any point with >= minPoints neighbors (including itself)
// within radiusMeters becomes a hotspot, centered on the group's average coordinate.

interface HotspotCluster {
  latitude: number;
  longitude: number;
  count: number;
  emergencyIds: string[];
  mostRecentMs: number;
}

function detectHotspots(
  points: { id: string; latitude: number; longitude: number; createdAtMs: number }[],
  radiusMeters = 400,
  minPoints = 3
): HotspotCluster[] {
  const assigned = new Set<string>();
  const clusters: HotspotCluster[] = [];

  for (const point of points) {
    if (assigned.has(point.id)) continue;

    const neighbors = points.filter(
      (p) =>
        !assigned.has(p.id) &&
        getDistanceMeters(point.latitude, point.longitude, p.latitude, p.longitude) <=
          radiusMeters
    );

    if (neighbors.length < minPoints) continue;

    neighbors.forEach((n) => assigned.add(n.id));

    const avgLat = neighbors.reduce((sum, n) => sum + n.latitude, 0) / neighbors.length;
    const avgLng = neighbors.reduce((sum, n) => sum + n.longitude, 0) / neighbors.length;

    clusters.push({
      latitude: avgLat,
      longitude: avgLng,
      count: neighbors.length,
      emergencyIds: neighbors.map((n) => n.id),
      mostRecentMs: Math.max(...neighbors.map((n) => n.createdAtMs)),
    });
  }

  return clusters;
}

// ─── Feed computation ───────────────────────────────────────────────────────

const NEARBY_RADIUS_METERS = 1500;
const DIGEST_RADIUS_METERS = 5000;
const DIGEST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const HOTSPOT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const HOTSPOT_RADIUS_METERS = 5000; // how close the hotspot itself must be to the user
const RECENT_LOOKBACK_MS = 24 * 60 * 60 * 1000; // shared "last day" window for chat/friend checks

// Location-independent categories — chat messages, friend requests/acceptances, and daily news
// don't need a GPS fix, so these run regardless of whether userLocation is available.

async function computeChatMessageItems(
  userId: string,
  nowMs: number
): Promise<NotificationFeedItem[]> {
  try {
    const { data: chatRows } = await supabase
      .from("private_chat")
      .select("id")
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    const chatIds = (chatRows || []).map((c: any) => c.id);
    if (chatIds.length === 0) return [];

    const cutoffIso = new Date(nowMs - RECENT_LOOKBACK_MS).toISOString();
    const { data: messages } = await supabase
      .from("private_chat_messages")
      .select("id, chat_id, sender_id, sender_name, type, text_content, created_at")
      .in("chat_id", chatIds)
      .neq("sender_id", userId)
      .gt("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(30);

    return (messages || []).map((m: any) => {
      const preview =
        m.type === "audio"
          ? "🎤 Voice note"
          : m.type === "media"
            ? "📷 Photo/video"
            : m.type === "location_share"
              ? "📍 Shared location"
              : m.type === "walk_safe"
                ? "🚶 Walk Safe session"
                : m.type === "im_okay"
                  ? "✅ I'm Okay"
                  : m.text_content || "New message";

      return {
        id: `chat:${m.id}`,
        category: "chatMessages" as NotificationCategoryKey,
        title: m.sender_name || "New message",
        body: preview,
        createdAtMs: new Date(m.created_at).getTime(),
        distanceMeters: null,
        latitude: null,
        longitude: null,
        navigateTo: {
          pathname: "/contactChat",
          params: { contactId: m.sender_id, chatId: m.chat_id, name: m.sender_name || "" },
        },
      };
    });
  } catch (err) {
    console.warn("computeChatMessageItems warning:", err);
    return [];
  }
}

async function computeFriendUpdateItems(
  userId: string,
  nowMs: number
): Promise<NotificationFeedItem[]> {
  try {
    const cutoffIso = new Date(nowMs - RECENT_LOOKBACK_MS).toISOString();

    const [{ data: incoming }, { data: accepted }] = await Promise.all([
      supabase
        .from("friends")
        .select("user_id, friend_id, status, created_at")
        .eq("friend_id", userId)
        .eq("status", "pending")
        .gt("created_at", cutoffIso),
      supabase
        .from("friends")
        .select("user_id, friend_id, status, updated_at")
        .eq("user_id", userId)
        .eq("status", "accepted")
        .gt("updated_at", cutoffIso),
    ]);

    const otherUserIds = [
      ...new Set([
        ...(incoming || []).map((r: any) => r.user_id),
        ...(accepted || []).map((r: any) => r.friend_id),
      ]),
    ];
    if (otherUserIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from("users")
      .select("id, name")
      .in("id", otherUserIds);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name || "Someone"]));

    const items: NotificationFeedItem[] = [];

    for (const r of incoming || []) {
      items.push({
        id: `friend_req:${r.user_id}_${r.friend_id}`,
        category: "friendUpdates",
        title: `${nameMap.get(r.user_id) || "Someone"} wants to connect`,
        body: "New friend request",
        createdAtMs: new Date(r.created_at).getTime(),
        distanceMeters: null,
        latitude: null,
        longitude: null,
        navigateTo: { pathname: "/connect" },
      });
    }

    for (const r of accepted || []) {
      items.push({
        id: `friend_acc:${r.user_id}_${r.friend_id}`,
        category: "friendUpdates",
        title: `${nameMap.get(r.friend_id) || "Someone"} accepted your friend request`,
        body: "You're now connected",
        createdAtMs: new Date(r.updated_at).getTime(),
        distanceMeters: null,
        latitude: null,
        longitude: null,
        navigateTo: { pathname: "/connect" },
      });
    }

    return items;
  } catch (err) {
    console.warn("computeFriendUpdateItems warning:", err);
    return [];
  }
}

async function computeDailyNewsItems(): Promise<NotificationFeedItem[]> {
  try {
    const articles = await fetchKnustUpdates();
    if (!articles || articles.length === 0) return [];

    // Only surface the single most recent story so this stays a once-a-day nudge rather than
    // a flood — the underlying dedup-by-id in fireLocalNotificationsForNewItems means it only
    // actually notifies once per distinct top story anyway.
    const top = articles[0];
    const createdAtMs = top.publishedAtIso ? new Date(top.publishedAtIso).getTime() : Date.now();

    return [
      {
        id: `news:${top.id}`,
        category: "dailyNews",
        title: "Today's top story",
        body: top.title,
        createdAtMs,
        distanceMeters: null,
        latitude: null,
        longitude: null,
        navigateTo: { pathname: "/(resident)/news" },
      },
    ];
  } catch (err) {
    console.warn("computeDailyNewsItems warning:", err);
    return [];
  }
}

export async function computeNotificationFeed(
  userId: string,
  userLocation: { latitude: number; longitude: number } | null
): Promise<NotificationFeedItem[]> {
  const items: NotificationFeedItem[] = [];

  const nowMs = Date.now();

  const [chatItems, friendItems, newsItems, { data: emergencies }] = await Promise.all([
    computeChatMessageItems(userId, nowMs),
    computeFriendUpdateItems(userId, nowMs),
    computeDailyNewsItems(),
    fetchEmergencies(userId),
  ]);
  items.push(...chatItems, ...friendItems, ...newsItems);

  const validEmergencies = (emergencies || []).filter(
    (e): e is EmergencyRecord & { latitude: number; longitude: number; created_at: string } =>
      typeof e.latitude === "number" &&
      typeof e.longitude === "number" &&
      !!e.created_at
  );

  if (userLocation) {
    // Nearby Emergencies — unresolved, close, recent
    for (const e of validEmergencies) {
      if (e.is_resolved) continue;
      const createdAtMs = new Date(e.created_at).getTime();
      const ageMs = nowMs - createdAtMs;
      if (ageMs > DIGEST_MAX_AGE_MS) continue;

      const distance = getDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        e.latitude,
        e.longitude
      );
      if (distance > NEARBY_RADIUS_METERS) continue;

      items.push({
        id: `nearby:${e.id}`,
        category: "nearbyEmergencies",
        title: e.title || "Nearby emergency",
        body: `${Math.round(distance)}m away — ${e.nearest_landmark || e.location_text || "near you"}`,
        createdAtMs,
        distanceMeters: distance,
        latitude: e.latitude,
        longitude: e.longitude,
        emergencyId: e.id,
      });
    }

    // Recent Emergencies Nearby — wider radius, includes resolved, up to 24h old
    for (const e of validEmergencies) {
      const createdAtMs = new Date(e.created_at).getTime();
      const ageMs = nowMs - createdAtMs;
      if (ageMs > DIGEST_MAX_AGE_MS) continue;

      const distance = getDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        e.latitude,
        e.longitude
      );
      if (distance > DIGEST_RADIUS_METERS || distance <= NEARBY_RADIUS_METERS) continue;

      items.push({
        id: `digest:${e.id}`,
        category: "recentDigest",
        title: e.title || "Emergency reported nearby",
        body: `${(distance / 1000).toFixed(1)}km away, ${Math.round(ageMs / (60 * 60 * 1000))}h ago`,
        createdAtMs,
        distanceMeters: distance,
        latitude: e.latitude,
        longitude: e.longitude,
        emergencyId: e.id,
      });
    }

    // Hotspot Alerts — clusters of recent incidents near the user
    const recentPoints = validEmergencies
      .filter((e) => nowMs - new Date(e.created_at).getTime() <= HOTSPOT_LOOKBACK_MS)
      .map((e) => ({
        id: e.id,
        latitude: e.latitude,
        longitude: e.longitude,
        createdAtMs: new Date(e.created_at).getTime(),
      }));

    const clusters = detectHotspots(recentPoints);
    clusters.forEach((cluster, index) => {
      const distance = getDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        cluster.latitude,
        cluster.longitude
      );
      if (distance > HOTSPOT_RADIUS_METERS) return;

      items.push({
        id: `hotspot:${cluster.emergencyIds.sort().join(",")}`,
        category: "hotspotAlerts",
        title: `${cluster.count} incidents clustered nearby`,
        body: `${(distance / 1000).toFixed(1)}km away, over the past week`,
        createdAtMs: cluster.mostRecentMs,
        distanceMeters: distance,
        latitude: cluster.latitude,
        longitude: cluster.longitude,
      });
    });

    // Trusted Contact SOS + Nearby SOS (proximity, not necessarily trusted)
    const { data: sosAlerts } = await fetchNearbyAndTrustedSos(
      userLocation.latitude,
      userLocation.longitude
    );
    for (const sos of sosAlerts as SosAlert[]) {
      if (sos.status !== "active") continue;
      const isTrusted = sos.source === "trusted_contact";

      const coords = parseGeoPoint(sos.location);
      const distance = coords
        ? getDistanceMeters(
            userLocation.latitude,
            userLocation.longitude,
            coords.latitude,
            coords.longitude
          )
        : null;

      items.push({
        id: `sos:${sos.id}`,
        category: isTrusted ? "trustedNetworkSos" : "nearbySosAlerts",
        title: `SOS from ${sos.sender_profile?.name || (isTrusted ? "a trusted contact" : "someone nearby")}`,
        body: distance != null ? `${(distance / 1000).toFixed(1)}km away` : "Location unavailable",
        createdAtMs: new Date(sos.created_at).getTime(),
        distanceMeters: distance,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
    }
  }

  return items.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

// ─── Local notification firing ─────────────────────────────────────────────
// Fires a local OS notification (banner) the first time an item is seen, gated by the
// category's preference toggle. Only meaningful while the app is installed via a dev/production
// build with notification permission granted — Expo Go doesn't support this since SDK 53.

const NOTIFIED_IDS_KEY = "@resq_notified_ids";
const MAX_TRACKED_IDS = 500;

async function getNotifiedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFIED_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

async function saveNotifiedIds(ids: Set<string>): Promise<void> {
  try {
    const trimmed = Array.from(ids).slice(-MAX_TRACKED_IDS);
    await AsyncStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(trimmed));
  } catch {
    // Non-fatal
  }
}

export async function fireLocalNotificationsForNewItems(
  items: NotificationFeedItem[],
  prefs: NotificationPreferences
): Promise<void> {
  const enabledItems = items.filter((item) => prefs[item.category]);
  if (enabledItems.length === 0) return;

  const notifiedIds = await getNotifiedIds();
  const newItems = enabledItems.filter((item) => !notifiedIds.has(item.id));
  if (newItems.length === 0) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  for (const item of newItems) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
          data: { category: item.category, id: item.id, emergencyId: item.emergencyId },
        },
        trigger: Platform.OS === "android" ? { channelId: "emergency-alerts" } as any : null,
      });
    } catch (err) {
      console.warn("fireLocalNotificationsForNewItems warning:", err);
    }
    notifiedIds.add(item.id);
  }

  await saveNotifiedIds(notifiedIds);
}

// ─── Unread badge tracking ──────────────────────────────────────────────────
// Separate from notifiedIds above: that set is "have we ever fired an OS notification for
// this item" (permanent, prevents duplicate pushes). This one is "has the user seen this item
// in the Notifications feed yet" (clears the bell badge once they open the feed screen).

const SEEN_IDS_KEY = "@resq_seen_notification_ids";
const MAX_TRACKED_SEEN_IDS = 500;

async function getSeenIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

async function saveSeenIds(ids: Set<string>): Promise<void> {
  try {
    const trimmed = Array.from(ids).slice(-MAX_TRACKED_SEEN_IDS);
    await AsyncStorage.setItem(SEEN_IDS_KEY, JSON.stringify(trimmed));
  } catch {
    // Non-fatal
  }
}

/**
 * Counts feed items the user hasn't seen yet, restricted to categories they still have
 * enabled (a muted category shouldn't inflate the bell badge).
 */
export async function getUnseenNotificationCount(
  items: NotificationFeedItem[],
  prefs: NotificationPreferences
): Promise<number> {
  const enabledItems = items.filter((item) => prefs[item.category]);
  if (enabledItems.length === 0) return 0;
  const seen = await getSeenIds();
  return enabledItems.filter((item) => !seen.has(item.id)).length;
}

/**
 * Marks every item currently shown in the Notifications feed as seen, so they stop counting
 * toward the bell badge. Called once the feed screen has loaded — "viewing discards them."
 */
export async function markNotificationsAsSeen(items: NotificationFeedItem[]): Promise<void> {
  const seen = await getSeenIds();
  items.forEach((item) => seen.add(item.id));
  await saveSeenIds(seen);
}

/**
 * Filters out items already marked seen from a previous visit to the Notifications screen, so
 * the feed itself clears out after viewing rather than just the bell badge — reopening it only
 * shows what's genuinely new since last time, not the same items over and over.
 */
export async function filterUnseenNotifications(
  items: NotificationFeedItem[]
): Promise<NotificationFeedItem[]> {
  const seen = await getSeenIds();
  return items.filter((item) => !seen.has(item.id));
}
