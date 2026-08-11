import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkEmailExists, signUpUser } from "@/backend/auth";
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

interface SignUpProps {
  onSwitchToLogin?: () => void;
}

export default function SignUp({ onSwitchToLogin }: SignUpProps) {
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

  const handleAccountExists = () => {
    Alert.alert(
      "Account Already Exists",
      "An account with this email address already exists. Please log in with your credentials.",
      [
        {
          text: "Log In",
          onPress: () => {
            if (onSwitchToLogin) {
              onSwitchToLogin();
            } else {
              router.replace("/(auth)/login");
            }
          },
        },
      ]
    );
    setErrors({ email: "An account with this email already exists" });
  };

  const handleCreateAccount = async () => {
    setErrors({});
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // 1. Check if email already exists in users table
      const exists = await checkEmailExists(userDetails.email.trim());
      if (exists) {
        setIsLoading(false);
        handleAccountExists();
        return;
      }

      // 2. Attempt registration with Supabase
      const { error, isExistingUser } = await signUpUser(
        userDetails.email.trim(),
        userDetails.password,
        userDetails.fullName.trim()
      );

      if (isExistingUser) {
        setIsLoading(false);
        handleAccountExists();
        return;
      }

      if (error) {
        const errorString = typeof error === "string" ? error : (error as any)?.message || "Sign up failed";
        const lowerError = errorString.toLowerCase();

        // Email field specific errors
        if (
          lowerError.includes("already registered") ||
          lowerError.includes("user already exists") ||
          lowerError.includes("already in use")
        ) {
          setIsLoading(false);
          handleAccountExists();
          return;
        } else if (
          lowerError.includes("invalid email") ||
          lowerError.includes("email address is invalid")
        ) {
          setErrors({ email: "Please enter a valid email address" });
        }
        // Password field specific errors
        else if (
          lowerError.includes("password should be") ||
          lowerError.includes("password is too weak") ||
          lowerError.includes("password must be")
        ) {
          setErrors({ password: errorString });
        }
        // Rate limits or system/server errors
        else {
          setErrors({ general: errorString });
        }
        setIsLoading(false);
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
