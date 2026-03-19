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
  return (
    <View style={styles.inputView}>
      <CustomInput
        placeholder="Name"
        Icon={<User size={19} color={"#000"} strokeWidth={1.5} />}
      />
      <CustomInput
        placeholder="Email"
        Icon={<Mail size={19} color={"#000"} strokeWidth={1.5} />}
      />
      <CustomInput
        placeholder="Password"
        Icon={<KeyRound size={19} color={"#000"} strokeWidth={1.5} />}
        PasswordIcon={true}
      />
      <CustomInput
        placeholder="Confirm password"
        Icon={<KeyRound size={19} color={"#000"} strokeWidth={1.5} />}
        PasswordIcon={true}
      />

      <CustomButton
        text={"Sign up"}
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
  );
}
