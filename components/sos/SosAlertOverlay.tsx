import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
import { AlertTriangle, Heart, MapPin, ShieldAlert, User, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSosAlert } from "./SosAlertContext";
import { parseGeoPoint } from "@/backend/sos";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";

export const SosAlertOverlay: React.FC = () => {
  const { currentAlert, respondToCurrentAlert, dismissAlert } = useSosAlert();
  const [isResponding, setIsResponding] = useState(false);
  const router = useRouter();

  if (!currentAlert) return null;

  const isTrusted = currentAlert.source === "trusted_contact";
  const senderName = currentAlert.sender_profile?.name || "ResQ Resident";
  const senderAvatar = currentAlert.sender_profile?.avatar_url;
  const senderRole = currentAlert.sender_profile?.role;
  const senderProgram = currentAlert.sender_profile?.program_of_study;
  const distanceMeters = currentAlert.distance_meters;

  const distanceText =
    typeof distanceMeters === "number"
      ? distanceMeters < 1000
        ? `${distanceMeters}m away`
        : `${(distanceMeters / 1000).toFixed(1)}km away`
      : null;

  const handleRespond = async () => {
    if (isResponding || !currentAlert) return;
    setIsResponding(true);

    const alertId = currentAlert.id;
    const initialCoords = parseGeoPoint(currentAlert.location);

    try {
      const success = await respondToCurrentAlert();
      if (success) {
        router.push({
          pathname: "/(resident)/map",
          params: {
            sosAlertId: alertId,
            senderName: senderName,
            senderAvatar: senderAvatar || undefined,
            lat: initialCoords ? String(initialCoords.latitude) : undefined,
            lng: initialCoords ? String(initialCoords.longitude) : undefined,
          },
        });
      }
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <Modal
      visible={!!currentAlert}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlayBg}>
        <View style={styles.broadcastContainer}>
          {/* Top Emergency Icon */}
          <ShieldAlert
            size={60}
            color="#FFFFFF"
            style={styles.headerIcon}
          />

          {/* Top Header Badge */}
          <View style={styles.badgeContainer}>
            {isTrusted ? (
              <Heart size={15} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <AlertTriangle size={15} color="#FFFFFF" />
            )}
            <Text style={styles.badgeText}>
              {isTrusted
                ? "TRUSTED NETWORK ALERT"
                : "NEARBY PROXIMITY SOS"}
            </Text>
          </View>

          {/* Main Title */}
          <Text style={styles.alertTitle}>
            {isTrusted
              ? "🚨 TRUSTED CONTACT NEEDS HELP!"
              : "🚨 SOMEONE NEARBY NEEDS HELP"}
          </Text>

          {/* Frosted Glass Caller Profile Card */}
          <View style={styles.profileRow}>
            {senderAvatar ? (
              <Image source={{ uri: senderAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileTextCol}>
              <Text style={styles.senderName}>{senderName}</Text>
              <Text style={styles.senderSubtext}>
                {isTrusted
                  ? `Trusted safety circle${senderProgram ? ` • ${senderProgram}` : ""}`
                  : senderProgram
                  ? `${senderProgram}${distanceText ? ` • ${distanceText}` : ""}`
                  : senderRole
                  ? `${senderRole.charAt(0).toUpperCase() + senderRole.slice(1)}${distanceText ? ` • ${distanceText}` : ""}`
                  : distanceText
                  ? `Proximity alert • ${distanceText}`
                  : "Nearby Community Member"}
              </Text>
            </View>
          </View>

          {/* Description Text */}
          <Text style={styles.descriptionText}>
            {isTrusted
              ? `${senderName} has activated an SOS emergency broadcast. They are trusting you and their safety circle to respond.`
              : `${senderName} is in your immediate physical vicinity and has triggered an emergency SOS broadcast.`}
          </Text>

          {/* Frosted Location / Security Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <MapPin size={16} color="#FFFFFF" />
              <Text style={styles.infoText}>
                {distanceText
                  ? `Live GPS active • Approx. ${distanceText}`
                  : "Live GPS location broadcast active"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <ShieldAlert size={16} color="#FFFFFF" />
              <Text style={styles.infoText}>
                Campus security dispatch notified
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => dismissAlert(currentAlert.id)}
              disabled={isResponding}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.respondButton,
                (isResponding || !currentAlert) && { opacity: 0.8 },
              ]}
              onPress={handleRespond}
              disabled={isResponding || !currentAlert}
            >
              {isResponding ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color={ResQColors.primaryRed} size="small" />
                  <Text style={styles.respondButtonText}>Responding…</Text>
                </View>
              ) : (
                <Text style={styles.respondButtonText}>I CAN HELP</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayBg: {
    flex: 1,
    backgroundColor: ResQColors.primaryRed,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  broadcastContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: typography.bold,
    letterSpacing: 0.8,
  },
  alertTitle: {
    fontSize: 22,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    padding: 14,
    borderRadius: 16,
    width: "100%",
    marginBottom: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatarInitial: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  profileTextCol: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  senderSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontFamily: typography.regular,
    marginTop: 2,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: typography.regular,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#FFFFFF",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  dismissButtonText: {
    fontSize: 15,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
  respondButton: {
    flex: 1.5,
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  respondButtonText: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: ResQColors.primaryRed,
    letterSpacing: 0.5,
  },
});
