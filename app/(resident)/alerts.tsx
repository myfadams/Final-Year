import { getCurrentUser } from "@/backend/auth";
import {
  cancelEmergencyResponse,
  EmergencyRecord,
  fetchEmergencies,
  fetchUserEmergencyHistoryMap,
  subscribeToEmergencies,
} from "@/backend/emergencies";
import { supabase } from "@/backend/supabaseConfig";
import AlertCasesComponent from "@/components/AlertCasesComponent";
import AnotherNavBarHeader from "@/components/AnotherNavBarHeader";
import CaseComponent from "@/components/CaseComponent";
import HeartBeatWave from "@/components/HeartBeatWave";
import { useNetwork } from "@/components/network";
import { showPopupAlert } from "@/components/popupAlert";
import ResolvedCaseComponent from "@/components/ResolvedCaseComponent";
import ScrollViewButton from "@/components/ScrollViewButton";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { caseProp } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import filterByProperty from "@/externalFunctions/functions";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import {
  AlertTriangle,
  Bell,
  BellOff,
  MapPin,
  RefreshCw,
  WifiOff,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Haversine formula — returns distance in metres between two GPS coordinates. */
function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
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

/**
 * Converts a Supabase EmergencyRecord to the caseProp shape expected by UI components.
 * Optionally accepts the device's current coordinates to compute real distance.
 */
function mapEmergencyToCaseProp(
  r: EmergencyRecord,
  userLocation?: { latitude: number; longitude: number } | null,
): caseProp {
  const createdMs = r.created_at ? new Date(r.created_at).getTime() : Date.now();
  const nowMs = Date.now();
  const ageSeconds = Math.max(0, Math.floor((nowMs - createdMs) / 1000));

  const resolvedMs =
    r.resolved_at ? new Date(r.resolved_at).getTime() : nowMs;
  const responseTimeSec = r.response_time_seconds
    ? r.response_time_seconds
    : Math.max(0, Math.floor((resolvedMs - createdMs) / 1000));

  const severity: caseProp["severity"] =
    r.severity === "Critical"
      ? "Critical"
      : r.severity === "Moderate"
        ? "Moderate"
        : "Low";

  // Calculate distance from device to emergency (metres), or 0 if location unavailable
  const distance =
    userLocation && typeof r.latitude === "number" && typeof r.longitude === "number"
      ? Math.round(haversineMeters(userLocation.latitude, userLocation.longitude, r.latitude, r.longitude))
      : 0;

  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    location: r.nearest_landmark ?? r.location_text,
    distance,
    time: ageSeconds,
    severity,
    isResolved: r.is_resolved ?? false,
    responders: r.responders_count ?? 0,
    action: r.is_resolved ? "Details" : "Respond",
    creatorID: r.creator_id ?? "",
    falseAlarm: r.false_alarm ?? false,
    responseTime: responseTimeSec,
    lat: r.latitude?.toString(),
    lng: r.longitude?.toString(),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const { isOffline } = useNetwork();
  const [isActive, setActive] = useState("all");
  const [all, setAll] = useState<caseProp[]>([]);
  const [resolved, setResolved] = useState<caseProp[]>([]);
  const [critical, setCritical] = useState<caseProp[]>([]);
  const [moderate, setModerate] = useState<caseProp[]>([]);
  const [activeCases, setActiveCases] = useState<caseProp[]>([]);
  const [low, setLow] = useState<caseProp[]>([]);
  const [activeEmergencyId, setActiveEmergencyId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  // Device GPS location — used to compute real distances to each emergency
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const channelRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Pulse animation for the live indicator
  useEffect(() => {
    if (!realtimeConnected) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [realtimeConnected, pulseAnim]);

  // ── Data helpers ─────────────────────────────────────────────────────────

  async function applyData(
    records: EmergencyRecord[],
    loc?: { latitude: number; longitude: number } | null,
    userId?: string
  ) {
    const location = loc ?? userLocationRef.current;
    let historyMap: Record<string, any> = {};
    if (userId) {
      historyMap = await fetchUserEmergencyHistoryMap(userId);
    }

    const mapped = records.map((r) => ({
      ...mapEmergencyToCaseProp(r, location),
      responderStatus: historyMap[r.id] || null,
    }));

    setAll(mapped);
    setResolved(filterByProperty(mapped, "isResolved", true));
    setCritical(filterByProperty(mapped, "severity", "Critical"));
    setModerate(filterByProperty(mapped, "severity", "Moderate"));
    setLow(filterByProperty(mapped, "severity", "Low"));
    setActiveCases(filterByProperty(mapped, "isResolved", false));
    setActiveEmergencyId(globalState.activeEmergencyId);
  }

  const loadEmergencies = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    setFetchError(null);

    // Request GPS location (non-blocking — if denied, distance stays 0)
    let loc: { latitude: number; longitude: number } | null = userLocationRef.current;
    if (!loc) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          userLocationRef.current = loc;
          setUserLocation(loc);
        }
      } catch (_) { /* location unavailable — distances will show as 0 */ }
    }
    // if (userId)
    const { data, error } = await fetchEmergencies(userId);
    if (error) {
      setFetchError(error.message);
      setLoading(false);
      return;
    }
    await applyData(data, loc, userId);
    setLoading(false);
  }, []);

  const setupRealtime = useCallback(
    (userId: string) => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (_) { }
        channelRef.current = null;
      }
      setRealtimeConnected(false);

      try {
        const channel = subscribeToEmergencies(
          userId,
          () => {
            loadEmergencies(userId);
          },
          (status: string) => {
            if (status === "SUBSCRIBED") setRealtimeConnected(true);
            else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeConnected(false);
          }
        );

        channelRef.current = channel;
      } catch (err) {
        console.warn("setupRealtime warning:", err);
      }
    },
    [loadEmergencies],
  );

  // ── Focus effect ─────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const { user } = await getCurrentUser();
        if (!alive) return;

        const userId = user?.id ?? "";
        currentUserIdRef.current = userId;

        await loadEmergencies(userId);
        if (!alive) return;

        setupRealtime(userId);
      })();

      return () => {
        alive = false;
        if (channelRef.current) {
          try {
            supabase.removeChannel(channelRef.current);
          } catch (_) { }
          channelRef.current = null;
        }
        setRealtimeConnected(false);
      };
    }, [loadEmergencies, setupRealtime]),
  );

  // ── Filter logic ─────────────────────────────────────────────────────────

  const { displayedActiveCases, displayedResolvedCases } = useMemo(() => {
    const filter = isActive.toLowerCase();

    if (filter === "critical") {
      return {
        displayedActiveCases: activeCases.filter(
          (item) => item.severity.toLowerCase() === "critical",
        ),
        displayedResolvedCases: [],
      };
    }

    if (filter === "moderate") {
      return {
        displayedActiveCases: activeCases.filter(
          (item) => item.severity.toLowerCase() === "moderate",
        ),
        displayedResolvedCases: [],
      };
    }

    if (filter === "nearby") {
      return {
        displayedActiveCases: [...activeCases].sort((a, b) => a.distance - b.distance),
        displayedResolvedCases: [],
      };
    }

    if (filter === "medical") {
      return {
        displayedActiveCases: activeCases.filter(
          (item) =>
            item.title.toLowerCase().includes("breathing") ||
            item.title.toLowerCase().includes("medical") ||
            item.description.toLowerCase().includes("medical") ||
            item.severity.toLowerCase() === "critical",
        ),
        displayedResolvedCases: [],
      };
    }

    if (filter === "resolved") {
      return { displayedActiveCases: [], displayedResolvedCases: resolved };
    }

    return { displayedActiveCases: activeCases, displayedResolvedCases: resolved };
  }, [isActive, activeCases, resolved]);

  const isEmpty =
    !loading &&
    !fetchError &&
    displayedActiveCases.length === 0 &&
    displayedResolvedCases.length === 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <AnotherNavBarHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Location + Realtime badge */}
        <View style={styles.locationSubtitleRow}>
          <View style={styles.locationHeaderBox}>
            <MapPin size={14} color="#AF101A" style={{ marginRight: 4 }} />
            <Text style={styles.locationSubtitleText}>Near KNUST campus</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => loadEmergencies(currentUserIdRef.current ?? "")}
              activeOpacity={0.7}
            >
              <RefreshCw size={13} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.realtimeBadge}>
              {realtimeConnected && !isOffline ? (
                <>
                  <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                  <Text style={styles.liveText}>Live Sync</Text>
                </>
              ) : (
                <>
                  <WifiOff size={11} color={ResQColors.textSubtle} />
                  <Text style={styles.offlineText}>Offline</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCardsRow}>
          <AlertCasesComponent
            caseNumber={critical.length}
            text="Critical"
            color={Colors.URGENCY_COLORS.critical}
          />
          <AlertCasesComponent
            caseNumber={moderate.length}
            text="Moderate"
            color={Colors.URGENCY_COLORS.high}
          />
          <AlertCasesComponent
            caseNumber={resolved.length}
            text="Resolved today"
            color={Colors.light.success}
          />
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContainer}
        >
          <ScrollViewButton pageName="all" text="All" setIsActive={setActive} isActive={isActive} numberOfCases={all.length} />
          <ScrollViewButton pageName="critical" text="Critical" setIsActive={setActive} isActive={isActive} />
          <ScrollViewButton pageName="nearby" text="Nearby" setIsActive={setActive} isActive={isActive} />
          <ScrollViewButton pageName="medical" text="Medical" setIsActive={setActive} isActive={isActive} />
          <ScrollViewButton pageName="resolved" text="Resolved" setIsActive={setActive} isActive={isActive} />
        </ScrollView>

        {/* Loading */}
        {loading && (
          <View style={styles.centeredState}>
            <HeartBeatWave
              width={220}
              color={Colors.light.primary}
              thickness={7}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.stateTitle}>Fetching alerts…</Text>
            <Text style={styles.stateSubtitle}>Checking for active emergencies nearby</Text>
          </View>
        )}

        {/* Error */}
        {!loading && fetchError && (
          <View style={styles.centeredState}>
            <View style={styles.stateIconWrapper}>
              <AlertTriangle size={32} color="#FF6B6B" />
            </View>
            <Text style={[styles.stateTitle, { color: "#FF6B6B" }]}>Couldn't load alerts</Text>
            <Text style={styles.stateSubtitle}>{fetchError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadEmergencies(currentUserIdRef.current ?? "")}
              activeOpacity={0.75}
            >
              <RefreshCw size={15} color="#fff" />
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty */}
        {isEmpty && (
          <View style={styles.centeredState}>
            <View style={styles.emptyIconWrapper}>
              <BellOff size={34} color={ResQColors.textSubtle} />
            </View>
            <Text style={styles.stateTitle}>No alerts right now</Text>
            <Text style={styles.stateSubtitle}>
              {isActive === "all"
                ? "There are no active or resolved emergencies in your area at the moment. You'll be notified as soon as one comes in."
                : `No ${isActive} emergencies to show. Try switching to a different filter.`}
            </Text>
            {realtimeConnected && (
              <View style={styles.watchingBadge}>
                <Bell size={13} color={Colors.light.primary} />
                <Text style={styles.watchingText}>Watching for new alerts</Text>
              </View>
            )}
          </View>
        )}

        {/* Active Now */}
        {!loading && !fetchError && displayedActiveCases.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>ACTIVE NOW</Text>
              <Text style={styles.sectionCountText}>
                {displayedActiveCases.length} incident{displayedActiveCases.length > 1 ? "s" : ""}
              </Text>
            </View>
            <View>
              {displayedActiveCases.map((item) => (
                <CaseComponent
                  {...item}
                  key={item.id}
                  isActiveResponse={activeEmergencyId === item.id.toString()}
                  onMapPress={() => {
                    router.push({
                      pathname: "/(resident)/map",
                      params: {
                        personId: item.id.toString(),
                        action: "preview",
                        lat: item.lat,
                        lng: item.lng,
                        title: item.title,
                        description: item.description,
                        severity: item.severity,
                        creatorID: item.creatorID,
                        location: item.location,
                      },
                    });
                  }}
                  onRespondPress={async () => {
                    if (item.falseAlarm) {
                      showPopupAlert(
                        "False Emergency Alert",
                        "The creator of this emergency flagged it as false information. You cannot respond to it.",
                        undefined,
                        undefined,
                        "warning"
                      );
                      return;
                    }
                    const idStr = item.id.toString();
                    if (activeEmergencyId === idStr) {
                      globalState.activeEmergencyId = null;
                      setActiveEmergencyId(null);
                      await cancelEmergencyResponse({ emergencyId: idStr });
                    } else {
                      globalState.activeEmergencyId = idStr;
                      setActiveEmergencyId(idStr);
                      router.push({
                        pathname: "/(resident)/map",
                        params: {
                          personId: idStr,
                          action: "respond",
                          lat: item.lat,
                          lng: item.lng,
                          title: item.title,
                          description: item.description,
                          severity: item.severity,
                          creatorID: item.creatorID,
                          location: item.location,
                        },
                      });
                    }
                  }}
                />
              ))}
            </View>
          </>
        )}

        {/* Resolved Today */}
        {!loading && !fetchError && displayedResolvedCases.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>RESOLVED TODAY</Text>
              <Text style={styles.sectionCountText}>{displayedResolvedCases.length} closed</Text>
            </View>
            <View>
              {displayedResolvedCases.map((item) => (
                <ResolvedCaseComponent {...item} key={item.id} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  locationSubtitleRow: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationSubtitleText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: "#475569",
  },
  refreshIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  realtimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  liveText: {
    fontSize: 11,
    fontFamily: typography.semibold,
    color: "#22C55E",
  },
  offlineText: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: ResQColors.textSubtle,
  },
  summaryCardsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 18,
  },
  filterScrollContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: DESIGN_COLORS.slate900,
    letterSpacing: 0.5,
  },
  sectionCountText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: ResQColors.textSubtle,
  },
  centeredState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 24,
  },
  stateIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 107, 107, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ResQColors.cardSurface,
    borderWidth: 1,
    borderColor: ResQColors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 17,
    fontFamily: typography.semibold,
    color: DESIGN_COLORS.slate900,
    marginBottom: 8,
    textAlign: "center",
  },
  stateSubtitle: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.semibold,
  },
  watchingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    backgroundColor: ResQColors.cardSurface,
    borderWidth: 1,
    borderColor: ResQColors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  watchingText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: Colors.light.primary,
  },
});
