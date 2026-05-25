import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";

interface PRofileProp {
  borderR?: boolean;
  userInfo: { name: string; emergencyContact: boolean; profileColor: string };
  size?: number;
}
const ProfileComponent: React.FC<PRofileProp> = ({
  borderR,
  userInfo,
  size,
}) => {
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: "100%",
          borderWidth: borderR ? 2 : 0,
          borderColor: userInfo.profileColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          style={{
            backgroundColor: userInfo.profileColor,
            width: "95%",
            height: "95%",
            borderRadius: "100%",
            margin: 6,
          }}
        />
      </View>
      <Text>{userInfo.name}</Text>
    </View>
  );
};

export default ProfileComponent;
