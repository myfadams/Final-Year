import { resetPassword } from "@/backend/auth";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react-native";
import React, { useState } from "react";
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

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const { error: resetError } = await resetPassword(email.trim());
      if (resetError) {
        setError(resetError);
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
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text
          style={{
            color: Colors.light.text,
            fontFamily: typography.medium,
            fontSize: 20,
            marginLeft: 8,
          }}
        >
          Back to Login
        </Text>
      </View>

      <View style={{ marginBottom: 30 }}>
        <Text
          style={{
            color: Colors.light.text,
            fontFamily: typography.bold,
            fontSize: 28,
            marginBottom: 10,
          }}
        >
          Reset Password
        </Text>
        <Text
          style={{
            color: Colors.light.text,
            fontFamily: typography.regular,
            fontSize: 16,
            opacity: 0.7,
          }}
        >
          Enter your email address and we'll send you a link to reset your password.
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
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#D1FAE5",
              borderColor: "#10B981",
              borderWidth: 1,
              borderRadius: 10,
              padding: 12,
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                color: "#065F46",
                fontFamily: typography.medium,
              }}
            >
              If an account with that email exists, we have sent a password reset link.
            </Text>
          </View>
        ) : null}

        <CustomInput
          placeholder="Enter your Email"
          Icon={<Mail size={19} color={"#000"} strokeWidth={1.5} />}
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null);
          }}
          autoCapitalize="none"
        />

        <CustomButton
          text={"Send Reset Link"}
          onPress={handleResetPassword}
          disabled={isLoading}
          isLoading={isLoading}
        />
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
