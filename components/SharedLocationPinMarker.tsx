import { SharedLocationPin } from "@/constants/globalState";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { MapPin, Radio, User } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeMarker as Marker } from "@/components/SafeMarker";

interface SharedLocationPinMarkerProps {
  pin: SharedLocationPin;
  isSelected?: boolean;
  onPress?: () => void;
}

const PulseRing: React.FC<{ color: string }> = ({ color }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 2.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
};

export const SharedLocationPinMarker: React.FC<
  SharedLocationPinMarkerProps
> = ({ pin, isSelected = true, onPress }) => {
  const isWalkSafe = pin.type === "walk_safe";
  const pinColor = isWalkSafe ? "#af101a" : "#0D9488"; // Red for Walk Safe, Teal for Share Location

  // Shorten name if too long
  const displayName =
    pin.senderName.length > 18
      ? pin.senderName.substring(0, 15) + "..."
      : pin.senderName;

  return (
    <Marker
      coordinate={{
        latitude: pin.latitude,
        longitude: pin.longitude,
      }}
      anchor={{ x: 0.5, y: 1.0 }} // Anchor pin bottom tail at precise map coordinate
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.container}>
        {/* Pulsating Ring Animation for Live Walk Safe */}
        {isWalkSafe && <PulseRing color="rgba(175, 16, 26, 0.4)" />}

        {/* Pin Outer Frame */}
        <View
          style={[
            styles.pinWrapper,
            {
              borderColor: pinColor,
              shadowColor: pinColor,
            },
            isSelected && styles.selectedPinWrapper,
          ]}
        >
          {/* Profile Image / Avatar */}
          <View style={styles.avatarContainer}>
            {pin.senderAvatar ? (
              <Image
                source={{ uri: pin.senderAvatar }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View
                style={[styles.avatarFallback, { backgroundColor: pinColor }]}
              >
                <User size={22} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Type Badge Overlay Icon */}
          <View style={[styles.typeBadge, { backgroundColor: pinColor }]}>
            {isWalkSafe ? (
              <Radio size={11} color="#FFFFFF" />
            ) : (
              <MapPin size={11} color="#FFFFFF" />
            )}
          </View>
        </View>

        {/* Teardrop Stem Pointer */}
        <View style={[styles.pinStem, { borderTopColor: pinColor }]} />
        <View style={[styles.pinStemDot, { backgroundColor: pinColor }]} />

        {/* Label Callout Pill Below Pin */}
        <View style={styles.labelContainer}>
          <View
            style={[
              styles.liveIndicatorDot,
              { backgroundColor: isWalkSafe ? "#EF4444" : "#0D9488" },
            ]}
          />
          <Text style={mapStyles_markerLabelText} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </View>
    </Marker>
  );
};

const mapStyles_markerLabelText = {
  fontSize: 10.5,
  fontFamily: typography.bold,
  color: "#0F172A",
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
  },
  pinWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  selectedPinWrapper: {
    transform: [{ scale: 1.1 }],
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  typeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  pinStem: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -2,
  },
  pinStemDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: -2,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    gap: 4,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
