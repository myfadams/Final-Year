import { getCachedUserProfile, getCurrentUser, getUserProfile } from "@/backend/auth";
import { subscribeToCurrentRespondingEmergency } from "@/backend/emergencies";
import AnimatedEmergencyLogo from "@/components/AnimatedEmergencyLogo";
import { globalState } from "@/constants/globalState";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Realtime subscription for active responding emergency
    const unsubscribe = subscribeToCurrentRespondingEmergency((data) => {
      globalState.activeEmergencyId = data?.emergency?.id || null;
      globalState.activeEmergencyPerson = data?.person || null;
    });
    async function checkAuthAndNavigate() {
      try {
        // Pre-warm cache
        const cachedProfile = await getCachedUserProfile();

        const { user } = await getCurrentUser();

        // Check if user is logged in and email is verified
        if (user && (user.email_confirmed_at || cachedProfile?.is_verified)) {
          const { profile } = await getUserProfile(user.id);
          if (profile) {
            globalState.userProfile = profile;
          }
          router.replace("/(resident)/home");
        } else {
          router.replace("/(auth)/login");
        }
      } catch (err) {
        console.error("Error checking initial auth state:", err);
        router.replace("/(auth)/login");
      }
    }

    checkAuthAndNavigate();

    return () => {
      unsubscribe();
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <AnimatedEmergencyLogo size={220} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
