import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { ArrowLeft, MoreVertical, Phone, Radio } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AVATAR_COLORS = [
  { bg: "#FEE2E2", text: "#991B1B" },
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#EDE9FE", text: "#5B21B6" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#CCFBF1", text: "#0F766E" },
];

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const code = (name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

interface ChatHeaderProps {
  headerName: string;
  headerSubtitle: string;
  headerAvatar?: string;
  showSceneBadge?: boolean;
  sceneBadgeText?: string;
  showCallButton?: boolean;
  onBackPress: () => void;
  onCallPress?: () => void;
  onOptionsPress: () => void;
  isWalkSafeActive?: boolean;
  onImOkayPress?: () => void;
}

export default function ChatHeader({
  headerName,
  headerSubtitle,
  headerAvatar,
  showSceneBadge = false,
  sceneBadgeText = "On-site",
  showCallButton = true,
  onBackPress,
  onCallPress,
  onOptionsPress,
  isWalkSafeActive = false,
  onImOkayPress,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const avatarColor = getAvatarColor(headerName);
  const initials = getInitials(headerName);

  return (
    <View style={[styles.navHeaderWrapper, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.topAccentBar} />
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={onBackPress} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={ResQColors.primaryRedText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerTitleContainer}
          activeOpacity={0.85}
          onPress={onOptionsPress}
        >
          <View style={styles.avatarWrapper}>
            {headerAvatar ? (
              <Image source={{ uri: headerAvatar }} style={styles.headerAvatar} contentFit="cover" />
            ) : (
              <View
                style={[
                  styles.headerAvatar,
                  styles.initialsAvatar,
                  { backgroundColor: avatarColor.bg },
                ]}
              >
                <Text style={[styles.initialsText, { color: avatarColor.text }]}>
                  {initials}
                </Text>
              </View>
            )}
            <View style={styles.onlineBadgeDot} />
          </View>
          <View style={{ flex: 1, marginRight: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.headerNameText} numberOfLines={1}>
                {headerName}
              </Text>
              {showSceneBadge && (
                <View style={styles.sceneBadge}>
                  <Text style={styles.sceneBadgeText}>{sceneBadgeText}</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubText} numberOfLines={1}>
              {headerSubtitle}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Direct Call Button (Hidden when showCallButton is false) */}
        {showCallButton && onCallPress && (
          <TouchableOpacity onPress={onCallPress} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Phone size={19} color="#0D9488" />
          </TouchableOpacity>
        )}

        {/* Options Button */}
        <TouchableOpacity onPress={onOptionsPress} style={styles.headerIconBtn} activeOpacity={0.7}>
          <MoreVertical size={20} color={ResQColors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Live Walk Safe Active Banner */}
      {isWalkSafeActive && (
        <View style={styles.walkSafeBanner}>
          <Radio size={14} color="#FFFFFF" />
          <Text style={styles.walkSafeBannerText}>Walk Safe Live Location Active • Streaming GPS</Text>
          {onImOkayPress && (
            <TouchableOpacity onPress={onImOkayPress} style={styles.bannerOkBtn} activeOpacity={0.8}>
              <Text style={styles.bannerOkBtnText}>I'm Okay</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navHeaderWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  topAccentBar: {
    height: 3,
    backgroundColor: ResQColors.primaryRed,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  initialsAvatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontFamily: typography.bold,
    fontSize: 14,
  },
  onlineBadgeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerNameText: {
    fontSize: 15.5,
    fontFamily: typography.bold,
    color: "#0F172A",
    flexShrink: 1,
  },
  headerSubText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: "#64748B",
    marginTop: 1,
  },
  sceneBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
    flexShrink: 0,
  },
  sceneBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: "#166534",
  },
  headerIconBtn: {
    padding: 7,
    marginLeft: 2,
  },
  walkSafeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.primaryRed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  walkSafeBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  bannerOkBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bannerOkBtnText: {
    fontSize: 11.5,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
});
