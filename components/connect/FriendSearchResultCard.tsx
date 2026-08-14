import { ResQColors } from "@/constants/Colors";
import { FriendSearchResult, RelationshipStatus } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { Check, GraduationCap, UserCheck, UserPlus } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FriendSearchResultCardProps {
  item: FriendSearchResult;
  onAdd: (id: string) => void;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
}

const AVATAR_COLORS = [
  { bg: "#FEE2E2", text: "#991B1B" },
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#EDE9FE", text: "#5B21B6" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#CCFBF1", text: "#0F766E" },
];

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name?: string) {
  const code = (name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const FriendSearchResultCard: React.FC<FriendSearchResultCardProps> = ({
  item,
  onAdd,
  onAccept,
  onCancel,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const avatarColor = getAvatarColor(item.name);
  const initials = getInitials(item.name);
  const hasAvatar = !!item.profile_img_url && !imageError;

  const renderActionButton = () => {
    switch (item.relationship) {
      case "none":
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.addBtn]}
            onPress={() => onAdd(item.id)}
            activeOpacity={0.85}
          >
            <UserPlus size={15} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        );

      case "pending_sent":
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.pendingBtn]}
            onPress={() => onCancel(item.id)}
            activeOpacity={0.75}
          >
            <Text style={styles.pendingBtnText}>Pending</Text>
          </TouchableOpacity>
        );

      case "pending_received":
        return (
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => onAccept(item.id)}
            activeOpacity={0.85}
          >
            <Check size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        );

      case "accepted":
        return (
          <View style={[styles.actionBtn, styles.friendsBtn]}>
            <UserCheck size={15} color={ResQColors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.friendsBtnText}>Friends</Text>
          </View>
        );

      case "blocked":
      default:
        return null;
    }
  };

  return (
    <View style={styles.card}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        {hasAvatar ? (
          <Image
            source={{ uri: item.profile_img_url! }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: avatarColor.bg,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Text
              style={{
                fontFamily: typography.bold,
                fontSize: 14,
                color: avatarColor.text,
              }}
            >
              {initials}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        {item.program_of_study ? (
          <View style={styles.metaRow}>
            <GraduationCap size={11} color={ResQColors.textFaint} style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.program_of_study}
            </Text>
          </View>
        ) : item.student_id_number ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              ID: {item.student_id_number}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action */}
      {renderActionButton()}
    </View>
  );
};

export default FriendSearchResultCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ResQColors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ResQColors.border,
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontFamily: typography.bold,
    fontSize: 14.5,
    color: ResQColors.textPrimary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: ResQColors.textFaint,
  },
  // ── Add button ────────────────────────────────────────────
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  addBtn: {
    backgroundColor: ResQColors.primaryRed,
  },
  addBtnText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  // ── Pending button ────────────────────────────────────────
  pendingBtn: {
    backgroundColor: ResQColors.badgeGrayBg,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
  pendingBtnText: {
    fontFamily: typography.semibold,
    fontSize: 13,
    color: ResQColors.textSecondary,
  },
  // ── Accept button ─────────────────────────────────────────
  acceptBtn: {
    backgroundColor: ResQColors.statusGreen,
  },
  acceptBtnText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  // ── Friends button ────────────────────────────────────────
  friendsBtn: {
    backgroundColor: ResQColors.badgeGrayBg,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
  friendsBtnText: {
    fontFamily: typography.semibold,
    fontSize: 13,
    color: ResQColors.textSecondary,
  },
});
