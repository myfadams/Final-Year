import { supabase } from "@/backend/supabaseConfig";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AlertCircle, KeyRound } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const hasAttemptedSetSession = useRef(false);

  useEffect(() => {
    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLinkUrl(url);
    });

    const linkingSub = Linking.addEventListener("url", (event) => {
      if (event.url) handleDeepLinkUrl(event.url);
    });

    return () => {
      linkingSub.remove();
    };
  }, []);

  const handleDeepLinkUrl = async (url: string | null) => {
    if (!url || hasAttemptedSetSession.current) return;

    try {
      let accessToken: string | undefined;
      let refreshToken: string | undefined;
      let type: string | undefined;

      if (url.includes("#")) {
        const hashString = url.split("#")[1];
        const searchParams = new URLSearchParams(hashString);
        accessToken = searchParams.get("access_token") || undefined;
        refreshToken = searchParams.get("refresh_token") || undefined;
        type = searchParams.get("type") || undefined;
      }

      if (accessToken && refreshToken && type === "recovery") {
        hasAttemptedSetSession.current = true;
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    } catch (err) {
      console.error("Error setting session from recovery link:", err);
    }
  };

  const handleUpdatePassword = async () => {
    setError(null);
    setSuccess(false);

    if (!password) {
      setError("Please enter a new password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      if (updateError) {
        setError(updateError.message || "Failed to update password.");
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollContent = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 30, marginTop: 40 }}>
        <Text
          style={{
            color: Colors.light.text,
            fontFamily: typography.bold,
            fontSize: 28,
            marginBottom: 10,
          }}
        >
          Create New Password
        </Text>
        <Text
          style={{
            color: Colors.light.text,
            fontFamily: typography.regular,
            fontSize: 16,
            opacity: 0.7,
          }}
        >
          Your new password must be different from previous used passwords.
        </Text>
      </View>

      <View style={styles.inputView}>
        {error ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FEE2E2",
              borderColor: Colors.light.error,
              borderWidth: 1,
              borderRadius: 10,
              padding: 12,
              gap: 8,
              marginBottom: 8,
            }}
          >
            <AlertCircle size={18} color={Colors.light.error} />
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                color: Colors.light.error,
                fontFamily: typography.medium,
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {success ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 20
            }}
          >
            <View
              style={{
                backgroundColor: "#D1FAE5",
                borderColor: "#10B981",
                borderWidth: 1,
                borderRadius: 10,
                padding: 16,
                marginBottom: 24,
                width: "100%"
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: "#065F46",
                  fontFamily: typography.medium,
                  textAlign: "center",
                }}
              >
                Password reset successful! You can now log in with your new password.
              </Text>
            </View>
            <CustomButton
              text="Go to Login"
              onPress={() => router.replace("/(auth)/login")}
            />
          </View>
        ) : (
          <>
            <CustomInput
              placeholder="Enter New Password"
              Icon={<KeyRound size={19} color={"#000"} strokeWidth={1.5} />}
              PasswordIcon={true}
              label="New Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              autoCapitalize="none"
            />

            <CustomInput
              placeholder="Confirm New Password"
              Icon={<KeyRound size={19} color={"#000"} strokeWidth={1.5} />}
              PasswordIcon={true}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setError(null);
              }}
              autoCapitalize="none"
            />

            <CustomButton
              text="Reset Password"
              onPress={handleUpdatePassword}
              disabled={isLoading}
              isLoading={isLoading}
            />
          </>
        )}
      </View>
    </ScrollView>
  );

  return (
    <>
      <StatusBar style="dark" backgroundColor={"#fff"} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        {Platform.OS === "ios" ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior="padding"
          >
            {scrollContent}
          </KeyboardAvoidingView>
        ) : (
          scrollContent
        )}
      </SafeAreaView>
    </>
  );
}
