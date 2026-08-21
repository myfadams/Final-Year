import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { ContactsProp } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import {
  BadgeCheck,
  Camera,
  MapPin,
  Mic,
  MessageCircle,
  Phone,
  Radio,
  ShieldCheck,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** Returns only the first two whitespace-separated words of a full name. */
function firstTwoNames(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
}

/** Compact relative time for a last-message timestamp, e.g. "2m", "3h", "5d". */
function shortTimeAgo(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Tints the relationship pill using the same category colors as the community cards above it. */
function getRelationshipTint(relationship: string): { bg: string; text: string } {
  const r = (relationship || "").toLowerCase();
  if (r.includes("family")) return { bg: ResQColors.pinkBg, text: ResQColors.pinkText };
  if (r.includes("classmate") || r.includes("colleague") || r.includes("roommate"))
    return { bg: ResQColors.orangeBg, text: ResQColors.orangeText };
  if (r.includes("friend")) return { bg: ResQColors.purpleBg, text: ResQColors.purpleText };
  if (r.includes("security") || r.includes("staff") || r.includes("admin"))
    return { bg: ResQColors.badgeGrayBg, text: ResQColors.badgeGrayText };
  return { bg: ResQColors.badgeGrayBg, text: ResQColors.badgeGrayText };
}

// Safety-feature message types get their own colored bubble instead of plain preview text —
// same icon/color language as the chat screen itself (see ChatMessageItem.tsx) so a contact
// card and the chat it opens into read as the same feature.
const SPECIAL_KIND_META = {
  location_share: {
    icon: MapPin,
    label: "Shared Location",
    color: DESIGN_COLORS.tertiary,
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  walk_safe: {
    icon: Radio,
    label: "Walk Safe Session",
    color: ResQColors.primaryRedText,
    bg: "#FEF2F2",
    border: "#FCA5A5",
  },
  im_okay: {
    icon: ShieldCheck,
    label: "I'm Okay",
    color: ResQColors.statusGreen,
    bg: "#F0FDF4",
    border: "#86EFAC",
  },
} as const;

// Plain (non-special) preview kinds just get a small leading icon for scannability.
const PREVIEW_KIND_ICON = {
  text: MessageCircle,
  audio: Mic,
  media: Camera,
} as const;

interface specifiedProp {
  handleChatPress?: (...args: any[]) => void;
  /** Called with (id, name) when the card is long-pressed. The parent decides what to show. */
  onLongPress?: (id: string | number, name: string) => void;
  handleCallPress?: (...args: any[]) => void;
  idx: number;
}

const Contacts: React.FC<ContactsProp & specifiedProp> = ({
  id,
  initials,
  name,
  relationship,
  status,
  statusColor,
  avatarColor,
  avatarTextColor,
  handleCallPress,
  handleChatPress,
  onLongPress,
  verified,
  hasLeftAccent,
  badgeType,
  phone = "+44 999 999 999",
  avatarUrl,
  lastMessagePreview,
  lastMessageAt,
  lastMessageKind,
  unreadCount = 0,
}) => {
  const isOffline = status === "Offline";
  const categoryLabel = badgeType || relationship || "Contact";
  const specialMeta = lastMessageKind
    ? SPECIAL_KIND_META[lastMessageKind as keyof typeof SPECIAL_KIND_META]
    : undefined;
  const PreviewIcon = lastMessageKind
    ? PREVIEW_KIND_ICON[lastMessageKind as keyof typeof PREVIEW_KIND_ICON]
    : undefined;
  const relationshipTint = getRelationshipTint(categoryLabel);
  const hasUnread = unreadCount > 0;

  // Determine avatar background and text color based on design spec
  const isSolid =
    avatarTextColor === "#FFFFFF" ||
    avatarColor === "#111827" ||
    name === "Campus Security";
  const avatarBg = isSolid
    ? name === "Campus Security"
      ? "#111827"
      : avatarColor
    : "#FFFFFF";
  const avatarBorder = isOffline ? "#9CA3AF" : statusColor;

  let initialsColor = "#FFFFFF";
  if (!isSolid) {
    initialsColor = isOffline
      ? "#9CA3AF"
      : avatarTextColor && avatarTextColor !== "#FFFFFF"
        ? avatarTextColor
        : avatarColor;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        handleChatPress?.(name, {
          id,
          name,
          relationship: categoryLabel,
          phone,
          avatarUrl,
        })
      }
      onLongPress={() => onLongPress?.(id, name)}
      style={[
        styles.contactCard,
        hasLeftAccent && styles.leftAccentCard,
        hasUnread && styles.contactCardUnread,
      ]}
    >
      {hasLeftAccent && <View style={styles.leftAccentBar} />}

      {/* Avatar — prefer real photo, fallback to initials */}
      <View style={styles.avatarWrapper}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[
              styles.avatarBox,
              styles.avatarImage,
              { borderColor: avatarBorder ?? "#E5E7EB" },
            ]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.avatarBox,
              { backgroundColor: avatarBg, borderColor: avatarBorder },
            ]}
          >
            <Text style={[styles.avatarText, { color: initialsColor }]}>
              {initials}
            </Text>
          </View>
        )}
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText} numberOfLines={1}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.contactInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.contactName} numberOfLines={1}>
            {firstTwoNames(name)}
          </Text>
          {verified && (
            <BadgeCheck
              size={15}
              color="#FFFFFF"
              fill={Colors.light.accent}
              style={styles.verifiedBadge}
            />
          )}
          {lastMessageAt && (
            <Text style={styles.headerTime} numberOfLines={1}>
              {shortTimeAgo(lastMessageAt)}
            </Text>
          )}
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.relationshipPill, { backgroundColor: relationshipTint.bg }]}>
            <Text style={[styles.relationshipPillText, { color: relationshipTint.text }]} numberOfLines={1}>
              {relationship}
            </Text>
          </View>
          {status && status !== "" ? (
            <View style={styles.statusChip}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOffline ? "#9CA3AF" : statusColor },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isOffline ? "#9CA3AF" : statusColor },
                ]}
                numberOfLines={1}
              >
                {status}
              </Text>
            </View>
          ) : null}
        </View>

        {(specialMeta || lastMessagePreview) && (
          <View style={styles.lastMessageRow}>
            {specialMeta ? (
              <View
                style={[
                  styles.specialBubble,
                  { backgroundColor: specialMeta.bg, borderColor: specialMeta.border },
                ]}
              >
                <specialMeta.icon size={11} color={specialMeta.color} strokeWidth={2.4} />
                <Text style={[styles.specialBubbleText, { color: specialMeta.color }]} numberOfLines={1}>
                  {specialMeta.label}
                </Text>
              </View>
            ) : (
              <View style={styles.plainPreviewRow}>
                {PreviewIcon && (
                  <PreviewIcon size={12} color={ResQColors.textFaint} strokeWidth={2.2} style={styles.previewIcon} />
                )}
                <Text style={styles.lastMessageText} numberOfLines={1}>
                  {lastMessagePreview}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => !isOffline && handleCallPress?.(name)}
          style={[styles.callButton, isOffline && styles.callButtonDisabled]}
          activeOpacity={0.7}
        >
          <Phone
            size={17}
            color={isOffline ? "#9CA3AF" : ResQColors.primaryRed}
            strokeWidth={2.3}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default Contacts;

const styles = StyleSheet.create({
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ResQColors.borderSubtle,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  contactCardUnread: {
    borderColor: ResQColors.primaryRedBorder,
    backgroundColor: "#FFFDFD",
  },
  leftAccentCard: {
    paddingLeft: 20,
  },
  leftAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.light.accent,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarImage: {
    backgroundColor: "#E5E7EB",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: typography.bold,
  },
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    paddingHorizontal: 4,
    backgroundColor: ResQColors.primaryRed,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ResQColors.primaryRed,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  contactInfo: {
    flex: 1,
    marginLeft: 13,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactName: {
    fontSize: 15.5,
    fontFamily: typography.bold,
    color: Colors.light.text,
    flexShrink: 1,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  headerTime: {
    marginLeft: "auto",
    paddingLeft: 8,
    fontSize: 11,
    fontFamily: typography.medium,
    color: ResQColors.textFaint,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  relationshipPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    maxWidth: "60%",
  },
  relationshipPillText: {
    fontSize: 11,
    fontFamily: typography.semibold,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: typography.semibold,
  },
  lastMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  plainPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  previewIcon: {
    marginRight: 4,
  },
  lastMessageText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
  },
  specialBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  specialBubbleText: {
    fontSize: 11,
    fontFamily: typography.semibold,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ResQColors.primaryRedLight,
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  callButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
});
