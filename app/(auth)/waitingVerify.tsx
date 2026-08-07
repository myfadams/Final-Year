import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export default function WaitingVerify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || "username@gmail.com";

  // Loading spin animation for the middle ring
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.light.background} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Concentric Circles & Shield Icon */}
          <View style={styles.outerRing}>
            {/* Spinning Ring */}
            <Animated.View
              style={[
                styles.middleRing,
                { transform: [{ rotate: spin }] },
              ]}
            />
            {/* Static Inner Circle with Shield */}
            <View style={styles.innerCircle}>
              <Svg width={44} height={44} viewBox="0 0 24 24">
                {/* Left half of the shield filled with deep red */}
                <Path
                  d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12V2z"
                  fill="#af101a"
                  stroke="#af101a"
                  strokeWidth={1}
                />
                {/* Right half of the shield filled with white and outline in deep red */}
                <Path
                  d="M12 2v21c5.16-1.26 9-6.45 9-12V5l-9-3z"
                  fill="#ffffff"
                  stroke="#af101a"
                  strokeWidth={2}
                />
              </Svg>
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.title}>Verifying Your Identity</Text>

          {/* Subtext */}
          <Text style={styles.subtitle}>
            We're quickly verifying your credentials to ensure. An email has
            been sent to <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* Pending Status Badge */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>PENDING</Text>
          </View>
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
  outerRing: {
    width: 172,
    height: 172,
    borderRadius: 86,
    borderWidth: 2,
    borderColor: "#ffccd0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    position: "relative",
  },
  middleRing: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 6,
    borderColor: "rgba(175, 16, 26, 0.12)",
    borderTopColor: "#af101a",
    borderRightColor: "#af101a",
  },
  innerCircle: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    // Subtle shadow for 3D depth effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
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
