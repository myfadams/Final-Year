import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import { House, Map, Megaphone, User, Users } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ConnectBottomBar: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.push("/(resident)/home")}
        activeOpacity={0.7}
      >
        <House size={22} color="#71717A" strokeWidth={1.8} />
        <Text style={styles.tabLabel}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.push("/(resident)/alerts")}
        activeOpacity={0.7}
      >
        <Megaphone size={22} color="#71717A" strokeWidth={1.8} />
        <Text style={styles.tabLabel}>Alerts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.push("/(resident)/map")}
        activeOpacity={0.7}
      >
        <Map size={22} color="#71717A" strokeWidth={1.8} />
        <Text style={styles.tabLabel}>Map</Text>
      </TouchableOpacity>

      {/* Selected Tab: Contacts */}
      <TouchableOpacity
        style={styles.activeTabItem}
        onPress={() => router.push("/(resident)/contacts")}
        activeOpacity={0.8}
      >
        <View style={styles.activePill}>
          <Users size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.activeTabLabel}>Contacts</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.push("/profile")}
        activeOpacity={0.7}
      >
        <User size={22} color="#71717A" strokeWidth={1.8} />
        <Text style={styles.tabLabel}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: "#71717A",
    marginTop: 4,
  },
  activeTabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D32F2F",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  activeTabLabel: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
});

export default ConnectBottomBar;
