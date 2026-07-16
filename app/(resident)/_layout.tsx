import CustomTabBar from "@/components/CustomTabBar";
import { Tabs } from "expo-router";
// import CustomTabBar from "@/components/CustomTabBar";

export default function ResidentLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
        }}
      />

      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
