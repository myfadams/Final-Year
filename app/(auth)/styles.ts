import Colors from "@/constants/Colors";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    padding: 10,
    gap: 16,
    // marginBottom: 170,
  },
  image: {
    width: 170,
    height: 170,
    // borderWidth: 1,
  },
  imageView: {
    alignItems: "center",
    // borderWidth: 1,
    padding: 10,
    // flex:1
  },
  inputView: {
    gap: 18,
    // justifyContent: "center",
    flex: 1,
  },
  forgotstyles: {
    alignSelf: "flex-end",
    color: Colors.light.accent,
  },
});
