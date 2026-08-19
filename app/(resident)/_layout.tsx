import CustomTabBar from "@/components/CustomTabBar";
import { useEmergencyNotificationWatcher } from "@/components/notifications/useEmergencyNotificationWatcher";
import { Tabs } from "expo-router";

export default function ResidentLayout() {
  useEmergencyNotificationWatcher();

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
        name="news"
        options={{
          title: "News",
        }}
      />
    </Tabs>
  );
}
