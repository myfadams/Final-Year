import ActiveComponent from "@/components/ActiveComponent";
import AlternativeLogin from "@/components/AlternativeLogin";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyRound, Mail } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SignUp from "./register";
import { styles } from "./styles";
export default function login() {
  const Logo = require("../../assets/images/icon.png");
  const router = useRouter();
  const [activePage, setActivePage] = useState("login");
  const [showFooter, setShowFooter] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.light.accent} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
              <CustomInput
                placeholder="Enter your Email"
                Icon={<Mail size={19} color={"#000"} strokeWidth={1.5} />}
                label="Email"
              />
              <CustomInput
                placeholder="Enter your Password"
                Icon={<KeyRound size={19} color={"#000"} strokeWidth={1.5} />}
                PasswordIcon={true}
                label="Password"
              />

              <View>
                <TouchableOpacity>
                  <Text style={styles.forgotstyles}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <CustomButton
                text={"Login"}
                onPress={() => {
                  setIsLoading(true);
                  setTimeout(() => {
                    //temp
                    router.navigate("/(resident)/home");
                    setIsLoading(false);
                  }, 3000);
                }}
                disabled={isLoading}
                isLoading={isLoading}
              />
              <View>
                <AlternativeLogin title="Or sign with" />
              </View>
            </View>
          ) : (
            <SignUp />
          )}

          {showFooter && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "flex-end",
                // marginVertical: 16,
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
