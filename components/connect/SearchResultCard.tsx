import { ResQColors } from "@/constants/Colors";
import { SuggestedResponder } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { Check, MapPin, UserPlus } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SearchResultCardProps {
  item: SuggestedResponder;
  onToggleConnect: (id: string) => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  item,
  onToggleConnect,
}) => {
  const isLeader = item.role.toLowerCase().includes("community");

  return (
    <View style={styles.card}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Image
          source={{ uri: item.avatarUrl }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.rolePill,
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
          <MapPin size={11} color={ResQColors.textFaint} style={styles.pin} />
          <Text style={styles.distance} numberOfLines={1}>
            {item.distance}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          item.isRequested ? styles.requestedBtn : styles.connectBtn,
        ]}
        onPress={() => onToggleConnect(item.id)}
        activeOpacity={0.85}
      >
        {item.isRequested ? (
          <Check size={16} color={ResQColors.textSecondary} strokeWidth={2.5} />
        ) : (
          <UserPlus size={16} color="#FFFFFF" strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default SearchResultCard;

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
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ResQColors.border,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ResQColors.statusGreen,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontFamily: typography.bold,
    fontSize: 14.5,
    color: ResQColors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  roleText: {
    fontFamily: typography.semibold,
    fontSize: 10.5,
  },
  pin: {
    marginRight: 3,
  },
  distance: {
    fontFamily: typography.medium,
    fontSize: 11.5,
    color: ResQColors.textFaint,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  connectBtn: {
    backgroundColor: ResQColors.primaryRed,
  },
  requestedBtn: {
    backgroundColor: ResQColors.badgeGrayBg,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
});
