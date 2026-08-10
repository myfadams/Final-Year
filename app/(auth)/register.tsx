import AsyncStorage from "@react-native-async-storage/async-storage";
import { signUpUser } from "@/backend/auth";
import AlternativeLogin from "@/components/AlternativeLogin";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import { AlertCircle, KeyRound, Mail, User } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { styles } from "./styles";

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function SignUp() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [userDetails, setUserDetails] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!userDetails.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (userDetails.fullName.trim().length < 2) {
      newErrors.fullName = "Please enter your full name";
    }

    if (!userDetails.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(userDetails.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!userDetails.password) {
      newErrors.password = "Password is required";
    } else if (userDetails.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!userDetails.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (userDetails.password !== userDetails.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    setErrors({});
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await signUpUser(
        userDetails.email.trim(),
        userDetails.password,
        userDetails.fullName.trim()
      );

      if (error) {
        const lowerError = error.toLowerCase();

        // 1. Email field specific errors
        if (
          lowerError.includes("already registered") ||
          lowerError.includes("user already exists") ||
          lowerError.includes("already in use")
        ) {
          setErrors({ email: "An account with this email already exists" });
        } else if (
          lowerError.includes("invalid email") ||
          lowerError.includes("email address is invalid")
        ) {
          setErrors({ email: "Please enter a valid email address" });
        }
        // 2. Password field specific errors
        else if (
          lowerError.includes("password should be") ||
          lowerError.includes("password is too weak") ||
          lowerError.includes("password must be")
        ) {
          setErrors({ password: error });
        }
        // 3. Rate limits or system/server errors -> Display popup Alert
        else {
          Alert.alert("Sign Up Notice", error, [{ text: "OK" }]);
          console.log("Sign up notice:", error);
        }
        return;
      }

      await AsyncStorage.setItem(
        "@pending_verify_credentials",
        JSON.stringify({
          email: userDetails.email.trim(),
          password: userDetails.password,
          fullName: userDetails.fullName.trim(),
        })
      );

      router.navigate({
        pathname: "/(auth)/waitingVerify",
        params: {
          email: userDetails.email.trim(),
          password: userDetails.password,
          fullName: userDetails.fullName.trim(),
        },
      });
    } catch (err: any) {
      console.error("Sign up unexpected error:", err);
      const errorMessage = err?.message || "An unexpected error occurred.";
      Alert.alert("Sign Up Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field] || errors.general) {
      setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
    }
  };

  return (
    <View style={[styles.inputView, { flex: undefined }]}>
      {errors.general ? (
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
            {errors.general}
          </Text>
        </View>
      ) : null}

      <CustomInput
        placeholder="Enter your full name..."
        label="Full Name"
        Icon={<User size={19} color={Colors.light.text} strokeWidth={1.5} />}
        onChangeText={(text) => {
          setUserDetails((prev) => ({ ...prev, fullName: text }));
          clearFieldError("fullName");
        }}
        value={userDetails.fullName}
        showError={errors.fullName}
        autoCapitalize="words"
      />

      <CustomInput
        placeholder="Enter your email..."
        label="Email"
        Icon={<Mail size={19} color={Colors.light.text} strokeWidth={1.5} />}
        onChangeText={(text) => {
          setUserDetails((prev) => ({ ...prev, email: text }));
          clearFieldError("email");
        }}
        value={userDetails.email}
        showError={errors.email}
        autoCapitalize="none"
      />

      <CustomInput
        placeholder="Enter password (min. 6 characters)..."
        label="Password"
        Icon={<KeyRound size={19} color={Colors.light.text} strokeWidth={1.5} />}
        PasswordIcon={true}
        onChangeText={(text) => {
          setUserDetails((prev) => ({ ...prev, password: text }));
          clearFieldError("password");
        }}
        value={userDetails.password}
        showError={errors.password}
        autoCapitalize="none"
      />

      <CustomInput
        placeholder="Confirm your password..."
        label="Confirm password"
        Icon={<KeyRound size={19} color={Colors.light.text} strokeWidth={1.5} />}
        PasswordIcon={true}
        onChangeText={(text) => {
          setUserDetails((prev) => ({ ...prev, confirmPassword: text }));
          clearFieldError("confirmPassword");
        }}
        value={userDetails.confirmPassword}
        showError={errors.confirmPassword}
        autoCapitalize="none"
      />

      <CustomButton
        text={"Sign up"}
        onPress={handleCreateAccount}
        disabled={isLoading}
        isLoading={isLoading}
      />

      <View>
        <AlternativeLogin title="Or sign with" />
      </View>
    </View>
  );
}
