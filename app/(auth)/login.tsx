import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getUserProfile,
  resendVerificationEmail,
  signInUser,
} from "@/backend/auth";
import ActiveComponent from "@/components/ActiveComponent";
import AlternativeLogin from "@/components/AlternativeLogin";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AlertCircle, KeyRound, Mail } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SignUp from "./register";
import { styles } from "./styles";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function login() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("login");
  const [showFooter, setShowFooter] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setShowFooter(false);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setShowFooter(true);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setErrors({});
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const cleanEmail = email.trim();
      const { data, error } = await signInUser(cleanEmail, password);

      if (error) {
        const errorString = typeof error === "string" ? error : (error as any)?.message || "Sign in failed";
        const lowerError = errorString.toLowerCase();
        const isUnverified =
          lowerError.includes("email not confirmed") ||
          lowerError.includes("not confirmed") ||
          lowerError.includes("confirm your email") ||
          lowerError.includes("unverified");

        if (isUnverified) {
          // Resend email verification link safely (don't crash if network fails)
          try {
            await resendVerificationEmail(cleanEmail);
          } catch (e) {
            console.warn("Could not auto-resend verification email:", e);
          }

          await AsyncStorage.setItem(
            "@pending_verify_credentials",
            JSON.stringify({
              email: cleanEmail,
              password: password,
              fullName: "",
            })
          );

          setIsLoading(false);
          router.navigate({
            pathname: "/(auth)/waitingVerify",
            params: {
              email: cleanEmail,
              password: password,
            },
          });
          return;
        }

        // Input specific errors
        if (
          lowerError.includes("invalid login credentials") ||
          lowerError.includes("invalid credentials") ||
          lowerError.includes("invalid email or password")
        ) {
          setErrors({
            email: "Invalid email or password",
            password: "Invalid email or password",
          });
        } else if (
          lowerError.includes("user not found") ||
          lowerError.includes("no user")
        ) {
          setErrors({ email: "No account found with this email address" });
        } else if (
          lowerError.includes("invalid email") ||
          lowerError.includes("email address is invalid")
        ) {
          setErrors({ email: "Please enter a valid email address" });
        } else if (lowerError.includes("password")) {
          setErrors({ password: errorString });
        } else {
          setErrors({ general: errorString });
        }
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Check if user's email is unconfirmed
        if (!data.user.email_confirmed_at) {
          await resendVerificationEmail(cleanEmail);

          const fullName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            "";

          await AsyncStorage.setItem(
            "@pending_verify_credentials",
            JSON.stringify({
              email: cleanEmail,
              password: password,
              fullName: fullName,
            })
          );

          setIsLoading(false);
          router.navigate({
            pathname: "/(auth)/waitingVerify",
            params: {
              email: cleanEmail,
              password: password,
              fullName: fullName,
            },
          });
          return;
        }

        // User email is verified: check student ID profile verification
        const { profile } = await getUserProfile(data.user.id);
        setIsLoading(false);

        if (profile && profile.is_verified) {
          router.replace("/(resident)/home");
        } else {
          router.replace({
            pathname: "/(auth)/verify",
            params: {
              email: cleanEmail,
              password: password,
              fullName:
                profile?.name || data.user.user_metadata?.full_name || "",
            },
          });
        }
      }
    } catch (err: any) {
      console.error("Login unexpected error:", err);
      const errorMessage =
        err?.message || "An unexpected error occurred during sign in.";
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field] || errors.general) {
      setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
    }
  };

  const scrollContent = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text
          style={{
            color: Colors.light.text,
            fontFamily: typography.medium,
            fontSize: 24,
            textAlign: "center",
            marginVertical: 18,
          }}
        >
          Sign In to Connect With Emergency Services
        </Text>
        <ActiveComponent activePage={activePage} setPage={setActivePage} />
      </View>
      {activePage === "login" ? (
        <View style={styles.inputView}>
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
            placeholder="Enter your Email"
            Icon={<Mail size={19} color={"#000"} strokeWidth={1.5} />}
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearFieldError("email");
            }}
            showError={errors.email}
            autoCapitalize="none"
          />
          <CustomInput
            placeholder="Enter your Password"
            Icon={<KeyRound size={19} color={"#000"} strokeWidth={1.5} />}
            PasswordIcon={true}
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearFieldError("password");
            }}
            showError={errors.password}
            autoCapitalize="none"
          />

          <View>
            <TouchableOpacity>
              <Text style={styles.forgotstyles}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <CustomButton
            text={"Login"}
            onPress={handleLogin}
            disabled={isLoading}
            isLoading={isLoading}
          />
          <View>
            <AlternativeLogin title="Or sign with" />
          </View>
        </View>
      ) : (
        <SignUp onSwitchToLogin={() => setActivePage("login")} />
      )}

      {showFooter && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: 16,
          }}
        >
          <Text>
            {activePage === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (activePage === "signup") {
                setActivePage("login");
                return;
              }
              setActivePage("signup");
            }}
          >
            <Text style={{ color: Colors.light.accent }}>
              {activePage === "login" ? "Create an account" : "login"}.
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.light.accent} />
      <SafeAreaView style={{ flex: 1 }}>
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

