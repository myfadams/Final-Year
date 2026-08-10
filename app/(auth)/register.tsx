import { signUpUser } from "@/backend/auth";
import AlternativeLogin from "@/components/AlternativeLogin";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { useRouter } from "expo-router";
import { KeyRound, Mail, User } from "lucide-react-native";
import React, { useState } from "react";
import { View } from "react-native";
import { styles } from "./styles";
export default function SignUp() {
  const Logo = require("../../assets/images/icon.png");
  const router = useRouter();
  const [activePage, setActivePage] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [userDetails, setUserDetails] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const handleCreateAccount = () => {
    if (
      userDetails.email === "" ||
      userDetails.fullName === "" ||
      userDetails.password === "" ||
      userDetails.confirmPassword === ""
    )
      return;
    setIsLoading(true);
    signUpUser(userDetails.email, userDetails.password, userDetails.fullName)
      .then(() => {
        console.log("account created successfully");
        router.navigate({
          pathname: "/(auth)/waitingVerify",
          params: { email: userDetails.email },
        });
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <View style={[styles.inputView, { flex: undefined }]}>
      <CustomInput
        placeholder="Enter your full name..."
        label="Full Name"
        Icon={<User size={19} color={"#000"} strokeWidth={1.5} />}
        onChangeText={(text) => {
          setUserDetails({ ...userDetails, fullName: text });
        }}
        value={userDetails.fullName}
      />
      <CustomInput
        placeholder="Enter your email..."
        label="Email"
        Icon={<Mail size={19} color={"#000"} strokeWidth={1.5} />}
        onChangeText={(text) => {
          setUserDetails({ ...userDetails, email: text });
        }}
        value={userDetails.email}
      />
      <CustomInput
        placeholder="Enter password..."
        label="Password"
        Icon={<KeyRound size={19} color={"#000"} strokeWidth={1.5} />}
        PasswordIcon={true}
        onChangeText={(text) => {
          setUserDetails({ ...userDetails, password: text });
        }}
        value={userDetails.password}
      />
      <CustomInput
        placeholder="Confirm your password..."
        label="Confirm password"
        Icon={<KeyRound size={19} color={"#000"} strokeWidth={1.5} />}
        PasswordIcon={true}
        onChangeText={(text) => {
          setUserDetails({ ...userDetails, confirmPassword: text });
          // if(text==="")
          //   return
          console.log(text === userDetails.password);
          setPasswordMatch(text === userDetails.password);
        }}
        showError={passwordMatch ? undefined : "Password does not match"}
        value={userDetails.confirmPassword}
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
