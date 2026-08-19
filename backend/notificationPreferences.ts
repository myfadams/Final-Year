import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationCategoryKey =
  | "nearbyEmergencies"
  | "recentDigest"
  | "hotspotAlerts"
  | "trustedNetworkSos";

export interface NotificationCategoryMeta {
  key: NotificationCategoryKey;
  title: string;
  description: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  {
    key: "nearbyEmergencies",
    title: "Nearby Emergencies",
    description: "New emergencies reported within 1.5km of you.",
  },
  {
    key: "recentDigest",
    title: "Recent Emergencies Nearby",
    description: "Emergencies from the last 24 hours within 5km, in case you missed them.",
  },
  {
    key: "hotspotAlerts",
    title: "Hotspot Alerts",
    description: "Areas with several incidents clustered together nearby in the past week.",
  },
  {
    key: "trustedNetworkSos",
    title: "Trusted Contact SOS",
    description: "SOS alerts from people in your trusted network.",
  },
];

export type NotificationPreferences = Record<NotificationCategoryKey, boolean>;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  nearbyEmergencies: true,
  recentDigest: true,
  hotspotAlerts: true,
  trustedNetworkSos: true,
};

const STORAGE_KEY = "@resq_notification_prefs";

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Non-fatal — preferences just won't persist across app restarts this time.
  }
}
