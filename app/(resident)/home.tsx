import HomeButtonEmerg from "@/components/HomeButton";
import HomeTabBar from "@/components/HomeTabBar";
import ProfileComponent from "@/components/ProfileComponent";
import PulsatingButton from "@/components/PulsatingButton";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import {
  MapPin,
  PhoneCall,
  Plus,
  TriangleAlert,
  UserRoundPlus,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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
      <HomeTabBar pageTitle="ResQ" />
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
        <View
          style={{ justifyContent: "center", alignItems: "center", gap: 4 }}
        >
          <TouchableOpacity
            style={{
              width: 90,
              height: 90,
              borderRadius: "100%",
              // borderWidth: 2,
              marginHorizontal: 4,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: Colors.light.primaryDark,
            }}
          >
            <Plus size={20} color={"#fff"} />
          </TouchableOpacity>
          <Text style={{ color: Colors.light.primary }}>Add</Text>
        </View>
      </ScrollView>

      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          marginVertical: 20,
          marginHorizontal: 16,
          gap: 16,
        }}
      >
        <PulsatingButton />
        <View>
          <Text style={{ color: Colors.light.textMuted, fontSize: 16 }}>
            Hold to trigger emergency alert
          </Text>
        </View>
      </View>

      <View style={{ margin: 16 }}>
        <View style={{ flexDirection: "row", gap: 8, marginVertical: 8 }}>
          <HomeButtonEmerg
            buttonColor={"#00A8B3"}
            subText="with contacts"
            text="Share location"
            Icon={<MapPin color={"green"} size={20} />}
            iconColor="#E1F5EE"
          />
          <HomeButtonEmerg
            buttonColor={"#00A8B3"}
            subText="Campus Security"
            text="Call security"
            Icon={<PhoneCall color={"#A32D2D"} size={20} />}
            iconColor="#EFC4C4"
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <HomeButtonEmerg
            buttonColor={"#00A8B3"}
            subText="Non-urgent"
            text="Report incident"
            Icon={<TriangleAlert color={"#A2763E"} size={20} />}
            iconColor="#FAEEDA"
          />
          <HomeButtonEmerg
            buttonColor={"#00A8B3"}
            subText="Invite to network"
            text="Add responder"
            Icon={<UserRoundPlus color={"#185FA5"} size={20} />}
            iconColor="#E6F1FB"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default home;
