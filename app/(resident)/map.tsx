import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

const { width, height } = Dimensions.get("window");

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "My Contacts" | "University" | "Family";

interface Person {
  id: string;
  name: string;
  address: string;
  avatarColor: string;
  markerColor: string;
  x: number;
  y: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Karen Castillo",
    address: "Near Bukit Batok West Avenue 6",
    avatarColor: "#E8829A",
    markerColor: "#E8829A",
    x: 52,
    y: 32,
  },
  {
    id: "2",
    name: "Alex Tan",
    address: "Near Jurong East Street 13",
    avatarColor: "#8FA8C8",
    markerColor: "#8FA8C8",
    x: 60,
    y: 28,
  },
  {
    id: "3",
    name: "Maria Santos",
    address: "Near Bukit Batok West Avenue 2",
    avatarColor: "#E8829A",
    markerColor: "#E8829A",
    x: 38,
    y: 55,
  },
];

// ─── MAP COMPONENT (REAL) ────────────────────────────────────────────────────

const GOOGLE_MAPS_KEY = "YOUR_GOOGLE_API_KEY";

const MapViewComponent: React.FC<{ selectedPerson: Person | null }> = ({
  selectedPerson,
}) => {
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  if (!location || !selectedPerson) {
    return (
      <View
        style={{
          height: height * 0.42,
          backgroundColor: "#eee",
        }}
      />
    );
  }

  const origin = {
    latitude: location.latitude,
    longitude: location.longitude,
  };

  // simple mock offset (replace with real backend coords later)
  const destination = {
    latitude: location.latitude + selectedPerson.y / 10000,
    longitude: location.longitude + selectedPerson.x / 10000,
  };

  return (
    <View style={{ height: height * 0.42 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          ...origin,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        <Marker coordinate={origin} title="You" />

        <Marker coordinate={destination} title={selectedPerson.name} />

        <MapViewDirections
          origin={origin}
          destination={destination}
          apikey={GOOGLE_MAPS_KEY}
          strokeWidth={4}
          strokeColor="#4A90E2"
        />
      </MapView>
    </View>
  );
};

// ─── Person Card ──────────────────────────────────────────────────────────────

const PersonCard: React.FC<{ person: Person; onPress: () => void }> = ({
  person,
  onPress,
}) => {
  const pressAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <TouchableOpacity style={styles.personCard} onPress={onPress}>
        <View style={[styles.avatar, { backgroundColor: person.avatarColor }]}>
          <Text style={styles.avatarInitial}>{person.name.charAt(0)}</Text>
        </View>

        <View style={styles.personInfo}>
          <Text style={styles.personName}>{person.name}</Text>
          <Text style={styles.personAddress}>{person.address}</Text>
        </View>

        <View style={styles.navigateBtn}>
          <Text style={styles.navigateBtnIcon}>▶</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function LocationScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("My Contacts");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(
    PEOPLE[0],
  );

  const tabs: Tab[] = ["My Contacts", "University", "Family"];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Location</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* REAL MAP */}
      <MapViewComponent selectedPerson={selectedPerson} />

      {/* People */}
      <View style={styles.peopleSection}>
        <Text style={styles.sectionTitle}>People</Text>

        <ScrollView>
          {PEOPLE.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              onPress={() => setSelectedPerson(p)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── STYLES (unchanged except map removed) ────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 24,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
  },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: "#000",
  },
  tabText: {},
  tabTextActive: {
    color: "#fff",
  },

  peopleSection: {
    flex: 1,
    padding: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  personCard: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    color: "#fff",
    fontWeight: "700",
  },

  personInfo: {
    flex: 1,
    marginLeft: 10,
  },

  personName: {
    fontWeight: "700",
  },

  personAddress: {
    fontSize: 12,
    color: "#666",
  },

  navigateBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  navigateBtnIcon: {
    color: "#fff",
  },
});
