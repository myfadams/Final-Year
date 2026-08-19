import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { fetchEmergencies, EmergencyRecord } from "./emergencies";
import { fetchNearbyAndTrustedSos, parseGeoPoint, SosAlert } from "./sos";
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

export async function computeNotificationFeed(
  userId: string,
  userLocation: { latitude: number; longitude: number } | null
): Promise<NotificationFeedItem[]> {
  const items: NotificationFeedItem[] = [];

  const { data: emergencies } = await fetchEmergencies(userId);
  const nowMs = Date.now();

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

    // Trusted Contact SOS
    const { data: sosAlerts } = await fetchNearbyAndTrustedSos(
      userLocation.latitude,
      userLocation.longitude
    );
    for (const sos of sosAlerts as SosAlert[]) {
      if (sos.source !== "trusted_contact") continue;
      if (sos.status !== "active") continue;

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
        category: "trustedNetworkSos",
        title: `SOS from ${sos.sender_profile?.name || "a trusted contact"}`,
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
const MAX_TRACKED_IDS = 300;

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
