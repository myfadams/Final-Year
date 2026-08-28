import { UserProfile } from "@/backend/auth";
import { SosResponder } from "@/backend/sos";
import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { StatusBar } from "expo-status-bar";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  MessageSquareText,
  Radio,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type SosBroadcastState = "locating" | "uploading" | "broadcasting" | "failed";

interface SosBroadcastOverlayProps {
  // Countdown ("hold to activate") state
  isCountingDown: boolean;
  countdown: number;
  countdownScaleAnim: Animated.Value;

  // Active broadcast state
  alertActive: boolean;
  userProfile: UserProfile | null;
  sosBroadcastState: SosBroadcastState;
  sosBroadcastError: string | null;
  isLocationPaused: boolean;
  currentCoords: { lat: number; lng: number } | null;
  sosResponders: SosResponder[];
  onRetry: () => void;
  onStopBroadcast: () => void;
  onSendSms: () => void;
}

/**
 * The two full-screen modals shown while a user is holding down (countdown) or actively
 * broadcasting (live beacon) their own SOS. Split out of the home screen since neither modal
 * depends on anything else the home screen renders — only on the SOS session state itself.
 */
export default function SosBroadcastOverlay({
  isCountingDown,
  countdown,
  countdownScaleAnim,
  alertActive,
  userProfile,
  sosBroadcastState,
  sosBroadcastError,
  isLocationPaused,
  currentCoords,
  sosResponders,
  onRetry,
  onStopBroadcast,
  onSendSms,
}: SosBroadcastOverlayProps) {
  return (
    <>
      {/* While the broadcast overlay is showing, its background is solid primary red full-bleed
          (see senderOverlayBg) — switch the status bar to light/white content so it reads
          against that background instead of the default dark style. expo-status-bar merges
          this with whatever other StatusBar is mounted elsewhere, reverting automatically once
          this unmounts. */}
      {alertActive && (
        <StatusBar style="light" backgroundColor={ResQColors.primaryRed} />
      )}

      {/* SOS COUNTDOWN OVERLAY */}
      <Modal visible={isCountingDown} transparent={true} animationType="fade">
        <View style={styles.overlayBg}>
          <Animated.View
            style={[
              styles.countdownContainer,
              { transform: [{ scale: countdownScaleAnim }] },
            ]}
          >
            <Text style={styles.countdownTitle}>HOLDING SOS</Text>
            <Text style={styles.countdownSubtitle}>BROADCAST ACTIVE IN</Text>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
            <Text style={styles.countdownWarning}>
              Release button to cancel
            </Text>
          </Animated.View>
        </View>
      </Modal>

      {/* SOS BROADCASTING OVERLAY */}
      <Modal visible={alertActive} transparent={true} animationType="slide" statusBarTranslucent>
        <View style={styles.senderOverlayBg}>
          <ScrollView
            contentContainerStyle={styles.senderScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.senderContentWrapper}>
              {/* Top Emergency Icon with glowing circular badge */}
              <View style={styles.senderIconWrapper}>
                <Radio
                  size={36}
                  color="#FFFFFF"
                />
              </View>

              {/* Top Header Badge */}
              <View style={styles.senderBadgeContainer}>
                <Radio size={13} color="#FFFFFF" />
                <Text style={styles.senderBadgeText}>
                  EMERGENCY SOS BROADCAST ACTIVE
                </Text>
              </View>

              {/* Main Alert Headline */}
              <Text style={styles.senderModalTitle}>
                🚨 YOUR SOS BEACON IS LIVE
              </Text>

              {/* Rich Caller Profile Card */}
              <View style={styles.senderProfileRow}>
                {userProfile?.profile_img_url ? (
                  <Image
                    source={{ uri: userProfile.profile_img_url }}
                    style={styles.senderProfileAvatar}
                  />
                ) : (
                  <View style={styles.senderProfileAvatarPlaceholder}>
                    <Text style={styles.senderProfileAvatarInitial}>
                      {(userProfile?.name || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.senderProfileTextCol}>
                  <Text style={styles.senderProfileName}>
                    {userProfile?.name || "You (ResQ Resident)"}
                  </Text>
                  <Text style={styles.senderProfileSubtext}>
                    {userProfile?.program_of_study
                      ? `${userProfile.program_of_study} • `
                      : userProfile?.role
                        ? `${userProfile.role.toUpperCase()} • `
                        : ""}
                    Broadcasting Safety Circle & Security
                  </Text>
                </View>
              </View>

              {/* In-Overlay Live Progress Status Pill */}
              <View style={styles.statusIndicatorRow}>
                {sosBroadcastState === "locating" && (
                  <View style={styles.statusPill}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.statusPillText}>Locating precise GPS fix…</Text>
                  </View>
                )}
                {sosBroadcastState === "uploading" && (
                  <View style={styles.statusPill}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.statusPillText}>Transmitting alert to dispatch…</Text>
                  </View>
                )}
                {sosBroadcastState === "broadcasting" && (
                  <View style={[styles.statusPill, styles.statusPillActive]}>
                    <CheckCircle2 size={15} color="#4ADE80" style={{ marginRight: 6 }} />
                    <Text style={styles.statusPillText}>Live continuous GPS stream active</Text>
                  </View>
                )}
                {sosBroadcastState === "failed" && (
                  <View style={[styles.statusPill, styles.statusPillFailed]}>
                    <AlertTriangle size={15} color="#FCA5A5" style={{ marginRight: 6 }} />
                    <Text style={styles.statusPillText}>
                      {sosBroadcastError || "Alert broadcast failed"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Background Location Paused Warning Banner */}
              {isLocationPaused && (
                <View style={styles.pausedBanner}>
                  <AlertTriangle size={18} color="#9A3412" />
                  <Text style={styles.pausedBannerText}>
                    Live location stream paused while app is backgrounded. Reopen app to keep updating location.
                  </Text>
                </View>
              )}

              {/* Live Location / Coordinates Info Box */}
              <View style={styles.senderInfoBox}>
                <View style={styles.senderInfoRow}>
                  <MapPin size={18} color="#FFFFFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.senderInfoRowHeader}>Live GPS Coordinates (Google Maps format)</Text>
                    <Text style={styles.senderCoordinatesText}>
                      {currentCoords
                        ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`
                        : "Acquiring live GPS..."}
                    </Text>
                  </View>
                  <View style={styles.livePulsingDot} />
                </View>

                <View style={styles.senderInfoRow}>
                  <ShieldAlert size={18} color="#FFFFFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.senderInfoRowHeader}>Security Dispatch</Text>
                    <Text style={styles.senderInfoText}>
                      KNUST Campus Security & Safety Circle Notified
                    </Text>
                  </View>
                </View>
              </View>

              {/* Send SOS via SMS — reaches trusted contacts and Campus Security who aren't on
                  ResQ, via the phone's own native SMS composer */}
              <TouchableOpacity
                style={styles.smsButton}
                onPress={onSendSms}
              >
                <MessageSquareText size={18} color="#FFFFFF" />
                <Text style={styles.smsButtonText}>SEND SOS VIA SMS</Text>
              </TouchableOpacity>

              {/* Retry Button if broadcast failed */}
              {sosBroadcastState === "failed" && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRetry}
                >
                  <RefreshCw size={16} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>RETRY BROADCAST</Text>
                </TouchableOpacity>
              )}

              {/* Realtime Responders List */}
              <View style={styles.respondersCard}>
                <Text style={styles.respondersTitle}>
                  Active Responders ({sosResponders.length})
                </Text>
                {sosResponders.length > 0 ? (
                  <ScrollView style={{ maxHeight: 85 }} nestedScrollEnabled>
                    {sosResponders.map((res) => (
                      <View key={res.id} style={styles.responderRow}>
                        <UserCheck size={16} color="#4ADE80" />
                        <Text style={styles.responderName}>{res.name}</Text>
                        <Text style={styles.responderSourceBadge}>
                          {res.responder_source === "trusted_contact"
                            ? "Trusted Network"
                            : "Nearby ResQ User"}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noRespondersText}>
                    Waiting for nearby users or trusted contacts to commit help...
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={onStopBroadcast}
              >
                <ShieldAlert size={20} color={ResQColors.primaryRed} />
                <Text style={styles.stopButtonText}>STOP BROADCAST</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Shared with other unrelated modals on the home screen — duplicated here rather than
  // exported/shared, since it's a trivial one-off style.
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownContainer: {
    backgroundColor: ResQColors.cardSurface,
    padding: 30,
    borderRadius: 24,
    width: "80%",
    alignItems: "center",
    elevation: 10,
  },
  countdownTitle: {
    color: Colors.light.error,
    fontSize: 22,
    fontFamily: typography.bold,
    letterSpacing: 1,
  },
  countdownSubtitle: {
    color: Colors.light.textMuted,
    fontSize: 12,
    fontFamily: typography.medium,
    marginTop: 4,
  },
  countdownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 24,
  },
  countdownNumber: {
    fontSize: 48,
    fontFamily: typography.bold,
    color: Colors.light.primary,
  },
  countdownWarning: {
    color: Colors.light.textMuted,
    fontSize: 13,
    fontFamily: typography.regular,
  },
  pausedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  pausedBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.medium,
    color: "#9A3412",
    lineHeight: 16,
  },
  respondersCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  respondersTitle: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: Colors.light.textInverse,
    marginBottom: 8,
  },
  responderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  responderName: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: Colors.light.textInverse,
    flex: 1,
  },
  responderSourceBadge: {
    fontSize: 10,
    fontFamily: typography.medium,
    color: Colors.light.textInverse,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  noRespondersText: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "rgba(255, 255, 255, 0.8)",
    fontStyle: "italic",
  },
  senderOverlayBg: {
    flex: 1,
    backgroundColor: ResQColors.primaryRed,
  },
  senderScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === "android" ? 36 : 24,
  },
  senderContentWrapper: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    justifyContent: "center",
  },
  senderIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  senderBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  senderBadgeText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontFamily: typography.bold,
    letterSpacing: 0.8,
  },
  senderModalTitle: {
    fontSize: 21,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 14,
  },
  senderProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    padding: 14,
    borderRadius: 16,
    width: "100%",
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  senderProfileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  senderProfileAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  senderProfileAvatarInitial: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  senderProfileTextCol: {
    flex: 1,
  },
  senderProfileName: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  senderProfileSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontFamily: typography.regular,
    marginTop: 2,
  },
  senderInfoBox: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  senderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  senderInfoRowHeader: {
    fontSize: 11,
    fontFamily: typography.bold,
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.4,
  },
  senderCoordinatesText: {
    fontSize: 13.5,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    marginTop: 1,
  },
  senderInfoText: {
    fontSize: 12.5,
    fontFamily: typography.medium,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 1,
  },
  livePulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ADE80",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  statusIndicatorRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  statusPillActive: {
    backgroundColor: "rgba(74, 222, 128, 0.25)",
    borderColor: "#86EFAC",
  },
  statusPillFailed: {
    backgroundColor: "rgba(239, 68, 68, 0.35)",
    borderColor: "#FCA5A5",
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
  smsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  smsButtonText: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  stopButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginTop: 4,
  },
  stopButtonText: {
    color: ResQColors.primaryRed,
    fontFamily: typography.bold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
