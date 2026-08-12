import Colors, { ResQColors } from "@/constants/Colors";
import { ContactsProp } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import {
  MessageSquare,
  Phone,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SafetyCircleMemberCardProps {
  member: ContactsProp;
  onRemove: (id: string | number) => void;
}

function firstTwoNames(fullName: string): string {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
}

export const SafetyCircleMemberCard: React.FC<SafetyCircleMemberCardProps> = ({
  member,
  onRemove,
}) => {
  const router = useRouter();

  const phoneNum = member.phone || "+233 24 000 0000";

  const handleCall = () => {
    const phoneUrl = `tel:${phoneNum.replace(/\s+/g, "")}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert("Call Member", `Calling ${member.name} at ${phoneNum}`);
        }
      })
      .catch(() => {
        Alert.alert("Call Member", `Calling ${member.name} at ${phoneNum}`);
      });
  };

  const handleChat = () => {
    router.push({
      pathname: "/contactChat",
      params: {
        id: String(member.id),
        name: member.name,
        relationship: member.relationship || "Contact",
      },
    });
  };

  const handleConfirmRemove = () => {
    Alert.alert(
      "Remove from Safety Circle",
      `Are you sure you want to remove ${member.name} from your Safety Circle? They will no longer receive your live emergency updates.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemove(member.id),
        },
      ]
    );
  };

  // Extract initials for avatar placeholder
  const displayInitials =
    member.initials ||
    member.name
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const isOnline = member.status !== "Offline";

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        {/* Left: Avatar & Member Info */}
        <View style={styles.leftSection}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: member.avatarColor || Colors.light.primary },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: member.avatarTextColor || "#FFFFFF" },
              ]}
            >
              {displayInitials}
            </Text>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    member.statusColor || (isOnline ? "#22C55E" : "#94A3B8"),
                },
              ]}
            />
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName} numberOfLines={2}>
                {firstTwoNames(member.name)}
              </Text>
            </View>

            {/* Relationship Badge & Status */}
            <View style={styles.badgeRow}>
              <View style={styles.relationBadge}>
                <Text style={styles.relationBadgeText}>
                  {member.badgeType || member.relationship || "Contact"}
                </Text>
              </View>
              <View style={styles.activeStatusTag}>
                <ShieldCheck size={11} color="#16A34A" />
                <Text style={styles.activeStatusText}>
                  {member.status || "Active Circle"}
                </Text>
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.phoneRow}>
              <Phone size={12} color="#64748B" />
              <Text style={styles.phoneText}>{phoneNum}</Text>
            </View>
          </View>
        </View>

        {/* Right: Quick Actions */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleChat}
            activeOpacity={0.7}
            accessibilityLabel={`Chat with ${member.name}`}
          >
            <MessageSquare size={16} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCall}
            activeOpacity={0.7}
            accessibilityLabel={`Call ${member.name}`}
          >
            <Phone size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleConfirmRemove}
            activeOpacity={0.7}
            accessibilityLabel={`Remove ${member.name} from circle`}
          >
            <Trash2 size={15} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: typography.bold,
  },
  statusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  infoContainer: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberName: {
    fontSize: 15.5,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
    flexWrap: "wrap",
  },
  relationBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  relationBadgeText: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: "#475569",
  },
  activeStatusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeStatusText: {
    fontSize: 10.5,
    fontFamily: typography.semibold,
    color: "#15803D",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: "#475569",
  },
  actionSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 6,
  },
  chatButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  callButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
});

export default SafetyCircleMemberCard;
