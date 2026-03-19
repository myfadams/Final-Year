import Colors from "@/constants/Colors";
import { Tabs } from "expo-router";
import { House, Map, Megaphone, UserPen } from "lucide-react-native";

export default function ResidentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.accent,
        tabBarInactiveTintColor: Colors.light.primaryDark,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            // <Ionicons name="home" size={size} color={color} />
            <House size={size} color={color} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />

      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size, focused }) => (
            // <Ionicons name="alert-circle" size={size} color={color} />
            <Megaphone
              size={size}
              color={color}
              strokeWidth={focused ? 2.6 : 2}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            // <Ionicons name="person" size={size} color={color} />
            <UserPen
              size={size}
              color={color}
              strokeWidth={focused ? 2.6 : 2}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size, focused }) => (
            // <Ionicons name="person" size={size} color={color} />
            <Map size={size} color={color} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
