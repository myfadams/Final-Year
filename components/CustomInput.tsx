import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { AlertCircle, Eye, EyeClosed } from "lucide-react-native";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

interface CustomInputData {
  placeholder: string;
  Icon?: React.ReactNode;
  PasswordIcon?: boolean;
  keyboardType?: boolean;
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  showError?: string;
  onBlur?: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

const CustomInput: React.FC<CustomInputData> = ({
  placeholder,
  Icon,
  PasswordIcon,
  keyboardType,
  label,
  value,
  onChangeText,
  showError,
  onBlur,
  autoCapitalize,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (showError) return Colors.light.error;
    return Colors.light.primary;
  };

  return (
    <View style={{ gap: 4, marginBottom: showError ? 2 : 0 }}>
      {label && (
        <View>
          <Text
            style={{
              fontSize: 14,
              color: Colors.light.text,
              fontFamily: typography.medium,
              marginBottom: 2,
            }}
          >
            {label}
          </Text>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          borderColor: getBorderColor(),
          borderWidth: showError ? 1.5 : 1,
          borderRadius: 12,
          paddingHorizontal: 12,
          height: 50,
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        {Icon && <View style={{ marginRight: 8 }}>{Icon}</View>}
        <TextInput
          placeholder={placeholder}
          secureTextEntry={!showPassword && PasswordIcon}
          style={{
            flex: 1,
            fontSize: 14,
            color: "#000000",
            fontFamily: typography.regular,
            paddingVertical: 5,
          }}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType ? "phone-pad" : "default"}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (onBlur) onBlur();
          }}
          autoCapitalize={autoCapitalize || "none"}
          textContentType="none"
          autoComplete="off"
        />
        {PasswordIcon && (
          <TouchableOpacity
            style={{ marginLeft: 6, padding: 4 }}
            onPress={() => {
              setShowPassword(!showPassword);
            }}
          >
            {showPassword ? (
              <EyeClosed size={19} color={"#000000"} strokeWidth={1.5} />
            ) : (
              <Eye size={19} color={"#000000"} strokeWidth={1.5} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {showError ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 3,
            paddingLeft: 4,
            gap: 5,
          }}
        >
          <AlertCircle size={14} color={Colors.light.error} />
          <Text
            style={{
              fontSize: 12,
              color: Colors.light.error,
              fontFamily: typography.medium,
            }}
          >
            {showError}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export default CustomInput;


