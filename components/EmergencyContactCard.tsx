import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Heart, Phone, Trash2, User } from "lucide-react-native";
import React from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
}

interface EmergencyContactCardProps {
  contact: EmergencyContact;
  onRemove: (id: string) => void;
}

export const EmergencyContactCard: React.FC<EmergencyContactCardProps> = ({
  contact,
  onRemove,
}) => {
  const handleCall = () => {
    const phoneUrl = `tel:${contact.phone.replace(/\s+/g, "")}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert("Call Contact", `Calling ${contact.name} at ${contact.phone}`);
        }
      })
      .catch(() => {
        Alert.alert("Call Contact", `Calling ${contact.name} at ${contact.phone}`);
      });
  };

  const handleConfirmRemove = () => {
    Alert.alert(
      "Remove Contact",
      `Are you sure you want to remove ${contact.name} from your emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemove(contact.id),
        },
      ]
    );
  };

  // Extract initials for avatar placeholder
  const initials = contact.name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        {/* Left: Avatar & Info */}
        <View style={styles.leftSection}>
          <View style={styles.avatar}>
            {initials ? (
              <Text style={styles.avatarText}>{initials}</Text>
            ) : (
              <User size={20} color={ResQColors.primaryRed} />
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.contactName}>{contact.name}</Text>
              {contact.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
            </View>

            {/* Relationship Badge */}
            <View style={styles.relationRow}>
              <Heart size={12} color="#64748B" />
              <Text style={styles.relationText}>{contact.relationship}</Text>
            </View>

            {/* Phone Number */}
            <View style={styles.phoneRow}>
              <Phone size={13} color="#475569" />
              <Text style={styles.phoneText}>{contact.phone}</Text>
            </View>
          </View>
        </View>

        {/* Right: Quick Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCall}
            activeOpacity={0.7}
            accessibilityLabel={`Call ${contact.name}`}
          >
            <Phone size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleConfirmRemove}
            activeOpacity={0.7}
            accessibilityLabel={`Remove ${contact.name}`}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: ResQColors.primaryRed,
  },
  infoContainer: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  contactName: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  primaryBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
  relationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  relationText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  phoneText: {
    fontSize: 13.5,
    fontFamily: typography.regular,
    color: "#334155",
  },
  actionSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
});

export default EmergencyContactCard;
