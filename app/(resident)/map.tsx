import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import axios from "axios";
import * as Location from "expo-location";

import MapView, { Marker, Polyline } from "react-native-maps";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const MODAL_PEEK = 0;
const MODAL_OPEN = SCREEN_HEIGHT * 0.55;

// =====================================================
// CONFIG
// =====================================================

const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY;

// =====================================================
// TYPES
// =====================================================

type Tab = "My Contacts" | "University" | "Family";

interface Person {
  id: string;
  name: string;
  address: string;
  avatarColor: string;
  markerColor: string;
  latitude: number;
  longitude: number;
  urgency: "critical" | "high" | "medium";
}

// =====================================================
// MOCK DATA
// =====================================================

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Karen Castillo",
    address: "12 Accra Ring Road, Osu",
    avatarColor: "#FF6B6B",
    markerColor: "#FF6B6B",
    latitude: 5.603717,
    longitude: -0.186964,
    urgency: "critical",
  },
  {
    id: "2",
    name: "Alex Tan",
    address: "Cantonments Road, East Legon",
    avatarColor: "#4ECDC4",
    markerColor: "#4ECDC4",
    latitude: 5.615,
    longitude: -0.195,
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

const TABS_DATA: Record<Tab, Person[]> = {
  "My Contacts": PEOPLE,
  University: [PEOPLE[1], PEOPLE[2]],
  Family: [PEOPLE[0]],
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
// PULSE ANIMATION COMPONENT
// =====================================================

const PulseRing: React.FC<{ color: string }> = ({ color }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 2.2,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
};

// =====================================================
// MAP COMPONENT
// =====================================================

const MapViewComponent: React.FC<{ selectedPerson: Person | null }> = ({
  selectedPerson,
}) => {
  const [location, setLocation] = useState<any>(null);
  const [victimLocation, setVictimLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  const watchRef = useRef<any>(null);
  const victimInterval = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const current = await Location.getCurrentPositionAsync({});
      setLocation(current.coords);
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 2,
        },
        (loc) => setLocation(loc.coords),
      );
    })();
    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!selectedPerson) return;
    setVictimLocation({
      latitude: selectedPerson.latitude,
      longitude: selectedPerson.longitude,
    });
    victimInterval.current = setInterval(() => {
      setVictimLocation((prev: any) => {
        if (!prev) return prev;
        return {
          latitude: prev.latitude + (Math.random() - 0.5) * 0.0004,
          longitude: prev.longitude + (Math.random() - 0.5) * 0.0004,
        };
      });
    }, 3000);
    return () => {
      if (victimInterval.current) clearInterval(victimInterval.current);
    };
  }, [selectedPerson]);

  useEffect(() => {
    if (!location || !victimLocation) return;
    fetchRoute();
  }, [location, victimLocation]);

  const fetchRoute = async () => {
    try {
      const response = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          coordinates: [
            [location.longitude, location.latitude],
            [victimLocation.longitude, victimLocation.latitude],
          ],
        },
        {
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
        },
      );
      const feature = response.data.features[0];
      const coords = feature.geometry.coordinates.map(
        ([lng, lat]: number[]) => ({
          latitude: lat,
          longitude: lng,
        }),
      );
      setRouteCoords(coords);
      const summary = feature.properties.summary;
      setDistance(`${(summary.distance / 1000).toFixed(1)} km`);
      setDuration(`${Math.ceil(summary.duration / 60)} min`);
    } catch (error) {
      console.log("ORS Error:", error);
      // console.log(ORS_API_KEY);
    }
  };

  if (!location) {
    return <View style={StyleSheet.absoluteFillObject} />;
  }

  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      }}
      customMapStyle={darkMapStyle}
      showsUserLocation={false}
    >
      <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={mapStyles.responderWrapper}>
          <PulseRing color="#4ECDC4" />
          <View style={mapStyles.responderCore}>
            <Text style={{ fontSize: 18 }}>🚑</Text>
          </View>
        </View>
      </Marker>

      {victimLocation && selectedPerson && (
        <Marker coordinate={victimLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={mapStyles.responderWrapper}>
            <PulseRing color={selectedPerson.avatarColor} />
            <View
              style={[
                mapStyles.victimCore,
                { backgroundColor: selectedPerson.avatarColor },
              ]}
            >
              <Text style={{ fontSize: 18 }}>🆘</Text>
            </View>
          </View>
        </Marker>
      )}

      {routeCoords.length > 0 && (
        <>
          <Polyline
            coordinates={routeCoords}
            strokeWidth={12}
            strokeColor="rgba(78,205,196,0.15)"
          />
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#4ECDC4"
          />
        </>
      )}
    </MapView>
  );
};

// =====================================================
// PERSON CARD
// =====================================================

const PersonCard: React.FC<{
  person: Person;
  isSelected: boolean;
  onPress: () => void;
}> = ({ person, isSelected, onPress }) => {
  const urgencyColor = URGENCY_COLORS[person.urgency];

  return (
    <TouchableOpacity
      style={[cardStyles.card, isSelected && cardStyles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[cardStyles.urgencyBar, { backgroundColor: urgencyColor }]}
      />

      <View
        style={[
          cardStyles.avatar,
          {
            backgroundColor: person.avatarColor + "22",
            borderColor: person.avatarColor + "55",
          },
        ]}
      >
        <Text style={[cardStyles.avatarInitial, { color: person.avatarColor }]}>
          {person.name.charAt(0)}
        </Text>
      </View>

      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{person.name}</Text>
        <Text style={cardStyles.address}>{person.address}</Text>
      </View>

      <View style={cardStyles.right}>
        <View
          style={[
            cardStyles.urgencyBadge,
            {
              backgroundColor: urgencyColor + "22",
              borderColor: urgencyColor + "44",
            },
          ]}
        >
          <View
            style={[cardStyles.urgencyDot, { backgroundColor: urgencyColor }]}
          />
          <Text style={[cardStyles.urgencyText, { color: urgencyColor }]}>
            {URGENCY_LABELS[person.urgency]}
          </Text>
        </View>
        <View
          style={[
            cardStyles.navBtn,
            { backgroundColor: isSelected ? "#4ECDC4" : "#ffffff18" },
          ]}
        >
          <Text
            style={{
              color: isSelected ? "#0a0f1e" : "#fff",
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {isSelected ? "ACTIVE" : "▶"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// =====================================================
// BOTTOM SHEET MODAL
// =====================================================

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
        contentContainerStyle={{ paddingBottom: 40 }}
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
          setModalVisible(false);
        }}
        distance={distance}
        duration={duration}
      />
    </View>
  );
}

// =====================================================
// DARK MAP STYLE
// =====================================================

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0a0f1e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1e" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a2035" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#1e2a42" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#243050" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2d3a5c" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1a2e" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0e1525" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#12192e" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#0c1220" }],
  },
];

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

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    gap: 12,
  },
  cardSelected: {
    backgroundColor: "rgba(78,205,196,0.07)",
    borderColor: "rgba(78,205,196,0.25)",
  },
  urgencyBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  address: {
    color: "#4a6a8a",
    fontSize: 11,
    fontWeight: "500",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  urgencyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  navBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 44,
    alignItems: "center",
  },
});
