import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Eye, EyeClosed } from "lucide-react-native";
import React, { useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
interface CustomInputData {
  placeholder: string;
  Icon?: React.ReactNode;
  PasswordIcon?: boolean;
}

const CustomInput: React.FC<CustomInputData> = ({
  placeholder,
  Icon,
  PasswordIcon,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View
      style={{
        flexDirection: "row",
        borderColor: Colors.light.primary,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        height: 50,
        alignItems: "center",
      }}
    >
      {Icon && <View style={{ marginRight: 6 }}>{Icon}</View>}
      <TextInput
        placeholder={placeholder}
        secureTextEntry={!showPassword && PasswordIcon}
        style={{
          flex: 1,
          fontSize: 14,
          color: Colors.light.text,
          fontFamily: typography.regular,
          padding: 5,
        }}
        placeholderTextColor={Colors.light.textMuted}
      />
      {PasswordIcon && (
        <TouchableOpacity
          style={{ marginLeft: 6 }}
          onPress={() => {
            setShowPassword(!showPassword);
          }}
        >
          {showPassword ? (
            <EyeClosed size={19} color={"#000"} strokeWidth={1.5} />
          ) : (
            <Eye size={19} color={"#000"} strokeWidth={1.5} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CustomInput;
