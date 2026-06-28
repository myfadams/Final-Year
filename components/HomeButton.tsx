import Colors from "@/constants/Colors";
import { HomeButton } from "@/constants/interfaces";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

const HomeButtonEmerg: React.FC<HomeButton> = ({
  Icon,
  text,
  buttonColor,
  subText,
  iconColor,
}) => {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: buttonColor,
        flexDirection: "row",
        // justifyContent: "center",
        alignItems: "center",
        gap: 8,
        padding: 10,
        borderRadius: 10,
        // width: "50%",
        flexBasis: "50%",
        // flexGrow: 0,
      }}
    >
      <View
        style={{
          //   width: 24,
          //   height: 24,
          backgroundColor: iconColor,
          padding: 9,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 8,
        }}
      >
        {Icon}
      </View>
      <View>
        <Text
          style={{
            fontWeight: "bold",
            color: Colors.light.textInverse,
            fontSize: 15,
          }}
        >
          {text}
        </Text>
        <Text style={{ color: Colors.light.textInverse, fontSize: 12 }}>
          {subText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default HomeButtonEmerg;
