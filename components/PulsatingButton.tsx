import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";

const PulsatingButton = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Starts an infinite looping animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1, // Scale up to 110%
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, // Scale back to 100%
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulseAnim }],
        borderRadius: "100%",
        width: 150,
        height: 150,
        borderColor: Colors.light.accent,
        borderWidth: 20,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <TouchableOpacity style={styles.button}>
        <Text style={styles.text}>SOS</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.light.accent,
    // paddingVertical: 15,
    // paddingHorizontal: 30,
    margin: 10,
    borderRadius: "100%",
    width: "95%",
    height: "95%",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 30,
    color: "white",
    fontFamily: typography.semibold,
  },
});

export default PulsatingButton;
