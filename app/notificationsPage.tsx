import { getCurrentUser } from "@/backend/auth";
import {
  computeNotificationFeed,
  filterUnseenNotifications,
  fireLocalNotificationsForNewItems,
  getNotificationPermissionStatus,
  NotificationFeedItem,
} from "@/backend/notificationEngine";
import {
  loadNotificationPreferences,
  NotificationPreferences,
} from "@/backend/notificationPreferences";
import HeartBeatWave from "@/components/HeartBeatWave";
import NavHeader from "@/components/NavHeader";
import { useNotificationBadge } from "@/components/notifications/NotificationBadgeContext";
import { CATEGORY_ICONS } from "@/components/notifications/notificationCategoryIcons";
import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import * as Location from "expo-location";
import { router } from "expo-router";
import {
  AlertTriangle,
  BellOff,
  RefreshCw,
  Settings,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function timeAgo(ms: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// Groups notifications by "would opening this take me to the same place." Opening one item
// clears every item in its group, not the whole list — e.g. opening one chat message clears
// every notification for that same chat, since you've now seen all of it; opening a nearby
// emergency only clears that emergency's own notifications, not unrelated ones.
function getNotificationGroupKey(item: NotificationFeedItem): string {
  if (item.navigateTo?.pathname === "/contactChat" && item.navigateTo.params?.chatId) {
    return `chat:${item.navigateTo.params.chatId}`;
  }
  if (item.navigateTo) {
    return `route:${item.navigateTo.pathname}`;
  }
  if (item.emergencyId) {
    return `emergency:${item.emergencyId}`;
  }
  // SOS/hotspot items have no shared entity id to group by — fall back to the item's own id so
  // each is its own group. Safer to under-clear than to accidentally clear an unrelated SOS
  // alert's notification just because a different one was opened.
  return item.id;
}

export default function NotificationsPage() {
  const { markCurrentFeedAsSeen } = useNotificationBadge();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [feed, setFeed] = useState<NotificationFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const [permissionStatus, loadedPrefs, { user }] = await Promise.all([
        getNotificationPermissionStatus(),
        loadNotificationPreferences(),
        getCurrentUser(),
      ]);
      setPrefs(loadedPrefs);

      if (!user) {
        setFeed([]);
        return;
      }

      let userLocation: { latitude: number; longitude: number } | null = null;
      try {
        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          userLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } catch (_) {
        // Feed will just come back empty without location.
      }

      const items = await computeNotificationFeed(user.id, userLocation);

      // Only show what's new since the last time this screen was viewed — once seen, an item
      // clears from the list itself, not just the bell badge.
      const unseenItems = await filterUnseenNotifications(items);
      setFeed(unseenItems);

      if (permissionStatus === "granted") {
        await fireLocalNotificationsForNewItems(items, loadedPrefs);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Couldn't load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <NavHeader title="Notifications" />
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.refreshIconBtn}
          onPress={() => load(true)}
          activeOpacity={0.7}
        >
          <RefreshCw size={13} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push("/notificationPreferencesPage")}
          activeOpacity={0.75}
        >
          <Settings size={13} color={ResQColors.primaryRed} strokeWidth={2.2} />
          <Text style={styles.manageButtonText}>Manage preferences</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      >
        {loading && (
          <View style={styles.centeredState}>
            {/* <ActivityIndicator color={ResQColors.primaryRed} /> */}
            <HeartBeatWave
              width={220}
              color={ResQColors.primaryRed}
              thickness={7}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.stateSubtitle}>Checking for updates near you…</Text>
          </View>
        )}

        {!loading && errorMsg && (
          <View style={styles.centeredState}>
            <AlertTriangle size={28} color="#FF6B6B" />
            <Text style={styles.stateTitle}>Couldn't load notifications</Text>
            <Text style={styles.stateSubtitle}>{errorMsg}</Text>
          </View>
        )}

        {!loading && !errorMsg && feed.length === 0 && (
          <View style={styles.centeredState}>
            <View style={styles.emptyIconWrapper}>
              <BellOff size={30} color={ResQColors.textSubtle} />
            </View>
            <Text style={styles.stateTitle}>You're all caught up</Text>
            <Text style={styles.stateSubtitle}>
              No new notifications right now — opening one clears it from this list.
            </Text>
          </View>
        )}

        {!loading &&
          !errorMsg &&
          feed.map((item) => {
            const Icon = CATEGORY_ICONS[item.category];
            const muted = prefs ? !prefs[item.category] : false;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.feedCard, muted && styles.feedCardMuted]}
                activeOpacity={0.8}
                onPress={() => {
                  // Opening this notification clears only its own group (see
                  // getNotificationGroupKey) from the list and badge, not everything.
                  const groupKey = getNotificationGroupKey(item);
                  const related = feed.filter((f) => getNotificationGroupKey(f) === groupKey);
                  setFeed((prev) => prev.filter((f) => getNotificationGroupKey(f) !== groupKey));
                  markCurrentFeedAsSeen(related);

                  if (item.navigateTo) {
                    router.replace(item.navigateTo as any);
                    if (item.navigateTo.pathname.toLowerCase().includes("/(resident)")) {
                      router.dismissAll();
                    }
                    return;
                  }
                  if (item.latitude == null || item.longitude == null) return;
                  router.replace({
                    pathname: "/(resident)/map",
                    params: {
                      lat: item.latitude.toString(),
                      lng: item.longitude.toString(),
                      ...(item.emergencyId
                        ? { personId: item.emergencyId, action: "preview" }
                        : {}),
                    },
                  });
                  router.dismissAll();
                }}
              >
                <View style={styles.feedIconCircle}>
                  <Icon size={16} color={ResQColors.primaryRed} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.feedBody} numberOfLines={1}>
                    {item.body}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={styles.feedTime}>{timeAgo(item.createdAtMs)}</Text>
                  {muted && <Text style={styles.mutedTag}>Muted</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  refreshIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ResQColors.primaryRedLight,
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  manageButtonText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: ResQColors.primaryRed,
  },
  scrollContent: {
    paddingBottom: 60,
    paddingTop: 10,
  },
  centeredState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 10,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ResQColors.cardSurface,
    borderWidth: 1,
    borderColor: ResQColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    fontSize: 15,
    fontFamily: typography.semibold,
    color: ResQColors.textPrimary,
    textAlign: "center",
  },
  stateSubtitle: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    textAlign: "center",
    lineHeight: 18,
  },
  feedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  feedCardMuted: {
    opacity: 0.55,
  },
  feedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ResQColors.primaryRedLight,
    alignItems: "center",
    justifyContent: "center",
  },
  feedTitle: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: ResQColors.textPrimary,
  },
  feedBody: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    marginTop: 1,
  },
  feedTime: {
    fontSize: 10.5,
    fontFamily: typography.medium,
    color: ResQColors.textSubtle,
  },
  mutedTag: {
    fontSize: 9.5,
    fontFamily: typography.semibold,
    color: ResQColors.textSubtle,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
});
