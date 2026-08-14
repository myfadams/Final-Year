import { fetchUserProfileById, getCurrentUser } from "@/backend/auth";
import {
  cancelEmergencyResponse,
  confirmEmergencyArrival,
  fetchEmergencies,
  fetchEmergencyById,
  fetchUserEmergencyHistoryMap,
  mapEmergencyRecordToPerson,
  recordEmergencyResponse,
} from "@/backend/emergencies";
import { MapFloatingWindow } from "@/components/MapFloatingWindow";
import MapViewComponent from "@/components/MapViewComponent";
import { SharedLocationFloatingWindow } from "@/components/SharedLocationFloatingWindow";
import Colors from "@/constants/Colors";
import { globalState, SharedLocationPin } from "@/constants/globalState";
import { Person } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  BriefcaseMedical,
  Car,
  Compass,
  Flame,
  Footprints,
  Search,
  Shield,
  SlidersHorizontal,
  Zap,
} from "lucide-react-native";
import { showPopupAlert } from "@/components/popupAlert";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,

} from "react-native";

type CategoryFilter = "All" | "Medical" | "Fire" | "Security";

export default function LocationScreen() {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeEmergency, setActiveEmergency] = useState<Person | null>(null);
  const [activeSharedLocation, setActiveSharedLocation] =
    useState<SharedLocationPin | null>(null);
  const [realEmergencies, setRealEmergencies] = useState<Person[]>([]);
  const [distance, setDistance] = useState("--");
  const [duration, setDuration] = useState("--");
  const [isArrived, setIsArrived] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<
    "driving" | "running" | "walking"
  >("running");

  const params = useLocalSearchParams<{
    personId?: string;
    action?: string;
    recenter?: string;
    sharedLocationId?: string;
    senderName?: string;
    senderAvatar?: string;
    lat?: string;
    lng?: string;
    locationType?: string;
    timestampText?: string;
    createdAt?: string;
    hasImOkay?: string;
    messageText?: string;
    title?: string;
    description?: string;
    severity?: string;
    creatorID?: string;
    falseAlarm?: string;
    location?: string;
  }>();

  // Recenter trigger
  const handleRecenter = () => {
    setRecenterNonce(Math.random().toString());
  };

  // Sync active emergency, shared location pin, and handle incoming query parameters when focused
  useFocusEffect(
    React.useCallback(() => {
      let isAlive = true;

      (async () => {
        const { user } = await getCurrentUser();
        const userId = user?.id || "";

        const historyMap = userId ? await fetchUserEmergencyHistoryMap(userId) : {};

        // 1. Fetch active emergencies from Supabase & resolve creator user profiles
        const { data: emergencies } = await fetchEmergencies(userId);
        if (!isAlive) return;

        let loadedRealPeople: Person[] = [];
        if (emergencies && emergencies.length > 0) {
          // Filter out emergencies where user status in history is 'arrived' or 'done'
          const activeMapEmergencies = emergencies.filter((rec) => {
            const status = historyMap[rec.id];
            return status !== "arrived" && status !== "done";
          });

          loadedRealPeople = await Promise.all(
            activeMapEmergencies.map(async (rec) => {
              let creatorProfile = null;
              if (rec.creator_id) {
                creatorProfile = await fetchUserProfileById(rec.creator_id);
              }
              return mapEmergencyRecordToPerson(rec, creatorProfile);
            })
          );
          if (!isAlive) return;
          setRealEmergencies(loadedRealPeople);
        } else {
          setRealEmergencies([]);
        }

        // If currently selected person is arrived or done, clear selection
        if (selectedPerson) {
          const selStatus = historyMap[selectedPerson.id];
          if (selStatus === "arrived" || selStatus === "done") {
            setSelectedPerson(null);
          }
        }

        // 2. Sync active emergency & active shared location from globalState
        const globalActiveId = globalState.activeEmergencyId;
        if (globalActiveId) {
          let found = loadedRealPeople.find((p) => p.id === globalActiveId);
          if (
            !found &&
            globalState.activeEmergencyPerson &&
            globalState.activeEmergencyPerson.id === globalActiveId
          ) {
            found = globalState.activeEmergencyPerson;
          }
          if (found) {
            setActiveEmergency(found);
          }
        } else {
          setActiveEmergency(null);
        }

        if (globalState.activeSharedLocation) {
          setActiveSharedLocation(globalState.activeSharedLocation);
        }

        // 3. Handle deep link / parameter changes
        const {
          personId,
          action,
          recenter,
          sharedLocationId,
          senderName,
          senderAvatar,
          lat,
          lng,
          locationType,
          timestampText,
          createdAt,
          hasImOkay,
          messageText,
          title,
          description,
          severity,
          creatorID,
          falseAlarm: falseAlarmParam,
          location: locationParam,
        } = params;

        if (recenter) {
          setSelectedPerson(null);
          globalState.activeEmergencyId = null;
          globalState.activeEmergencyPerson = null;
          setActiveEmergency(null);
          setRecenterNonce(recenter);
          router.setParams({ recenter: undefined });
        } else if (sharedLocationId && lat && lng) {
          const latitude = parseFloat(lat);
          const longitude = parseFloat(lng);
          const createdTimestamp = createdAt
            ? parseInt(createdAt, 10)
            : Date.now();
          const now = Date.now();
          const isExpired =
            locationType === "location_share" &&
            now - createdTimestamp >= 300000;

          const newPin: SharedLocationPin = {
            id: sharedLocationId,
            senderName: senderName || "User",
            senderAvatar: senderAvatar || "",
            latitude,
            longitude,
            type: (locationType as "location_share" | "walk_safe") || "location_share",
            timestampText: timestampText || "Shared Location",
            createdAt: createdTimestamp,
            messageText: messageText,
            hasImOkay: hasImOkay === "true",
            reopenedAt: isExpired ? now : undefined,
            dismissed: false,
            cardDismissed: false,
            isTrackingActive: false,
          };

          globalState.activeSharedLocation = newPin;
          setActiveSharedLocation(newPin);
          setSelectedPerson(null);

          router.setParams({
            sharedLocationId: undefined,
            senderName: undefined,
            senderAvatar: undefined,
            lat: undefined,
            lng: undefined,
            locationType: undefined,
            timestampText: undefined,
            createdAt: undefined,
            hasImOkay: undefined,
            messageText: undefined,
          });
        } else if (personId) {
          const targetStatus = historyMap[personId];
          if (targetStatus !== "arrived" && targetStatus !== "done") {
            let person: Person | null =
              loadedRealPeople.find((p) => p.id === personId) ?? null;

            if (!person) {
              const targetCreatorId = creatorID || "";
              let creatorName = "Resident in Distress";
              let knownHealth: string[] = [];

              if (targetCreatorId) {
                const profile = await fetchUserProfileById(targetCreatorId);
                if (profile) {
                  creatorName = profile.name;
                  knownHealth = profile.known_health_problems || [];
                }
              } else {
                const { data: rec } = await fetchEmergencyById(personId);
                if (rec?.creator_id) {
                  const profile = await fetchUserProfileById(rec.creator_id);
                  if (profile) {
                    creatorName = profile.name;
                    knownHealth = profile.known_health_problems || [];
                  }
                }
              }

              const urgencyMap: Record<string, "critical" | "high" | "medium"> = {
                Critical: "critical",
                Moderate: "high",
                Low: "medium",
              };
              const urgency = urgencyMap[severity || ""] ?? "critical";

              person = {
                id: personId,
                name: creatorName,
                title: title || "Emergency",
                creatorId: targetCreatorId,
                address: locationParam || "Location details",
                avatarColor: "#AF101A",
                markerColor: "#AF101A",
                latitude: lat ? parseFloat(lat) : 6.675155,
                longitude: lng ? parseFloat(lng) : -1.571569,
                urgency,
                description: description || title || "",
                requesterDesc: description || `${title} near ${locationParam}`,
                knownHealthProblems: knownHealth,
                falseAlarm: falseAlarmParam === "true",
              };
            }

            if (person) {
              setSelectedPerson(person);
              if (globalState.activeSharedLocation) {
                const updated = {
                  ...globalState.activeSharedLocation,
                  cardDismissed: true,
                };
                globalState.activeSharedLocation = updated;
                setActiveSharedLocation(updated);
              }
              if (action === "respond") {
                globalState.activeEmergencyId = personId;
                globalState.activeEmergencyPerson = person;
                setActiveEmergency(person);
              }
            }
          }
          router.setParams({ personId: undefined, action: undefined });
        }
      })();

      return () => {
        isAlive = false;
      };
    }, [params]),
  );

  // 5-minute pin auto-dismissal timer for snapshot location sharing pins
  useEffect(() => {
    if (
      activeSharedLocation &&
      activeSharedLocation.type === "location_share" &&
      !activeSharedLocation.dismissed &&
      !activeSharedLocation.reopenedAt
    ) {
      const elapsed = Date.now() - activeSharedLocation.createdAt;
      const remainingMs = 300000 - elapsed; // 5 minutes (300,000ms)

      if (remainingMs <= 0) {
        const dismissedPin = { ...activeSharedLocation, dismissed: true };
        globalState.activeSharedLocation = dismissedPin;
        setActiveSharedLocation(dismissedPin);
      } else {
        const timer = setTimeout(() => {
          setActiveSharedLocation((prev) => {
            if (prev && prev.id === activeSharedLocation.id) {
              const dismissedPin = { ...prev, dismissed: true };
              globalState.activeSharedLocation = dismissedPin;
              return dismissedPin;
            }
            return prev;
          });
        }, remainingMs);

      }
    }
  }, [activeSharedLocation]);

  const isNearLocation = React.useMemo(() => {
    if (!distance || distance === "--") return false;
    if (distance.includes("km")) return false;
    const match = distance.match(/(\d+)\s*m/);
    if (match) {
      const meters = parseInt(match[1], 10);
      return !isNaN(meters) && meters <= 50;
    }
    return false;
  }, [distance]);

  const handleRespondToggle = async () => {
    if (!selectedPerson) return;
    const idStr = selectedPerson.id;

    if (activeEmergency?.id === idStr) {
      const { error } = await cancelEmergencyResponse({ emergencyId: idStr });
      if (error) {
        console.warn("cancelEmergencyResponse warning:", error.message);
      }
      globalState.activeEmergencyId = null;
      globalState.activeEmergencyPerson = null;
      setActiveEmergency(null);
      setIsArrived(false);
      showPopupAlert(
        "Response Cancelled",
        "You are no longer assigned as a responder to this incident.",
        undefined,
        undefined,
        "info"
      );
      return;
    }

    const { error } = await recordEmergencyResponse({
      emergencyId: idStr,
      transportMode: "running",
      estimatedArrivalSeconds: 300,
    });
    if (error) {
      showPopupAlert(
        "Response Error",
        error.message || "Failed to record response.",
        undefined,
        undefined,
        "error"
      );
      return;
    }

    globalState.activeEmergencyId = idStr;
    globalState.activeEmergencyPerson = selectedPerson;
    setActiveEmergency(selectedPerson);

    showPopupAlert(
      "Response Recorded",
      "Your response attempt has been recorded in the database.",
      undefined,
      undefined,
      "success"
    );
  };

  const handleConfirmArrival = async () => {
    if (!selectedPerson) return;
    const idStr = selectedPerson.id;

    // Update history status to 'arrived' and cancel active response transit
    const { error } = await confirmEmergencyArrival({ emergencyId: idStr });
    if (error) {
      console.warn("confirmEmergencyArrival warning:", error.message);
    }

    // Stop active navigation guidance and clear active emergency state
    globalState.isWalkSafeRoutingActive = false;
    globalState.activeEmergencyId = null;
    globalState.activeEmergencyPerson = null;
    setActiveEmergency(null);
    setIsArrived(true);

    // Remove pin and emergency from the map and close floating map window
    setRealEmergencies((prev) => prev.filter((p) => p.id !== idStr));
    setSelectedPerson(null);

    showPopupAlert(
      "Arrival Confirmed",
      "Your arrival at the emergency location has been recorded. The emergency pin has been removed from your map.",
      [{ text: "OK" }],
      undefined,
      "success"
    );
  };

  const handleOpenDetails = () => {
    if (!selectedPerson) return;

    // Determine severity mapping for detail view standard structure
    const severityMap =
      selectedPerson.urgency === "critical"
        ? "Critical"
        : selectedPerson.urgency === "high"
          ? "Moderate"
          : "Low";

    router.push({
      pathname: "/IncidentDetails",
      params: {
        id: selectedPerson.id,
        title: selectedPerson.name,
        description: selectedPerson.description || "",
        location: selectedPerson.address,
        distance: distance.replace(/\s+/g, ""),
        time: duration.replace(/\s+/g, ""),
        severity: severityMap,
        isResolved: "false",
        photos: JSON.stringify(selectedPerson.images || []),
        travelMode: travelMode, // Keep the active mode of transport selected on the map!
      },
    });
  };

  const handleSelectPerson = React.useCallback(
    (p: Person) => {
      setSelectedPerson(p);
      if (globalState.activeSharedLocation) {
        const updated = {
          ...globalState.activeSharedLocation,
          cardDismissed: true,
        };
        globalState.activeSharedLocation = updated;
        setActiveSharedLocation(updated);
      }
    },
    [],
  );

  const handleSelectSharedPin = React.useCallback(
    (pin: SharedLocationPin) => {
      setSelectedPerson(null);
      const updated = { ...pin, cardDismissed: false };
      globalState.activeSharedLocation = updated;
      setActiveSharedLocation(updated);
    },
    [],
  );

  const handleRouteCalculated = React.useCallback(
    (dist: string, dur: string) => {
      setDistance(dist);
      setDuration(dur);
    },
    [],
  );

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        translucent={true}
        backgroundColor="transparent"
      />

      {/* FULL SCREEN MAP */}
      <MapViewComponent
        selectedPerson={selectedPerson}
        activeEmergency={activeEmergency}
        activeSharedLocation={activeSharedLocation}
        realEmergencies={realEmergencies}
        recenterNonce={recenterNonce}
        categoryFilter={categoryFilter}
        searchQuery={searchQuery}
        travelMode={travelMode}
        onSelectPerson={handleSelectPerson}
        onSelectSharedPin={handleSelectSharedPin}
        onRouteCalculated={handleRouteCalculated}
      />

      {/* FLOATING SEARCH & FILTER ROW */}
      <View style={styles.searchAndFiltersContainer} pointerEvents="box-none">
        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <Search size={20} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() =>
              showPopupAlert(
                "Filter Settings",
                "Configure your alert monitoring range and notifications.",
                undefined,
                undefined,
                "info"
              )
            }
          >
            <SlidersHorizontal size={18} color="#B91C1C" />
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScrollView}
          contentContainerStyle={styles.pillsScrollContainer}
        >
          {(["All", "Medical", "Fire", "Security"] as CategoryFilter[]).map(
            (tab) => {
              const isActive = categoryFilter === tab;

              // Get category icons dynamically
              const renderIcon = () => {
                const iconSize = 15;
                const iconColor = isActive ? "#FFFFFF" : "#475569";
                if (tab === "Medical")
                  return (
                    <BriefcaseMedical
                      size={iconSize}
                      color={iconColor}
                      style={{ marginRight: 5 }}
                    />
                  );
                if (tab === "Fire")
                  return (
                    <Flame
                      size={iconSize}
                      color={iconColor}
                      style={{ marginRight: 5 }}
                    />
                  );
                if (tab === "Security")
                  return (
                    <Shield
                      size={iconSize}
                      color={iconColor}
                      style={{ marginRight: 5 }}
                    />
                  );
                return null;
              };

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.pillBtn, isActive && styles.pillBtnActive]}
                  onPress={() => {
                    setCategoryFilter(tab);
                    setSelectedPerson(null); // Clear selected case on filter switch
                  }}
                  activeOpacity={0.85}
                >
                  {renderIcon()}
                  <Text
                    style={[
                      styles.pillBtnText,
                      isActive && styles.pillBtnTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </ScrollView>
      </View>

      {/* TRAVEL MODE FLOATING BUTTONS STACK */}
      <View
        style={[
          styles.travelModeContainer,
          {
            bottom:
              selectedPerson ||
                (activeSharedLocation &&
                  !activeSharedLocation.cardDismissed &&
                  !activeSharedLocation.dismissed)
                ? Platform.OS === "ios"
                  ? 365
                  : 330
                : Platform.OS === "ios"
                  ? 180
                  : 146,
          },
        ]}
      >
        {(["driving", "running", "walking"] as const).map((mode) => {
          const isActive = travelMode === mode;
          const renderModeIcon = () => {
            const size = 18;
            const color = isActive ? "#FFFFFF" : "#475569";
            if (mode === "driving") return <Car size={size} color={color} />;
            if (mode === "running") return <Zap size={size} color={color} />;
            return <Footprints size={size} color={color} />;
          };

          return (
            <TouchableOpacity
              key={mode}
              style={[
                styles.travelModeButton,
                isActive && styles.travelModeButtonActive,
              ]}
              onPress={() => setTravelMode(mode)}
              activeOpacity={0.85}
            >
              {renderModeIcon()}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.recenterFloatButton,
          {
            bottom:
              selectedPerson ||
                (activeSharedLocation &&
                  !activeSharedLocation.cardDismissed &&
                  !activeSharedLocation.dismissed)
                ? Platform.OS === "ios"
                  ? 305
                  : 270
                : Platform.OS === "ios"
                  ? 120
                  : 86,
          },
        ]}
        onPress={handleRecenter}
        activeOpacity={0.85}
      >
        <Compass size={22} color={Colors.light.accent} />
      </TouchableOpacity>

      {/* FLOATING CARD OVERLAY FOR INCIDENTS (MapFloatingWindow Component) */}
      {selectedPerson && (
        <MapFloatingWindow
          selectedPerson={selectedPerson}
          activeEmergency={activeEmergency}
          distance={distance}
          duration={duration}
          isNearLocation={isNearLocation}
          isArrived={isArrived}
          onClose={() => setSelectedPerson(null)}
          onRespondToggle={handleRespondToggle}
          onConfirmArrival={handleConfirmArrival}
          onOpenDetails={handleOpenDetails}
        />
      )}

      {/* DEDICATED FLOATING WINDOW FOR WALK SAFE AND LOCATION SHARE */}
      {activeSharedLocation &&
        !activeSharedLocation.cardDismissed &&
        !activeSharedLocation.dismissed && (
          <SharedLocationFloatingWindow
            pin={activeSharedLocation}
            distance={distance}
            duration={duration}
            onClose={() => {
              const updated = { ...activeSharedLocation, cardDismissed: true };
              globalState.activeSharedLocation = updated;
              setActiveSharedLocation(updated);
            }}
            onTrackToggle={() => {
              const newTrackingState = !activeSharedLocation.isTrackingActive;
              const updated = {
                ...activeSharedLocation,
                isTrackingActive: newTrackingState,
              };
              globalState.activeSharedLocation = updated;
              setActiveSharedLocation(updated);

              // MUTUAL EXCLUSION OF ROUTING: Cancel emergency response routing if Walk Safe tracking is activated
              if (
                newTrackingState &&
                (activeEmergency || globalState.activeEmergencyId)
              ) {
                globalState.activeEmergencyId = null;
                setActiveEmergency(null);
              }
            }}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerSafeArea: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
  },
  headerNavbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIconButton: {
    padding: 6,
  },
  headerTitleText: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  notificationBellWrapper: {
    padding: 6,
    position: "relative",
  },
  bellRedDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  searchAndFiltersContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 36,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 5,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 48,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: typography.regular,
    color: "#0F172A",
    height: "100%",
  },
  filterButton: {
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
    justifyContent: "center",
    height: 24,
  },
  pillsScrollView: {
    width: "100%",
  },
  pillsScrollContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  pillBtnActive: {
    backgroundColor: "#af101a",
    borderColor: "#af101a",
  },
  pillBtnText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: "#475569",
  },
  pillBtnTextActive: {
    color: "#FFFFFF",
  },
  travelModeContainer: {
    position: "absolute",
    right: 16,
    gap: 8,
    zIndex: 4,
  },
  travelModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  travelModeButtonActive: {
    backgroundColor: "#af101a",
    borderColor: "#af101a",
  },
  recenterFloatButton: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 4,
  },
});
