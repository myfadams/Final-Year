import { resendVerificationEmail } from "@/backend/auth";
import { supabase } from "@/backend/supabaseConfig";
import AnimatedEmergencyLogo from "@/components/AnimatedEmergencyLogo";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { showPopupAlert } from "@/components/popupAlert";
import {
  Animated,
  AppState,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

const POLL_INTERVAL_MS = 3000;

export default function WaitingVerify() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    password?: string;
    fullName?: string;
  }>();

  const [email, setEmail] = useState<string>(params.email || "");
  const [password, setPassword] = useState<string>(params.password || "");
  const [fullName, setFullName] = useState<string>(params.fullName || "");
  const [isChecking, setIsChecking] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  const displayEmail = email || params.email || "";

  const handleResendEmail = async () => {
    const targetEmail = displayEmail;
    if (!targetEmail) return;

    setIsResendingEmail(true);
    try {
      const { error } = await resendVerificationEmail(targetEmail);
      if (error) {
        showPopupAlert("Resend Failed", error, undefined, undefined, "error");
      } else {
        showPopupAlert(
          "Email Resent",
          `A new verification link has been sent to ${targetEmail}. Please check your inbox and spam folder.`,
          undefined,
          undefined,
          "success"
        );
      }
    } catch (err: any) {
      showPopupAlert(
        "Error",
        err?.message || "Failed to resend verification email.",
        undefined,
        undefined,
        "error"
      );
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Load saved credentials from AsyncStorage if params were not passed
  useEffect(() => {
    async function loadStoredCredentials() {
      try {
        const stored = await AsyncStorage.getItem(
          "@pending_verify_credentials",
        );
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!email && parsed.email) setEmail(parsed.email);
          if (!password && parsed.password) setPassword(parsed.password);
          if (!fullName && parsed.fullName) setFullName(parsed.fullName);
        }
      } catch (e) {
        console.error("Failed to load pending credentials:", e);
      }
    }
    loadStoredCredentials();
  }, [email, password, fullName]);

  // Loading spin animation for the middle ring
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Guard so we only navigate once, even if multiple checks resolve true
  const hasNavigatedRef = useRef(false);

  const navigateToVerify = async () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    try {
      await AsyncStorage.removeItem("@pending_verify_credentials");
    } catch (e) { }
    router.replace({
      pathname: "/(auth)/verify",
      params: {
        email: email || params.email || "",
        fullName: fullName || params.fullName || "",
        password: password || params.password || "",
      },
    });
  };

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleDeepLinkUrl = async (url: string | null) => {
    if (!url || hasNavigatedRef.current) return;

    try {
      let accessToken: string | undefined;
      let refreshToken: string | undefined;
      let code: string | undefined;

      if (url.includes("#")) {
        const hashString = url.split("#")[1];
        const searchParams = new URLSearchParams(hashString);
        accessToken = searchParams.get("access_token") || undefined;
        refreshToken = searchParams.get("refresh_token") || undefined;
      }

      const parsed = Linking.parse(url);
      if (!accessToken && parsed.queryParams) {
        accessToken = (parsed.queryParams.access_token as string) || undefined;
        refreshToken =
          (parsed.queryParams.refresh_token as string) || undefined;
        code = (parsed.queryParams.code as string) || undefined;
      }

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && data.session?.user) {
          await navigateToVerify();
          return;
        }
      } else if (code) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.session?.user) {
          await navigateToVerify();
          return;
        }
      }
    } catch (err) {
      console.error("Error handling deep link URL:", err);
    }
  };

  // Poll Supabase to see if the user has confirmed their email yet.
  const checkVerified = async (isManual = false) => {
    if (hasNavigatedRef.current) return;
    if (isManual) setIsChecking(true);

    try {
      // 1. Try refreshing current session from Supabase backend
      try {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session?.user?.email_confirmed_at) {
          await navigateToVerify();
          return;
        }
      } catch (e) { }

      // 2. Try getUser() directly
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.email_confirmed_at) {
          await navigateToVerify();
          return;
        }
      } catch (e) { }

      // 3. Attempt signInWithPassword with credentials.
      // Supabase will allow sign-in as soon as the email is verified.
      const activeEmail = email || params.email;
      const activePassword = password || params.password;

      if (activeEmail && activePassword) {
        try {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: activeEmail,
              password: activePassword,
            });

          if (!signInError && signInData?.user) {
            await navigateToVerify();
            return;
          }
        } catch (e) { }
      }

      if (isManual) {
        showPopupAlert(
          "Verification Pending",
          `We could not confirm your email verification yet. Please tap the verification link sent to ${activeEmail || "your email"} and try again.`,
          [{ text: "OK" }],
          undefined,
          "warning"
        );
      }
    } finally {
      if (isManual) setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check initial deep link URL if app was launched via link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLinkUrl(url);
    });

    // Listen for incoming deep link URLs while app is open
    const linkingSub = Linking.addEventListener("url", (event) => {
      if (event.url) handleDeepLinkUrl(event.url);
    });

    // Check immediately on mount, then on an interval.
    checkVerified();
    const intervalId = setInterval(
      () => checkVerified(false),
      POLL_INTERVAL_MS,
    );

    // Listen for auth state changes (e.g. session update after email confirmation)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.email_confirmed_at && !hasNavigatedRef.current) {
          navigateToVerify();
        }
      },
    );

    // Also check right away whenever the app comes back to the foreground
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkVerified(false);
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
      linkingSub.remove();
      authListener?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.light.background} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Animated Emergency Logo Loading */}
          <View style={styles.logoContainer}>
            <AnimatedEmergencyLogo size={220} />
          </View>

          {/* Heading */}
          <Text style={styles.title}>Verifying Your Identity</Text>

          {/* Subtext */}
          <Text style={styles.subtitle}>
            We're quickly verifying your credentials. An email has been sent to{" "}
            <Text style={styles.emailText}>{displayEmail}</Text>
          </Text>

          {/* Pending Status Badge */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>PENDING</Text>
          </View>

          {/* Manual Check Button */}
          <TouchableOpacity
            style={styles.manualCheckButton}
            onPress={() => checkVerified(true)}
            disabled={isChecking}
          >
            <Text style={styles.manualCheckButtonText}>
              {isChecking ? "Checking Status..." : "I've Confirmed My Email"}
            </Text>
          </TouchableOpacity>

          {/* Resend Verification Email Button */}
          <TouchableOpacity
            style={{ marginTop: 14, paddingVertical: 8, paddingHorizontal: 16 }}
            onPress={handleResendEmail}
            disabled={isResendingEmail || isChecking}
          >
            <Text
              style={{
                fontFamily: typography.medium,
                fontSize: 14,
                color: Colors.light.accent,
                textAlign: "center",
              }}
            >
              {isResendingEmail
                ? "Resending Email..."
                : "Didn't receive email? Resend"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back action at the bottom */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 26,
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 22,
    color: "#5b403d",
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  emailText: {
    fontFamily: typography.medium,
    color: Colors.light.text,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#af101a",
    marginRight: 8,
  },
  badgeText: {
    fontFamily: typography.semibold,
    fontSize: 12,
    color: "#4b5563",
    letterSpacing: 0.5,
  },
  manualCheckButton: {
    marginTop: 24,
    backgroundColor: "#af101a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  manualCheckButtonText: {
    fontFamily: typography.semibold,
    fontSize: 14,
    color: "#ffffff",
  },
  footer: {
    paddingBottom: 24,
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontFamily: typography.medium,
    fontSize: 15,
    color: Colors.light.accent,
  },
});
