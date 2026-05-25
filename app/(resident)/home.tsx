import HomeTabBar from "@/components/HomeTabBar";
import ProfileComponent from "@/components/ProfileComponent";
import PulsatingButton from "@/components/PulsatingButton";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const tempUserData = [
  {
    name: "Meme",
    emergencyContact: true,
    profileColor: "#f00",
  },
  {
    name: "Mereo",
    emergencyContact: false,
    profileColor: "#59B292",
  },
  {
    name: "There",
    emergencyContact: false,
    profileColor: "#767F9E",
  },
  {
    name: "Here",
    emergencyContact: true,
    profileColor: "#3B7597",
  },
];
const home = () => {
  return (
    <SafeAreaView>
      <HomeTabBar />
      <View
        style={{
          margin: 16,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            color: Colors.light.text,
            fontFamily: typography.regular,
          }}
        >
          Hi {"George"}!
        </Text>
      </View>
      <ScrollView
        horizontal={true}
        style={{
          padding: 16,
        }}
      >
        {tempUserData.map((userData, id) => {
          return (
            <ProfileComponent
              userInfo={userData}
              borderR={userData.emergencyContact}
              size={90}
              key={id}
            />
          );
        })}
      </ScrollView>
      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          marginVertical: 20,
          marginHorizontal: 16,
        }}
      >
        <PulsatingButton />
      </View>
    </SafeAreaView>
  );
};

export default home;
