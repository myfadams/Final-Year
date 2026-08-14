import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { subscribeToCurrentRespondingEmergency } from "@/backend/emergencies";
import { globalState } from "@/constants/globalState";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Start active responding emergency realtime listener to update globalState
    const unsubscribeResponding = subscribeToCurrentRespondingEmergency((data) => {
      globalState.activeEmergencyId = data?.emergency?.id || null;
      globalState.activeEmergencyPerson = data?.person || null;
    });

    // Suppress redbox popups for network connection errors when offline
    if (typeof global !== "undefined" && (global as any).ErrorUtils) {
      const defaultHandler = (global as any).ErrorUtils.getGlobalHandler?.();
      (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        const msg = String(error?.message || error);
        if (
          msg.includes("Network request failed") ||
          msg.includes("Failed to fetch") ||
          msg.includes("TypeError: Network request failed")
        ) {
          console.warn("⚡ Network offline notice:", msg);
          return;
        }
        if (defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
    }

    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
    console.log("Fonts loaded:", fontsLoaded);

    return () => {
      unsubscribeResponding();
    };
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(resident)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="settingsPage" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="report" />
      <Stack.Screen name="incidentsDetails" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="contactChat" />
      <Stack.Screen name="emergencyChat" />
      <Stack.Screen name="yourEmergencies" />
    </Stack>
  );
}
