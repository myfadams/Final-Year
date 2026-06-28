import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MapViewComponent from "@/components/MapViewComponent";
import Colors from "@/constants/Colors";
import { Person } from "@/constants/interfaces";
import { PEOPLE } from "@/constants/tempData";
import BottomSheetModal from "../../components/MapModal";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const MODAL_PEEK = 0;
const MODAL_OPEN = SCREEN_HEIGHT * 0.55;

type Tab = "My Contacts" | "University" | "Family";

const TABS_DATA: Record<Tab, Person[]> = {
  "My Contacts": PEOPLE,
  University: [PEOPLE[1], PEOPLE[2]],
  Family: [PEOPLE[0]],
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
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(
    PEOPLE[0],
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [distance, setDistance] = useState("--");
  const [duration, setDuration] = useState("--");

  const tabs: Tab[] = ["My Contacts", "University", "Family"];

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
      <MapViewComponent selectedPerson={selectedPerson} />

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
                {
                  backgroundColor:
                    Colors.URGENCY_COLORS[selectedPerson.urgency],
                },
              ]}
            />
            <Text
              style={[
                styles.routeValue,
                {
                  fontSize: 11,
                  color: Colors.URGENCY_COLORS[selectedPerson.urgency],
                },
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
          setModalVisible(false);
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

const mapStyles = StyleSheet.create({
  responderWrapper: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  responderCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0a0f1e",
  },
  victimCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0a0f1e",
  },
});
