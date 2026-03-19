import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
interface CustomButtonProps {
  text: String;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}
const CustomButton: React.FC<CustomButtonProps> = ({
  text,
  onPress,
  isLoading,
  disabled,
}) => {
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
          backgroundColor: Colors.light.accent,
          padding: 12,
          borderRadius: "7%",

          borderColor: Colors.light.accent,
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text
            style={{
              fontFamily: typography.medium,
              fontSize: 15,
              color: Colors.light.textInverse,
            }}
          >
            {text}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default CustomButton;
