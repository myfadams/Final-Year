import React, { useState } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BottomSheetModal from "@/components/MapModal";
import MapViewComponent from "@/components/MapViewComponent";
import { globalState } from "@/constants/globalState";
import { Person } from "@/constants/interfaces";
import { PEOPLE } from "@/constants/tempData";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

// =====================================================
// TYPES
// =====================================================
type Tab = "My Contacts" | "University" | "Family";

// =====================================================
// MOCK DATA
// =====================================================

const TABS_DATA: Record<Tab, Person[]> = {
  "My Contacts": PEOPLE,
  University: [PEOPLE[1], PEOPLE[2], PEOPLE[3]],
  Family: [PEOPLE[0], PEOPLE[4]],
};

const URGENCY_COLORS = {
  critical: "#FF3B3B",
  high: "#FF9500",
  medium: "#34C759",
};

const URGENCY_LABELS = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
};

// =====================================================
// MAIN SCREEN
// =====================================================
export default function LocationScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("My Contacts");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeEmergency, setActiveEmergency] = useState<Person | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [distance, setDistance] = useState("--");
  const [duration, setDuration] = useState("--");
  const [recenterNonce, setRecenterNonce] = useState<string>("");

  const tabs: Tab[] = ["My Contacts", "University", "Family"];
  const params = useLocalSearchParams<{
    personId?: string;
    action?: string;
    recenter?: string;
  }>();

  // Handle tab bar double-press recenter
  React.useEffect(() => {
    if (params.recenter) {
      setSelectedPerson(null);
      setModalVisible(false);
      globalState.activeEmergencyId = null;
      setActiveEmergency(null);
      setRecenterNonce(params.recenter);
      // Clear the param so it doesn't re-trigger
      router.setParams({ recenter: undefined });
    }
  }, [params.recenter]);

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
      const { personId, action } = params;
      if (personId) {
        const person = PEOPLE.find((p) => p.id === personId);
        if (person) {
          setSelectedPerson(person);
          setModalVisible(true);

          if (action === "respond") {
            globalState.activeEmergencyId = personId;
            setActiveEmergency(person);
          }
        }
        // Clear params so it doesn't re-trigger on subsequent tab focus
        router.setParams({ personId: undefined, action: undefined });
      }
    }, [params]),
  );

  const handleTabPress = (tab: Tab) => {
    if (activeTab === tab && modalVisible) {
      setModalVisible(false);
    } else {
      setActiveTab(tab);
      setModalVisible(true);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* FULL SCREEN MAP */}
      <MapViewComponent
        selectedPerson={selectedPerson}
        activeEmergency={activeEmergency}
        recenterNonce={recenterNonce}
        onSelectPerson={(p) => {
          setSelectedPerson(p);
          setModalVisible(true);
        }}
        onRouteCalculated={(dist, dur) => {
          setDistance(dist);
          setDuration(dur);
        }}
      />

      {/* TOP GRADIENT OVERLAY */}
      <View style={styles.topOverlay} pointerEvents="none" />

      {/* HEADER */}
      <View style={styles.header} pointerEvents="box-none">
        <View>
          <Text style={styles.headerEyebrow}>EMERGENCY</Text>
          <Text style={styles.headerTitle}>Navigation</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* ROUTE CARD (floating) */}
      {selectedPerson && (
        <View style={styles.routeCard}>
          <View style={styles.routeLeft}>
            <Text style={styles.routeLabel}>DISTANCE</Text>
            <Text style={styles.routeValue}>{distance}</Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeLeft}>
            <Text style={styles.routeLabel}>ETA</Text>
            <Text style={styles.routeValue}>{duration}</Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeLeft}>
            <View
              style={[
                styles.urgencyDot2,
                { backgroundColor: URGENCY_COLORS[selectedPerson.urgency] },
              ]}
            />
            <Text
              style={[
                styles.routeValue,
                { fontSize: 11, color: URGENCY_COLORS[selectedPerson.urgency] },
              ]}
            >
              {URGENCY_LABELS[selectedPerson.urgency]}
            </Text>
          </View>
        </View>
      )}

      {/* FLOATING TAB BUTTONS */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab && modalVisible;
          const count = TABS_DATA[tab].length;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}
              >
                {tab}
              </Text>
              <View
                style={[styles.tabCount, isActive && styles.tabCountActive]}
              >
                <Text
                  style={[
                    styles.tabCountText,
                    isActive && styles.tabCountTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* BOTTOM SHEET MODAL */}
      <BottomSheetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        activeTab={activeTab}
        selectedPerson={selectedPerson}
        onSelectPerson={(p) => {
          setSelectedPerson(p);
        }}
        activeEmergency={activeEmergency}
        onAcceptEmergency={(p) => {
          globalState.activeEmergencyId = p.id;
          setActiveEmergency(p);
        }}
        onCancelEmergency={() => {
          globalState.activeEmergencyId = null;
          setActiveEmergency(null);
        }}
        distance={distance}
        duration={duration}
      />
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0f1e",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 32,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerEyebrow: {
    color: "#4ECDC4",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 2,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerRight: {
    alignItems: "flex-end",
    marginTop: 6,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF3B3B22",
    borderWidth: 1,
    borderColor: "#FF3B3B55",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF3B3B",
  },
  liveText: {
    color: "#FF3B3B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  routeCard: {
    position: "absolute",
    top: Platform.OS === "ios" ? 148 : 120,
    left: 20,
    right: 20,
    backgroundColor: "rgba(10,15,30,0.75)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  routeLeft: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  routeLabel: {
    color: "#4a5568",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
  },
  routeValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  routeDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  urgencyDot2: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabRow: {
    position: "absolute",
    bottom: 36,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(10,15,30,0.8)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
  },
  tabBtnActive: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
  tabBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  tabBtnTextActive: {
    color: "#0a0f1e",
  },
  tabCount: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tabCountActive: {
    backgroundColor: "rgba(10,15,30,0.2)",
  },
  tabCountText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    fontWeight: "800",
  },
  tabCountTextActive: {
    color: "#0a0f1e",
  },
});
