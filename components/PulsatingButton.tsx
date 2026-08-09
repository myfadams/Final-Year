import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PulsatingButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

const PulsatingButton: React.FC<PulsatingButtonProps> = ({
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulseAnim }],
        borderRadius: 90,
        width: 160,
        height: 160,
        backgroundColor: ResQColors.primaryRedLight,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.85}
      >
        <View style={styles.innerRing}>
          <Text style={styles.text}>SOS</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 70,
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  innerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.light.textInverse,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 28,
    color: Colors.light.textInverse,
    fontFamily: typography.semibold,
    letterSpacing: 1.5,
  },
});

export default PulsatingButton;
