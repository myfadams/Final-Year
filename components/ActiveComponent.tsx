import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
interface ActiveComponentData {
  activePage: string;
  setPage: React.Dispatch<React.SetStateAction<string>>;
}
const ActiveComponent: React.FC<ActiveComponentData> = ({
  activePage,
  setPage,
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,

        backgroundColor: Colors.light.accent,
        borderRadius: 30,
        marginVertical: 16,
        borderWidth: 1.5,
        borderColor: Colors.light.accent,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          setPage("login");
        }}
        style={{
          backgroundColor: activePage === "login" ? Colors.light.primary : "",
          borderRadius: 30,
          padding: 16,
          flex: 0.5,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: typography.medium,
            fontSize: 14,
            color: Colors.light.textInverse,
          }}
        >
          Login
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          backgroundColor: activePage === "signup" ? Colors.light.primary : "",
          borderRadius: 30,
          padding: 16,
          flex: 0.5,
          alignItems: "center",
        }}
        onPress={() => {
          setPage("signup");
        }}
      >
        <Text
          style={{
            fontFamily: typography.medium,
            fontSize: 14,
            color: Colors.light.textInverse,
          }}
        >
          Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ActiveComponent;
