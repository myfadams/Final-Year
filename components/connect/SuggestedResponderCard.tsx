import { ResQColors } from "@/constants/Colors";
import { SuggestedResponder } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { Check, MapPin, UserPlus } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SuggestedResponderCardProps {
  item: SuggestedResponder;
  onToggleConnect: (id: string) => void;
}

export const SuggestedResponderCard: React.FC<SuggestedResponderCardProps> = ({
  item,
  onToggleConnect,
}) => {
  const isLeader = item.role.toLowerCase().includes("community");

  return (
    <View style={styles.card}>
      {/* Avatar Wrapper */}
      <View style={styles.avatarWrapper}>
        <Image
          source={{ uri: item.avatarUrl }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Name */}
      <Text style={styles.name}>{item.name}</Text>

      {/* Role Pill Badge */}
      <View
        style={[
          styles.roleBadge,
          {
            backgroundColor: isLeader
              ? ResQColors.badgeAmberBg
              : ResQColors.badgeGrayBg,
          },
        ]}
      >
        <Text
          style={[
            styles.roleText,
            {
              color: isLeader
                ? ResQColors.badgeAmberText
                : ResQColors.badgeGrayText,
            },
          ]}
        >
          {item.role}
        </Text>
      </View>

      {/* Distance */}
      <View style={styles.distanceRow}>
        <MapPin size={13} color={ResQColors.textSubtle} style={styles.pinIcon} />
        <Text style={styles.distanceText}>{item.distance}</Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          item.isRequested ? styles.requestedButton : styles.connectButton,
        ]}
        onPress={() => onToggleConnect(item.id)}
        activeOpacity={0.85}
      >
        {item.isRequested ? (
          <View style={styles.buttonContent}>
            <Check
              size={18}
              color={ResQColors.textSecondary}
              strokeWidth={2.5}
              style={styles.btnIcon}
            />
            <Text style={styles.requestedButtonText}>Requested</Text>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            <UserPlus
              size={18}
              color="#FFFFFF"
              strokeWidth={2.2}
              style={styles.btnIcon}
            />
            <Text style={styles.connectButtonText}>Connect</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: ResQColors.border,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: ResQColors.border,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ResQColors.statusGreen,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  name: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: ResQColors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleText: {
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  pinIcon: {
    marginRight: 4,
  },
  distanceText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: ResQColors.textSubtle,
  },
  actionButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  connectButton: {
    backgroundColor: ResQColors.primaryRed,
  },
  requestedButton: {
    backgroundColor: ResQColors.badgeGrayBg,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnIcon: {
    marginRight: 8,
  },
  connectButtonText: {
    fontSize: 14.5,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  requestedButtonText: {
    fontSize: 14.5,
    fontFamily: typography.bold,
    color: ResQColors.textSecondary,
  },
});

export default SuggestedResponderCard;
