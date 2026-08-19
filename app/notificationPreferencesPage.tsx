import {
  ensureNotificationPermissions,
  getNotificationPermissionStatus,
} from "@/backend/notificationEngine";
import {
  loadNotificationPreferences,
  NOTIFICATION_CATEGORIES,
  NotificationCategoryKey,
  NotificationPreferences,
  saveNotificationPreferences,
} from "@/backend/notificationPreferences";
import { CATEGORY_ICONS } from "@/components/notifications/notificationCategoryIcons";
import NavHeader from "@/components/NavHeader";
import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Bell } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationPreferencesPage() {
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [status, loadedPrefs] = await Promise.all([
      getNotificationPermissionStatus(),
      loadNotificationPreferences(),
    ]);
    setPermissionStatus(status);
    setPrefs(loadedPrefs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleEnableNotifications = async () => {
    const granted = await ensureNotificationPermissions();
    setPermissionStatus(granted ? "granted" : "denied");
  };

  const handleToggle = async (key: NotificationCategoryKey, value: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await saveNotificationPreferences(next);
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavHeader title="Notification Preferences" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={ResQColors.primaryRed} />
          </View>
        ) : (
          <>
            {/* Permission banner */}
            {permissionStatus !== "granted" && (
              <View style={styles.permissionBanner}>
                <View style={styles.permissionIconCircle}>
                  <Bell size={18} color="#FFFFFF" strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.permissionTitle}>Enable notifications</Text>
                  <Text style={styles.permissionMessage}>
                    {permissionStatus === "denied"
                      ? "Notifications are turned off in your device settings. Enable them there to get alerted."
                      : "Turn on notifications so the categories below can actually alert you."}
                  </Text>
                </View>
                {permissionStatus === "undetermined" && (
                  <TouchableOpacity
                    style={styles.permissionAction}
                    onPress={handleEnableNotifications}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.permissionActionText}>Enable</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.introText}>
              Choose which alerts you want to receive. You can change these any time.
            </Text>

            <View style={styles.prefsCard}>
              {NOTIFICATION_CATEGORIES.map((cat, index) => {
                const Icon = CATEGORY_ICONS[cat.key];
                const enabled = prefs ? prefs[cat.key] : true;
                return (
                  <View
                    key={cat.key}
                    style={[
                      styles.prefRow,
                      index < NOTIFICATION_CATEGORIES.length - 1 && styles.prefRowBorder,
                    ]}
                  >
                    <View style={styles.prefIconCircle}>
                      <Icon size={17} color={ResQColors.primaryRed} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prefTitle}>{cat.title}</Text>
                      <Text style={styles.prefDescription}>{cat.description}</Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={(value) => handleToggle(cat.key, value)}
                      trackColor={{ false: "#E2E8F0", true: ResQColors.primaryRed }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  centeredState: {
    alignItems: "center",
    paddingTop: 60,
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: ResQColors.primaryRedLight,
    borderWidth: 1.5,
    borderColor: ResQColors.primaryRedBorder,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 14,
  },
  permissionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ResQColors.primaryRed,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontSize: 13.5,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
    marginBottom: 2,
  },
  permissionMessage: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    lineHeight: 15,
  },
  permissionAction: {
    backgroundColor: ResQColors.primaryRed,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  permissionActionText: {
    fontSize: 12,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  introText: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
    lineHeight: 18,
  },
  prefsCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  prefRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  prefIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ResQColors.primaryRedLight,
    alignItems: "center",
    justifyContent: "center",
  },
  prefTitle: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: ResQColors.textPrimary,
    marginBottom: 2,
  },
  prefDescription: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    lineHeight: 15,
  },
});
