import Colors, { ResQColors } from "@/constants/Colors";
import React, { Dispatch, SetStateAction } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ScrollBtnProp {
  text: string;
  isActive: string;
  setIsActive: Dispatch<SetStateAction<string>>;
  pageName: string;
  numberOfCases?: number;
}

const ScrollViewButton: React.FC<ScrollBtnProp> = ({
  text,
  isActive,
  setIsActive,
  pageName,
  numberOfCases,
}) => {
  return (
    <TouchableOpacity
      style={{
        backgroundColor:
          isActive == pageName ? Colors.light.primary : ResQColors.pageBg,
        paddingVertical: 12,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 18,
        borderRadius: 24,
        flexDirection: "row",
        gap: 8,
        borderWidth: isActive != pageName ? 1 : 0,
        borderColor: ResQColors.border,
      }}
      onPress={() => {
        setIsActive(pageName);
        console.log(pageName);
      }}
    >
      <Text
        style={{
          color:
            isActive == pageName
              ? Colors.light.textInverse
              : Colors.light.textMuted,
        }}
      >
        {text}
      </Text>
      {numberOfCases !== undefined && (
        <View
          style={{
            padding: 3,
            backgroundColor:
              isActive == pageName
                ? Colors.light.accent
                : ResQColors.borderStrong,
            width: 18,
            height: 18,
            borderRadius: 9,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: Colors.light.textInverse,
              fontSize: 10,
            }}
          >
            {numberOfCases}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ScrollViewButton;
