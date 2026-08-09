import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";

interface ProfileProp {
  borderR?: boolean;
  userInfo: {
    name: string;
    emergencyContact: boolean;
    profileColor: string;
    avatarUrl?: string;
    statusColor?: string;
  };
  size?: number;
}

const ProfileComponent: React.FC<ProfileProp> = ({
  borderR,
  userInfo,
  size = 64,
}) => {
  const avatarSize = size;
  const imageSize = size - 6;
  const statusColor =
    userInfo.statusColor ||
    (userInfo.emergencyContact
      ? ResQColors.statusGreen
      : ResQColors.statusAmber);

  return (
    <View style={{ alignItems: "center", gap: 6, marginHorizontal: 4 }}>
      <View style={{ position: "relative" }}>
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderWidth: borderR ? 2.5 : 1,
            borderColor: borderR ? Colors.light.primary : ResQColors.border,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: ResQColors.cardSurface,
            padding: 2,
          }}
        >
          {userInfo.avatarUrl ? (
            <Image
              source={{ uri: userInfo.avatarUrl }}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: imageSize / 2,
                backgroundColor: userInfo.profileColor,
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: imageSize / 2,
                backgroundColor: userInfo.profileColor,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: Colors.light.textInverse,
                  fontFamily: typography.bold,
                  fontSize: Math.round(imageSize * 0.35),
                }}
              >
                {userInfo.name
                  ? userInfo.name.substring(0, 1).toUpperCase()
                  : "U"}
              </Text>
            </View>
          )}
        </View>

        {/* Status Dot Indicator Badge */}
        <View
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: statusColor,
            borderWidth: 2,
            borderColor: ResQColors.cardSurface,
          }}
        />
      </View>

      <Text
        style={{
          fontSize: 12,
          fontFamily: typography.medium,
          color: Colors.light.text,
          textAlign: "center",
          maxWidth: avatarSize + 10,
        }}
        numberOfLines={1}
      >
        {userInfo.name}
      </Text>
    </View>
  );
};

export default ProfileComponent;
