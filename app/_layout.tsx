import { subscribeToCurrentRespondingEmergency } from "@/backend/emergencies";
import { ResQColors } from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { NetworkProvider } from "@/components/network";
import { NotificationBadgeProvider } from "@/components/notifications/NotificationBadgeContext";
import { PopupAlertProvider } from "@/components/popupAlert";
import { SosAlertProvider } from "@/components/sos/SosAlertContext";
import { SosAlertOverlay } from "@/components/sos/SosAlertOverlay";
import { WalkSafeProvider } from "@/components/WalkSafeContext";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Start active responding emergency realtime listener to update globalState
    const unsubscribeResponding = subscribeToCurrentRespondingEmergency(
      (data) => {
        globalState.activeEmergencyId = data?.emergency?.id || null;
        globalState.activeEmergencyPerson = data?.person || null;
      },
    );

    return () => {
      unsubscribeResponding();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }
  return (
    <NetworkProvider>
      {/* App-wide default: primary-color status bar with white content. The entire (auth) group
          (login, register, verify, waitingVerify, forgot/reset-password) and the map screen
          manage their own StatusBar and are left with their existing look — expo-status-bar
          merges multiple mounted instances, with the most specific/recently-updated one
          winning, so those screens' own overrides take priority over this default. */}
      <StatusBar style="dark" backgroundColor={ResQColors.primaryRed} />
      <PopupAlertProvider>
        <WalkSafeProvider>
          <SosAlertProvider>
            <NotificationBadgeProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(resident)" />
                <Stack.Screen name="(admin)" />
                <Stack.Screen name="settingsPage" />
                <Stack.Screen name="notificationsPage" />
                <Stack.Screen name="notificationPreferencesPage" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="report" />
                <Stack.Screen name="IncidentDetails" />
                <Stack.Screen name="connect" />
                <Stack.Screen name="contactChat" />
                <Stack.Screen name="emergencyChat" />
                <Stack.Screen name="yourEmergencies" />
              </Stack>
              <SosAlertOverlay />
            </NotificationBadgeProvider>
          </SosAlertProvider>
        </WalkSafeProvider>
      </PopupAlertProvider>
    </NetworkProvider>
  );
}
