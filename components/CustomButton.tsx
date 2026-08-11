import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import HeartBeatWave from "./HeartBeatWave";

interface CustomButtonProps {
  text: String;
  onPress?: (...args: any[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  Icon?: React.ReactNode;
  color?: string;
  textColor?: string;
  borderColor?: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  text,
  onPress,
  isLoading,
  disabled,
  Icon,
  color,
  textColor,
  borderColor,
}) => {
  const loaderColor =
    textColor ||
    (color === "#fff" || color === "transparent"
      ? Colors.light.accent
      : "#fff");

  return (
    <View style={{ flexDirection: "row", height: 50 }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={{
          justifyContent: "center",
          alignItems: "center",
          // width: "100%",
          flexGrow: 1,
          backgroundColor: !color ? Colors.light.accent : color,
          padding: 12,
          // borderRadius: "7%",
          borderRadius: 30,

          borderWidth:
            borderColor || color === "#fff" || color === "transparent" ? 1 : 0,
          borderColor: borderColor
            ? borderColor
            : color === "#fff"
              ? "#E3E2DA"
              : Colors.light.accent,
          flexDirection: "row",
          gap: 4,
        }}
      >
        {isLoading ? (
          <HeartBeatWave width={84} height={29} color={loaderColor} thickness={14.5} />
        ) : (
          <>
            {Icon && <View style={{}}>{Icon}</View>}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                fontFamily: typography.medium,
                fontSize: 14,
                color: !textColor ? Colors.light.textInverse : textColor,
              }}
            >
              {text}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default CustomButton;
