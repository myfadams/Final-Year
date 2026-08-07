import { MapFloatingWindow } from "@/components/MapFloatingWindow";
import MapViewComponent from "@/components/MapViewComponent";
import Colors from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { Person } from "@/constants/interfaces";
import { PEOPLE } from "@/constants/tempData";
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
import React, { useState } from "react";
import {
  Alert,
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
  const [distance, setDistance] = useState("--");
  const [duration, setDuration] = useState("--");
  const [recenterNonce, setRecenterNonce] = useState<string>("");
  const [travelMode, setTravelMode] = useState<
    "driving" | "running" | "walking"
  >("running");

  const params = useLocalSearchParams<{
    personId?: string;
    action?: string;
    recenter?: string;
  }>();

  // Recenter trigger
  const handleRecenter = () => {
    setRecenterNonce(Math.random().toString());
  };

  // Sync active emergency and handle incoming query parameters when focused
  useFocusEffect(
    React.useCallback(() => {
      // 1. Sync active emergency from globalState
      const globalActiveId = globalState.activeEmergencyId;
      if (globalActiveId) {
        const found = PEOPLE.find((p) => p.id === globalActiveId);
        if (found) {
          setActiveEmergency(found);
        }
      } else {
        setActiveEmergency(null);
      }

      // 2. Handle deep link / parameter changes
      const { personId, action, recenter } = params;

      if (recenter) {
        setSelectedPerson(null);
        globalState.activeEmergencyId = null;
        setActiveEmergency(null);
        setRecenterNonce(recenter);
        router.setParams({ recenter: undefined });
      } else if (personId) {
        const person = PEOPLE.find((p) => p.id === personId);
        if (person) {
          setSelectedPerson(person);
          if (action === "respond") {
            globalState.activeEmergencyId = personId;
            setActiveEmergency(person);
          }
        }
        router.setParams({ personId: undefined, action: undefined });
      }
    }, [params]),
  );

  const handleRespondToggle = () => {
    if (!selectedPerson) return;
    const idStr = selectedPerson.id;

    if (activeEmergency?.id === idStr) {
      globalState.activeEmergencyId = null;
      setActiveEmergency(null);
      Alert.alert(
        "Response Cancelled",
        "You are no longer assigned as a responder to this incident.",
      );
      return;
    }

    // CRITICAL RESPONSE PERMISSION CHECK:
    // If it's a critical emergency and the calculated ETA is greater than 5 minutes, block response assignment
    if (selectedPerson.urgency === "critical") {
      const parsedDuration = parseInt(duration.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedDuration) && parsedDuration > 5) {
        Alert.alert(
          "Too Far to Respond",
          `This critical emergency is too far out for you to respond safely (ETA: ${duration}). Professional emergency services have been dispatched.`,
        );
        return;
      }
    }

    globalState.activeEmergencyId = idStr;
    setActiveEmergency(selectedPerson);
    Alert.alert(
      "Response Assigned",
      "You are now responding to this incident. Follow the active navigation line on the map.",
      [{ text: "OK" }],
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
        recenterNonce={recenterNonce}
        categoryFilter={categoryFilter}
        searchQuery={searchQuery}
        travelMode={travelMode}
        onSelectPerson={(p) => {
          setSelectedPerson(p);
        }}
        onRouteCalculated={(dist, dur) => {
          setDistance(dist);
          setDuration(dur);
        }}
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
              Alert.alert(
                "Filter Settings",
                "Configure your alert monitoring range and notifications.",
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
            bottom: selectedPerson
              ? Platform.OS === "ios"
                ? 355
                : 320
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
            bottom: selectedPerson
              ? Platform.OS === "ios"
                ? 295
                : 260
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

      {/* FLOATING CARD OVERLAY (MapFloatingWindow Component) */}
      {selectedPerson && (
        <MapFloatingWindow
          selectedPerson={selectedPerson}
          activeEmergency={activeEmergency}
          distance={distance}
          duration={duration}
          onClose={() => setSelectedPerson(null)}
          onRespondToggle={handleRespondToggle}
          onOpenDetails={handleOpenDetails}
          travelMode={travelMode}
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
