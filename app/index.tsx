import {
  checkUserAccountStatus,
  getCachedUserProfile,
  getCurrentUser
} from "@/backend/auth";
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
        // await AsyncStorage.clear()
        const cachedProfile = await getCachedUserProfile();

        const { user } = await getCurrentUser();

        // Check if user is logged in and email is verified
        if (user && (user.email_confirmed_at || cachedProfile?.is_verified)) {
          const accountStatus = await checkUserAccountStatus(user.id);
          if (accountStatus.profile) {
            globalState.userProfile = accountStatus.profile;
          }

          if (accountStatus.exists && accountStatus.isVerified) {
            router.replace("/(resident)/home");
          } else {
            router.replace({
              pathname: "/(auth)/verify",
              params: {
                email: user.email || "",
                fullName: accountStatus.profile?.name || user.user_metadata?.full_name || "",
              },
            });
          }
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
      {/* <HeartBeatWave width={200} color="#AF101A" style={{ marginTop: 24 }} /> */}
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
