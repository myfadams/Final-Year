import Colors from "@/constants/Colors";
import { ContactsProp } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { BadgeCheck, MessageSquare, Phone } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** Returns only the first two whitespace-separated words of a full name. */
function firstTwoNames(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
}

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
  hasMessage = true,
  badgeType,
  phone = "+44 999 999 999",
  avatarUrl,
}) => {
  const isOffline = status === "Offline";
  const categoryLabel = badgeType || relationship || "Contact";

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
      activeOpacity={0.9}
      onLongPress={() => onLongPress?.(id, name)}
      style={[styles.contactCard, hasLeftAccent && styles.leftAccentCard]}
    >
      {hasLeftAccent && <View style={styles.leftAccentBar} />}

      {/* Avatar — prefer real photo, fallback to initials */}
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

      {/* Info */}
      <View style={styles.contactInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.contactName} numberOfLines={2}>{firstTwoNames(name)}</Text>
          {verified && (
            <BadgeCheck
              size={16}
              color="#FFFFFF"
              fill={Colors.light.accent}
              style={styles.verifiedBadge}
            />
          )}
        </View>
        <View style={styles.contactSubtitle}>
          <Text style={styles.contactRelationship}>{relationship}</Text>
          {status && status !== "" ? (
            <>
              <Text style={styles.dotSeparator}> • </Text>
              <Text
                style={[
                  styles.statusText,
                  { color: isOffline ? "#9CA3AF" : statusColor },
                ]}
              >
                {status}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        {hasMessage && (
          <TouchableOpacity
            onPress={() =>
              handleChatPress?.(name, {
                id,
                name,
                relationship: categoryLabel,
                phone,
                avatarUrl,
              })
            }
            disabled={isOffline}
            style={[styles.actionButton, { backgroundColor: "#F3F4F6" }]}
            activeOpacity={0.7}
          >
            <MessageSquare
              size={18}
              color={isOffline ? "#9CA3AF" : Colors.light.accent}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => !isOffline && handleCallPress?.(name)}
          style={[
            styles.actionButton,
            { backgroundColor: isOffline ? "#F3F4F6" : "#FEE2E2" },
          ]}
          activeOpacity={0.7}
        >
          <Phone
            size={18}
            color={isOffline ? "#9CA3AF" : Colors.light.accent}
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
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
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    backgroundColor: "#E5E7EB",
  },
  avatarText: {
    fontSize: 15,
    fontFamily: typography.bold,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
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
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  contactSubtitle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  contactRelationship: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
  },
  dotSeparator: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  statusText: {
    fontSize: 13,
    fontFamily: typography.semibold,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
