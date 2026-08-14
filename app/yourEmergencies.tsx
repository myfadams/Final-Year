import { getCurrentUser } from "@/backend/auth";
import {
  CreatedEmergencyRecord,
  fetchEmergenciesCreatedByUser,
  fetchUserResponderHistory,
  subscribeToUserEmergencies,
  UserResponderHistoryItem,
} from "@/backend/userEmergencies";
import CreatedEmergencyCard from "@/components/CreatedEmergencyCard";
import EmergencyDetailsModal from "@/components/EmergencyDetailsModal";
import HeartBeatWave from "@/components/HeartBeatWave";
import ResponderHistoryCard from "@/components/ResponderHistoryCard";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Siren,
  Users,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function YourEmergenciesScreen() {
  const router = useRouter();

  // Active Tab State: 'created' | 'responder'
  const [activeTab, setActiveTab] = useState<"created" | "responder">("created");

  // Data States
  const [createdEmergencies, setCreatedEmergencies] = useState<CreatedEmergencyRecord[]>([]);
  const [responderHistory, setResponderHistory] = useState<UserResponderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Modal States
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCreatedItem, setSelectedCreatedItem] = useState<CreatedEmergencyRecord | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<UserResponderHistoryItem | null>(null);

  // Pulse animation for realtime live indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Load Data
  const loadData = useCallback(async (userId?: string) => {
    try {
      setErrorMessage(null);
      let uid = userId || currentUserId;

      if (!uid) {
        const { user } = await getCurrentUser();
        if (user) {
          uid = user.id;
          setCurrentUserId(user.id);
        }
      }

      if (!uid) {
        setIsLoading(false);
        setIsRefreshing(false);
        setErrorMessage("You must be logged in to view your emergencies.");
        return;
      }

      const [createdRes, historyRes] = await Promise.all([
        fetchEmergenciesCreatedByUser(uid),
        fetchUserResponderHistory(uid),
      ]);

      if (createdRes.error) {
        console.warn("Created emergencies load warning:", createdRes.error.message);
      } else {
        setCreatedEmergencies(createdRes.data);
      }

      if (historyRes.error) {
        console.warn("Responder history load warning:", historyRes.error.message);
      } else {
        setResponderHistory(historyRes.data);
      }
    } catch (err: any) {
      console.error("loadData error:", err);
      setErrorMessage(err?.message || "Failed to load emergencies data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserId]);

  // Initial Sync & Realtime Subscription
  useEffect(() => {
    let channel: any = null;

    async function init() {
      setIsLoading(true);
      const { user } = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
        await loadData(user.id);

        channel = subscribeToUserEmergencies(user.id, () => {
          loadData(user.id);
        });
      } else {
        setIsLoading(false);
        setErrorMessage("User not authenticated.");
      }
    }

    init();

    return () => {
      if (channel) {
        try {
          channel.unsubscribe?.();
        } catch (_) {}
      }
    };
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Card Press Handlers
  const handleCreatedCardPress = (item: CreatedEmergencyRecord) => {
    setSelectedCreatedItem(item);
    setSelectedHistoryItem(null);
    setModalVisible(true);
  };

  const handleHistoryCardPress = (item: UserResponderHistoryItem) => {
    // If the emergency is currently being responded to by the user, navigate directly to IncidentDetails
    if (item.status === "responding" && item.emergency) {
      router.push({
        pathname: "/IncidentDetails",
        params: {
          id: item.emergency.id,
          title: item.emergency.title,
          description: item.emergency.description || "",
          location: item.emergency.nearestLandmark || item.emergency.locationText,
          severity: item.emergency.severity || "Moderate",
          isResolved: item.emergency.isResolved ? "true" : "false",
        },
      });
      return;
    }

    // Otherwise open the details modal
    setSelectedHistoryItem(item);
    setSelectedCreatedItem(null);
    setModalVisible(true);
  };

  // Metrics summary computations
  const totalCreated = createdEmergencies.length;
  const activeCreated = createdEmergencies.filter((e) => !e.is_resolved).length;
  const totalResponded = responderHistory.length;
  const arrivedAssisted = responderHistory.filter(
    (r) => r.status === "arrived" || r.status === "done_helping"
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER BAR */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={ResQColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Your Emergencies</Text>
            <View style={styles.liveIndicator}>
              <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Reported distress alerts & responder activity
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
          activeOpacity={0.7}
        >
          <RefreshCw size={20} color={ResQColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* METRICS SUMMARY STATS BAR */}
      <View style={styles.statsBarContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCreated}</Text>
          <Text style={styles.statLabel}>Reported</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: ResQColors.primaryRedText }]}>
            {activeCreated}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: DESIGN_COLORS.tertiary }]}>
            {totalResponded}
          </Text>
          <Text style={styles.statLabel}>Responded</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: ResQColors.greenText }]}>
            {arrivedAssisted}
          </Text>
          <Text style={styles.statLabel}>Assisted</Text>
        </View>
      </View>

      {/* TAB SELECTOR */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "created" && styles.tabButtonActive]}
          onPress={() => setActiveTab("created")}
          activeOpacity={0.8}
        >
          <Siren
            size={16}
            color={activeTab === "created" ? ResQColors.primaryRedText : ResQColors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "created" && styles.tabTextActive,
            ]}
          >
            Created by You
          </Text>
          <View
            style={[
              styles.badgeCounter,
              activeTab === "created" && styles.badgeCounterActive,
            ]}
          >
            <Text
              style={[
                styles.badgeCounterText,
                activeTab === "created" && styles.badgeCounterTextActive,
              ]}
            >
              {totalCreated}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "responder" && styles.tabButtonActive]}
          onPress={() => setActiveTab("responder")}
          activeOpacity={0.8}
        >
          <Shield
            size={16}
            color={activeTab === "responder" ? ResQColors.primaryRedText : ResQColors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "responder" && styles.tabTextActive,
            ]}
          >
            Responder History
          </Text>
          <View
            style={[
              styles.badgeCounter,
              activeTab === "responder" && styles.badgeCounterActive,
            ]}
          >
            <Text
              style={[
                styles.badgeCounterText,
                activeTab === "responder" && styles.badgeCounterTextActive,
              ]}
            >
              {totalResponded}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* CONTENT LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[ResQColors.primaryRed]}
            tintColor={ResQColors.primaryRed}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <HeartBeatWave width={140} color={ResQColors.primaryRed} thickness={4} />
            <Text style={styles.loadingText}>Fetching emergency records...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <AlertTriangle size={32} color={ResQColors.orangeText} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
              <Text style={styles.retryBtnText}>Retry Load</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === "created" ? (
          /* TAB 1: CREATED BY YOU */
          createdEmergencies.length > 0 ? (
            createdEmergencies.map((item) => (
              <CreatedEmergencyCard
                key={item.id}
                item={item}
                onPress={() => handleCreatedCardPress(item)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Siren size={36} color={ResQColors.primaryRedText} />
              </View>
              <Text style={styles.emptyTitle}>No Reported Emergencies</Text>
              <Text style={styles.emptySubtext}>
                You haven't reported any distress emergencies yet. When you trigger SOS or report an incident, it will appear here with live responder updates.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => router.push("/report")}
                activeOpacity={0.85}
              >
                <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Report an Incident</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* TAB 2: RESPONDER HISTORY */
          responderHistory.length > 0 ? (
            responderHistory.map((item) => (
              <ResponderHistoryCard
                key={item.historyId}
                item={item}
                onPress={() => handleHistoryCardPress(item)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBg, { backgroundColor: DESIGN_COLORS.surfaceContainer }]}>
                <Shield size={36} color={DESIGN_COLORS.tertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Responder History</Text>
              <Text style={styles.emptySubtext}>
                You haven't responded to any distress emergencies yet. Check Community Alerts on the home tab to assist nearby residents in distress.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: DESIGN_COLORS.tertiary }]}
                onPress={() => router.push("/(resident)/alerts")}
                activeOpacity={0.85}
              >
                <ShieldAlert size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>View Community Alerts</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>

      {/* EMERGENCY DETAILS MODAL */}
      <EmergencyDetailsModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedCreatedItem(null);
          setSelectedHistoryItem(null);
        }}
        createdItem={selectedCreatedItem}
        historyItem={selectedHistoryItem}
        onStatusUpdated={() => loadData()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: ResQColors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: ResQColors.border,
  },
  backButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: ResQColors.cardSurfaceSoft,
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: ResQColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ResQColors.textMuted,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.primaryRedLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ResQColors.primaryRed,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: ResQColors.primaryRedText,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: ResQColors.cardSurfaceSoft,
  },

  /* Stats Bar */
  statsBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: ResQColors.cardSurface,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: ResQColors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statCard: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: ResQColors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: ResQColors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: ResQColors.border,
  },

  /* Tab Control */
  tabContainer: {
    flexDirection: "row",
    backgroundColor: ResQColors.cardSurfaceSoft,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: ResQColors.cardSurface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: ResQColors.textMuted,
  },
  tabTextActive: {
    color: ResQColors.textPrimary,
    fontWeight: "700",
  },
  badgeCounter: {
    backgroundColor: ResQColors.badgeGrayBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCounterActive: {
    backgroundColor: ResQColors.primaryRedLight,
  },
  badgeCounterText: {
    fontSize: 11,
    fontWeight: "700",
    color: ResQColors.badgeGrayText,
  },
  badgeCounterTextActive: {
    color: ResQColors.primaryRedText,
  },

  /* Scroll & Lists */
  scrollContent: {
    paddingBottom: 30,
    flexGrow: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: ResQColors.textMuted,
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
  errorText: {
    fontSize: 14,
    color: ResQColors.textSecondary,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: ResQColors.primaryRed,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ResQColors.primaryRedLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ResQColors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: ResQColors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.primaryRed,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: ResQColors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
