import Colors from "@/constants/Colors";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
interface AlternativeLoginData {
  title: string;
}
const AlternativeLogin: React.FC<AlternativeLoginData> = ({ title }) => {
  const googleLogo = require("../assets/images/google.png");
  const appleWhiteLogo = require("../assets/images/appleWhite.png");
  const appleBlackLogo = require("../assets/images/appleBlack.png");

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.light.border,
            height: 1.3,
            flexGrow: 1,
          }}
        ></View>
        <View>
          <Text style={styleT.text}>{title}</Text>
        </View>
        <View
          style={{
            backgroundColor: Colors.light.border,
            height: 1.3,
            flexGrow: 1,
          }}
        ></View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginVertical: 16 }}>
        <TouchableOpacity style={styleT.button}>
          <Image source={googleLogo} style={styleT.image} />
          <Text style={styleT.text}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styleT.button}>
          <Image source={appleBlackLogo} style={styleT.image} />
          <Text style={styleT.text}>Apple</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styleT = StyleSheet.create({
  button: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 50,
    gap: 4,
    borderColor: Colors.light.primary,
    borderWidth: 1,
    justifyContent: "center",
    flex: 0.5,
    alignItems: "center",
  },
  text: { color: Colors.light.textMuted },
  image: { width: 15, height: 15 },
});
export default AlternativeLogin;
