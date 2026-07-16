import { Person } from "@/constants/interfaces";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PersonCard from "./MapPerson";
type Tab = "My Contacts" | "University" | "Family";
const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Karen Castillo",
    address: "Paradise Regained Hostel",
    avatarColor: "#FF6B6B",
    markerColor: "#FF6B6B",
    latitude: 6.675154753941343,
    longitude: -1.5715685289849886,

    urgency: "critical",
  },
  {
    id: "2",
    name: "Alex Tan",
    address: "Cantonments Road, East Legon",
    avatarColor: "#4ECDC4",
    markerColor: "#4ECDC4",
    latitude: 6.6698627266087405,
    longitude: -1.5611214902241275,
    urgency: "high",
  },
  {
    id: "3",
    name: "Maria Santos",
    address: "Labadi Beach Rd, La",
    avatarColor: "#A78BFA",
    markerColor: "#A78BFA",
    latitude: 5.593,
    longitude: -0.175,
    urgency: "medium",
  },
];

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const TABS_DATA: Record<Tab, Person[]> = {
  "My Contacts": PEOPLE,
  University: [PEOPLE[1], PEOPLE[2]],
  Family: [PEOPLE[0]],
};

const MODAL_PEEK = 0;
const MODAL_OPEN = SCREEN_HEIGHT * 0.55;
const BottomSheetModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  activeTab: Tab;
  selectedPerson: Person | null;
  onSelectPerson: (p: Person) => void;
  distance: string;
  duration: string;
}> = ({ visible, onClose, activeTab, selectedPerson, onSelectPerson }) => {
  const translateY = useRef(new Animated.Value(MODAL_OPEN)).current;
  const lastY = useRef(MODAL_OPEN);

  useEffect(() => {
    const toValue = visible ? 0 : MODAL_OPEN;
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      damping: 22,
      stiffness: 180,
    }).start();
    lastY.current = toValue;
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        translateY.stopAnimation((val) => {
          lastY.current = val;
        });
        translateY.setOffset(lastY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy > 80 || g.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 180,
          }).start();
          lastY.current = 0;
        }
      },
    }),
  ).current;

  const people = TABS_DATA[activeTab];

  return (
    <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY }] }]}>
      {/* Drag Handle */}
      <View {...panResponder.panHandlers} style={sheetStyles.handleArea}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.sheetTitle}>Emergency Requests</Text>
        <Text style={sheetStyles.sheetSub}>
          {people.length} active in {activeTab}
        </Text>
      </View>

      {/* Stat Pills */}
      <View style={sheetStyles.statRow}>
        <View
          style={[
            sheetStyles.statPill,
            { borderColor: "#FF3B3B44", backgroundColor: "#FF3B3B11" },
          ]}
        >
          <View style={[sheetStyles.statDot, { backgroundColor: "#FF3B3B" }]} />
          <Text style={[sheetStyles.statText, { color: "#FF3B3B" }]}>
            {people.filter((p) => p.urgency === "critical").length} Critical
          </Text>
        </View>
        <View
          style={[
            sheetStyles.statPill,
            { borderColor: "#FF950044", backgroundColor: "#FF950011" },
          ]}
        >
          <View style={[sheetStyles.statDot, { backgroundColor: "#FF9500" }]} />
          <Text style={[sheetStyles.statText, { color: "#FF9500" }]}>
            {people.filter((p) => p.urgency === "high").length} High
          </Text>
        </View>
        <View
          style={[
            sheetStyles.statPill,
            { borderColor: "#34C75944", backgroundColor: "#34C75911" },
          ]}
        >
          <View style={[sheetStyles.statDot, { backgroundColor: "#34C759" }]} />
          <Text style={[sheetStyles.statText, { color: "#34C759" }]}>
            {people.filter((p) => p.urgency === "medium").length} Medium
          </Text>
        </View>
      </View>

      {/* Person List */}
      <ScrollView
        style={sheetStyles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {people.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            isSelected={selectedPerson?.id === person.id}
            onPress={() => onSelectPerson(person)}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const sheetStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_OPEN + 20,
    backgroundColor: "#0e1525",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 30,
  },
  handleArea: {
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sheetSub: {
    color: "#4a5568",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default BottomSheetModal;
