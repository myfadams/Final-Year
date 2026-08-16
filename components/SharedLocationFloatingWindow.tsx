import { SharedLocationPin } from "@/constants/globalState";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import {
  Clock,
  MapPin,
  Navigation,
  PhoneCall,
  Radio,
  ShieldCheck,
  User,
  X,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SharedLocationFloatingWindowProps {
  pin: SharedLocationPin;
  currentUserId?: string | null;
  distance?: string;
  duration?: string;
  onClose: () => void;
  onTrackToggle?: () => void;
}

export const SharedLocationFloatingWindow: React.FC<
  SharedLocationFloatingWindowProps
> = ({ pin, currentUserId, distance = "--", duration = "--", onClose, onTrackToggle }) => {
  const isWalkSafe = pin.type === "walk_safe";
  const isSender = pin.senderId === currentUserId;
  const canDismiss = !isWalkSafe || isSender;
  const now = Date.now();

  // Calculate elapsed time in minutes
  const elapsedMs = Math.max(0, now - pin.createdAt);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  // Check if snapshot is older than 5 mins (or re-opened after dismissal)
  const isReopenedSnapshot =
    !isWalkSafe && (elapsedMinutes >= 5 || pin.reopenedAt !== undefined);

  // Walk Safe Conditions
  const hasImOkay = Boolean(pin.hasImOkay);
  const isTrackingActive = Boolean(pin.isTrackingActive);

  // Show "Track Location" option if walk safe has no "I am okay" message in 10+ mins
  const canTrackLocation = isWalkSafe && !hasImOkay && elapsedMinutes >= 10;

  // Show "Call Emergency Services" option if walk safe has no "I am okay" message in 60+ mins (1 hour)
  const canCallEmergency = isWalkSafe && !hasImOkay && elapsedMinutes >= 60;

  const displayName = isSender ? "You" : pin.senderName;

  // Resolve card header description
  let cardDescription = pin.messageText;

  if (isWalkSafe) {
    if (!cardDescription) {
      cardDescription = isSender 
        ? `You requested a walk safe session live map movement` 
        : `${displayName} requested a walk safe session live map movement`;
    }
  } else {
    if (isReopenedSnapshot) {
      cardDescription =
        elapsedMinutes > 0
          ? `${displayName} ${isSender ? "were" : "was"} here ${elapsedMinutes} minutes ago`
          : `${displayName} ${isSender ? "were" : "was"} here some minutes ago`;
    } else if (!cardDescription) {
      cardDescription = `${displayName} shared location snapshot`;
    }
  }

  const handleEmergencyCall = () => {
    Alert.alert(
      "Emergency Services",
      `Are you sure you want to call emergency services regarding ${displayName}'s unconfirmed Walk Safe session?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call 112 / Emergency",
          style: "destructive",
          onPress: () => {
            Linking.openURL("tel:112").catch(() => {
              Alert.alert(
                "Call Failed",
                "Emergency services phone dialer could not be launched.",
              );
            });
          },
        },
      ],
    );
  };

  const handleClose = () => {
    if (isWalkSafe && !isSender) {
      Alert.alert(
        "Permission Denied",
        "Only the person who started this Walk Safe session can dismiss it."
      );
      return;
    }
    onClose();
  };

  return (
    <View
      style={[
        styles.floatingCard,
        {
          borderTopColor: isWalkSafe ? "#af101a" : "#0D9488",
        },
      ]}
    >
      <View style={styles.contentWrapper}>
        {/* Meta Header Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeftContainer}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isWalkSafe
                    ? "rgba(175, 16, 26, 0.1)"
                    : "rgba(13, 148, 136, 0.1)",
                },
              ]}
            >
              {isWalkSafe ? (
                <Radio size={11} color="#af101a" style={{ marginRight: 4 }} />
              ) : (
                <MapPin size={11} color="#0D9488" style={{ marginRight: 4 }} />
              )}
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isWalkSafe ? "#af101a" : "#0D9488" },
                ]}
              >
                {isWalkSafe ? "LIVE WALK SAFE" : "LOCATION SNAPSHOT"}
              </Text>
            </View>

            {/* Time / Distance Info */}
            <View style={styles.metaInfoRow}>
              <Clock size={11} color="#64748B" style={{ marginRight: 3 }} />
              <Text style={styles.metaInfoText} numberOfLines={1}>
                {pin.timestampText}
              </Text>
            </View>
          </View>

          {/* Close / Dismiss Button */}
          {canDismiss && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <X size={15} color="#475569" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sender Profile Header */}
        <View style={styles.senderHeader}>
          <View style={styles.avatarWrapper}>
            {pin.senderAvatar ? (
              <Image
                source={{ uri: pin.senderAvatar }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <User size={18} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.senderInfo}>
            <Text style={styles.senderName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.timeElapsedText}>
              {elapsedMinutes > 0 ? `${elapsedMinutes}m ago` : "Just now"}
            </Text>
          </View>
        </View>

        {/* Description Body */}
        {Boolean(cardDescription) && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {cardDescription}
          </Text>
        )}

        {/* Dynamic Action Buttons for Walk Safe */}
        {isWalkSafe && (
          <View style={styles.actionContainer}>
            {/* 1. "I'm Okay" confirmed safe badge */}
            {hasImOkay ? (
              <View style={styles.safeConfirmationBadge}>
                <ShieldCheck
                  size={16}
                  color="#166534"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.safeConfirmationText} numberOfLines={1}>
                  {displayName} confirmed safe (I'm Okay)
                </Text>
              </View>
            ) : (
              <>
                {/* 2. Track Location Button (Appears if >= 10 mins without "I am okay") */}
                {canTrackLocation && (
                  <TouchableOpacity
                    style={[
                      styles.trackButton,
                      isTrackingActive && styles.trackButtonActive,
                    ]}
                    onPress={onTrackToggle}
                    activeOpacity={0.85}
                  >
                    <Navigation
                      size={15}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.trackButtonText} numberOfLines={1}>
                      {isTrackingActive
                        ? `Stop Tracking (${distance} • ${duration})`
                        : "Track User Location"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 3. Call Emergency Services Button (Appears if >= 60 mins without "I am okay") */}
                {canCallEmergency && (
                  <TouchableOpacity
                    style={styles.emergencyCallButton}
                    onPress={handleEmergencyCall}
                    activeOpacity={0.85}
                  >
                    <PhoneCall
                      size={15}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={styles.emergencyCallButtonText}
                      numberOfLines={1}
                    >
                      Call Emergency Services (1h+ Unconfirmed)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Status indicator if less than 10 mins */}
                {!canTrackLocation && (
                  <View style={styles.statusIndicatorWrapper}>
                    <Clock
                      size={13}
                      color="#D97706"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.statusIndicatorText} numberOfLines={2}>
                      Walk Safe Active • Track option unlocks if no "I'm Okay"
                      in 10m ({Math.max(1, 10 - elapsedMinutes)}m remaining)
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingCard: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 120 : 86,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderTopWidth: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 10,
    overflow: "hidden",
  },
  contentWrapper: {
    padding: 14,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  metaLeftContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.2,
  },
  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  metaInfoText: {
    fontSize: 11,
    fontFamily: typography.semibold,
    color: "#64748B",
    flexShrink: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  senderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  avatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#64748B",
    justifyContent: "center",
    alignItems: "center",
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  timeElapsedText: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: "#64748B",
    marginTop: 1,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: "#334155",
    lineHeight: 18,
    marginBottom: 10,
  },
  actionContainer: {
    gap: 8,
    marginTop: 2,
  },
  safeConfirmationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  safeConfirmationText: {
    fontSize: 12.5,
    fontFamily: typography.semibold,
    color: "#166534",
    flex: 1,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#af101a",
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  trackButtonActive: {
    backgroundColor: "#0D9488",
  },
  trackButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: typography.semibold,
    flexShrink: 1,
  },
  emergencyCallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  emergencyCallButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontFamily: typography.bold,
    flexShrink: 1,
  },
  statusIndicatorWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusIndicatorText: {
    fontSize: 11,
    fontFamily: typography.semibold,
    color: "#B45309",
    flex: 1,
    lineHeight: 15,
  },
});
