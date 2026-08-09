import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React from "react";
import { Text, TouchableOpacity, View, ViewStyle } from "react-native";

interface PrimaryModuleCardProps {
  title: string;
  subText: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const PrimaryModuleCard: React.FC<PrimaryModuleCardProps> = ({
  title,
  subText,
  icon,
  iconBgColor = ResQColors.cardSurfaceSoft,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: ResQColors.cardSurface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: ResQColors.borderSubtle,
          flexBasis: "47%",
          flexGrow: 1,
          gap: 12,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: Colors.light.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 6,
          elevation: 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: iconBgColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ alignItems: "center" }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: typography.semibold,
            color: Colors.light.text,
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: typography.regular,
            color: Colors.light.textMuted,
            marginTop: 2,
            lineHeight: 16,
            textAlign: "center",
          }}
          numberOfLines={2}
        >
          {subText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default PrimaryModuleCard;
