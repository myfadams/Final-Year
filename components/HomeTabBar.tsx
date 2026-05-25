import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { Bell, MessageCircleQuestionMark } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface HomeTabBarProp {
  activePage?: string;
  userInfo?: {};
}
const HomeTabBar: React.FC<HomeTabBarProp> = ({ activePage, userInfo }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <View style={{}}>
        <Text
          style={{
            fontSize: 30,
            color: Colors.light.text,
            fontFamily: typography.bold,
          }}
        >
          ResQ
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <TouchableOpacity
          style={{
            borderRadius: "100%",
            width: 40,
            height: 40,
            //   backgroundColor: "#000",
            borderColor: Colors.light.text,
            borderWidth: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Bell color={Colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            borderRadius: "100%",
            width: 40,
            height: 40,
            //   backgroundColor: "#000",
            borderColor: Colors.light.text,
            borderWidth: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MessageCircleQuestionMark color={Colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Image
            source={"../designs/profile.png"}
            style={{
              borderRadius: "100%",
              width: 40,
              height: 40,
              backgroundColor: "#000",
            }}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeTabBar;
