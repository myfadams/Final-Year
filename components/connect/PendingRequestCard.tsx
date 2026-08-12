import { ResQColors } from "@/constants/Colors";
import { PendingRequest } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { GraduationCap, X } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: "#FEE2E2", text: "#991B1B" },
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#EDE9FE", text: "#5B21B6" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#CCFBF1", text: "#0F766E" },
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarColor(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

interface PendingRequestCardProps {
  item: PendingRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export const PendingRequestCard: React.FC<PendingRequestCardProps> = ({
  item,
  onAccept,
  onReject,
}) => {
  const isMedic = item.role.toLowerCase().includes("medic");
  const avatarColor = getAvatarColor(item.name);
  const initials = getInitials(item.name);

  return (
    <View style={styles.card}>
      <View style={styles.contentRow}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.initialsAvatar,
              { backgroundColor: avatarColor.bg },
            ]}
          >
            <Text style={[styles.initialsText, { color: avatarColor.text }]}>
              {initials}
            </Text>
          </View>
        )}
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.metaRow}>
            {/* Role Badge */}
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: isMedic
                    ? ResQColors.badgeGrayBg
                    : ResQColors.badgeAmberBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  {
                    color: isMedic
                      ? ResQColors.badgeGrayText
                      : ResQColors.badgeAmberText,
                  },
                ]}
              >
                {item.role}
              </Text>
            </View>

            {/* Distance */}
            <View style={styles.distanceRow}>
              <GraduationCap size={12} color={ResQColors.textSubtle} style={styles.pinIcon} />
              <Text style={styles.distanceText}>{item.distance}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => onAccept(item.id)}
          activeOpacity={0.85}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => onReject(item.id)}
          activeOpacity={0.7}
        >
          <X size={18} color={ResQColors.badgeGrayText} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ResQColors.border,
    padding: 16,
    marginBottom: 14,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ResQColors.border,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontFamily: typography.bold,
    fontSize: 16.5,
    color: ResQColors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  roleText: {
    fontFamily: typography.semibold,
    fontSize: 11.5,
  },
  initialsAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontFamily: typography.bold,
    fontSize: 18,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pinIcon: {
    marginRight: 3,
  },
  distanceText: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: ResQColors.textSubtle,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: ResQColors.primaryRed,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontFamily: typography.bold,
  },
  rejectButton: {
    width: 44,
    height: 44,
    backgroundColor: ResQColors.badgeGrayBg,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PendingRequestCard;
