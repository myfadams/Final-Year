import {
  CreatedEmergencyRecord,
  markEmergencyFalseAlarm,
  markEmergencyResolved,
  UserResponderHistoryItem,
} from "@/backend/userEmergencies";
import { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { formatTimeAgo, getSeverityColors } from "@/externalFunctions/functions";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  ShieldAlert,
  Users,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import HeartBeatWave from "./HeartBeatWave";

interface EmergencyDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  createdItem?: CreatedEmergencyRecord | null;
  historyItem?: UserResponderHistoryItem | null;
  onStatusUpdated?: () => void;
}

export const EmergencyDetailsModal: React.FC<EmergencyDetailsModalProps> = ({
  visible,
  onClose,
  createdItem,
  historyItem,
  onStatusUpdated,
}) => {
  const router = useRouter();

  // Confirmation step state for False Alarm
  const [showConfirmFalseAlarm, setShowConfirmFalseAlarm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  if (!visible) return null;

  // Determine underlying emergency data
  const isCreated = !!createdItem;
  const emergencyId = createdItem?.id || historyItem?.emergency?.id || "";
  const title = createdItem?.title || historyItem?.emergency?.title || "Emergency Details";
  const description =
    createdItem?.description || historyItem?.emergency?.description || "No description provided.";
  const locationText =
    createdItem?.nearest_landmark ||
    createdItem?.location_text ||
    historyItem?.emergency?.nearestLandmark ||
    historyItem?.emergency?.locationText ||
    "Location unavailable";

  const rawSeverity = (createdItem?.severity || historyItem?.emergency?.severity || "Moderate") as
    | "Critical"
    | "Moderate"
    | "Low";

  const isResolved = createdItem?.is_resolved ?? historyItem?.emergency?.isResolved ?? false;
  const isFalseAlarm = createdItem?.false_alarm ?? historyItem?.emergency?.falseAlarm ?? false;
  const respondersCount = createdItem?.activeRespondersCount ?? createdItem?.responders_count ?? historyItem?.emergency?.respondersCount ?? 0;

  const createdMs = createdItem?.created_at
    ? new Date(createdItem.created_at).getTime()
    : historyItem?.emergency?.createdAt
      ? new Date(historyItem.emergency.createdAt).getTime()
      : Date.now();
  const timeAgoStr = formatTimeAgo(Math.max(0, Math.floor((Date.now() - createdMs) / 1000)));

  const [severityBorder, severityBg] = getSeverityColors(
    isResolved ? "Resolved" : rawSeverity
  );

  // Handle setting false alarm
  const handleMarkFalseAlarm = async () => {
    if (!emergencyId) return;
    setIsUpdating(true);
    setUpdateError(null);

    const res = await markEmergencyFalseAlarm(emergencyId);
    setIsUpdating(false);

    if (res.error) {
      setUpdateError(res.error.message);
    } else {
      setShowConfirmFalseAlarm(false);
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    }
  };

  // Handle setting resolved
  const handleMarkResolved = async () => {
    if (!emergencyId) return;
    setIsUpdating(true);
    setUpdateError(null);

    const res = await markEmergencyResolved(emergencyId);
    setIsUpdating(false);

    if (res.error) {
      setUpdateError(res.error.message);
    } else {
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    }
  };

  const handleOpenChat = () => {
    onClose();
    router.push({
      pathname: "/emergencyChat",
      params: {
        incidentId: emergencyId,
        title,
        severity: rawSeverity,
        location: locationText,
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.modalTitle}>
                {isCreated ? "Your Created Emergency" : "Responder History Details"}
              </Text>
              <Text style={styles.modalSub}>
                ID: #{emergencyId ? emergencyId.substring(0, 8) : "N/A"}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={ResQColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Status & Severity Header Row */}
            <View style={styles.statusRow}>
              {/* Severity */}
              <View style={[styles.badge, { backgroundColor: severityBg, borderColor: severityBorder }]}>
                <ShieldAlert size={13} color={severityBorder} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, { color: severityBorder }]}>{rawSeverity}</Text>
              </View>

              {/* Status */}
              {isFalseAlarm ? (
                <View style={[styles.badge, styles.falseAlarmBadge]}>
                  <AlertTriangle size={13} color={ResQColors.orangeText} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: ResQColors.orangeText }]}>False Alarm</Text>
                </View>
              ) : isResolved ? (
                <View style={[styles.badge, styles.resolvedBadge]}>
                  <CheckCircle2 size={13} color={ResQColors.greenText} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: ResQColors.greenText }]}>Resolved</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.activeBadge]}>
                  <View style={styles.livePulseDot} />
                  <Text style={[styles.badgeText, { color: ResQColors.primaryRedText }]}>Active Distress</Text>
                </View>
              )}

              {/* Responders Count */}
              <View style={styles.respondersPill}>
                <Users size={13} color={DESIGN_COLORS.tertiary} style={{ marginRight: 4 }} />
                <Text style={styles.respondersPillText}>{respondersCount} Responders</Text>
              </View>
            </View>

            {/* Emergency Title */}
            <Text style={styles.incidentTitle}>{title}</Text>

            {/* Location & Time Box */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MapPin size={16} color={ResQColors.primaryRedText} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Location Landmark</Text>
                  <Text style={styles.infoValue}>{locationText}</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Clock size={16} color={ResQColors.textMuted} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Reported Time</Text>
                  <Text style={styles.infoValue}>{timeAgoStr}</Text>
                </View>
              </View>
            </View>

            {/* False Alarm Notice Banner */}
            {isFalseAlarm && (
              <View
                style={{
                  backgroundColor: "#FFF7ED",
                  borderColor: "#FDBA74",
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  marginVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <AlertTriangle size={22} color={ResQColors.orangeText} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: "700", color: ResQColors.orangeText }}>
                    Flagged as False Emergency Information
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9A3412", marginTop: 2, lineHeight: 16 }}>
                    The creator of this incident flagged it as false information. Active response and emergency operations have been terminated.
                  </Text>
                </View>
              </View>
            )}

            {/* Description Box */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>Incident Description</Text>
              <Text style={styles.descriptionText}>{description}</Text>
            </View>

            {/* If Responder History: Show response details */}
            {historyItem ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Responder Log & Status</Text>

                <View style={styles.historyMetaRow}>
                  <Text style={styles.metaLabel}>Transport Mode:</Text>
                  <Text style={styles.metaVal}>{historyItem.transportMode || "Foot"}</Text>
                </View>

                {historyItem.emergency?.creatorName ? (
                  <View style={styles.historyMetaRow}>
                    <Text style={styles.metaLabel}>Victim Name:</Text>
                    <Text style={styles.metaVal}>{historyItem.emergency.creatorName}</Text>
                  </View>
                ) : null}

                <View style={styles.historyMetaRow}>
                  <Text style={styles.metaLabel}>Response Status:</Text>
                  <Text style={[styles.metaVal, { textTransform: "capitalize" }]}>
                    {historyItem.status === "done_helping" ? "Assistance Completed" : historyItem.status}
                  </Text>
                </View>

                <View style={styles.timelineContainer}>
                  <Text style={styles.timelineHeader}>Timestamps Log:</Text>
                  <Text style={styles.timelineItem}>
                    • Responded: {historyItem.respondedAt ? new Date(historyItem.respondedAt).toLocaleTimeString() : "N/A"}
                  </Text>
                  {historyItem.actualArrivalAt ? (
                    <Text style={styles.timelineItem}>
                      • Arrived: {new Date(historyItem.actualArrivalAt).toLocaleTimeString()}
                    </Text>
                  ) : historyItem.cancelledAt ? (
                    <Text style={styles.timelineItem}>
                      • Cancelled: {new Date(historyItem.cancelledAt).toLocaleTimeString()}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Error Message */}
            {updateError ? (
              <View style={styles.errorBox}>
                <AlertTriangle size={16} color={ResQColors.orangeText} />
                <Text style={styles.errorText}>{updateError}</Text>
              </View>
            ) : null}

            {/* ACTION CONTROLS */}
            <View style={styles.actionsContainer}>
              {/* Emergency Chat Button (only for emergencies created by you) */}
              {isCreated && emergencyId && !isFalseAlarm ? (
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={handleOpenChat}
                  activeOpacity={0.85}
                >
                  <MessageSquare size={16} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.chatBtnText}>Open Emergency Chat</Text>
                </TouchableOpacity>
              ) : null}

              {/* For Created Emergencies: False Alarm & Resolve buttons if active */}
              {isCreated && !isResolved && !isFalseAlarm ? (
                <>
                  <TouchableOpacity
                    style={styles.falseAlarmBtn}
                    onPress={() => setShowConfirmFalseAlarm(true)}
                    disabled={isUpdating}
                    activeOpacity={0.85}
                  >
                    <AlertTriangle size={16} color={ResQColors.orangeText} style={{ marginRight: 6 }} />
                    <Text style={styles.falseAlarmBtnText}>Flag as False Emergency</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={handleMarkResolved}
                    disabled={isUpdating}
                    activeOpacity={0.85}
                  >
                    {isUpdating ? (
                      // <ActivityIndicator color="#FFFFFF" size="small" />
                      <HeartBeatWave width={84} height={29} color={"#FFFFFF"} thickness={14.5} />
                    ) : (
                      <>
                        <CheckCircle2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </ScrollView>

          {/* CONFIRMATION OVERLAY FOR FALSE ALARM */}
          {showConfirmFalseAlarm ? (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmIconBg}>
                  <AlertTriangle size={32} color={ResQColors.orangeText} />
                </View>

                <Text style={styles.confirmTitle}>Confirm False Emergency?</Text>
                <Text style={styles.confirmSub}>
                  Are you sure you want to set this incident's status to False Alarm? This will notify responders and resolve the emergency.
                </Text>

                <View style={styles.confirmButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelConfirmBtn}
                    onPress={() => setShowConfirmFalseAlarm(false)}
                    disabled={isUpdating}
                  >
                    <Text style={styles.cancelConfirmText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptConfirmBtn}
                    onPress={handleMarkFalseAlarm}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.acceptConfirmText}>Yes, False Alarm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export default EmergencyDetailsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: ResQColors.cardSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: ResQColors.border,
  },
  headerTitleGroup: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ResQColors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: ResQColors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: ResQColors.cardSurfaceSoft,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  activeBadge: {
    backgroundColor: ResQColors.primaryRedLight,
    borderColor: ResQColors.primaryRedBorder,
  },
  resolvedBadge: {
    backgroundColor: ResQColors.greenBg,
    borderColor: "#BBF7D0",
  },
  falseAlarmBadge: {
    backgroundColor: ResQColors.orangeBg,
    borderColor: "#FED7AA",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ResQColors.primaryRed,
    marginRight: 4,
  },
  respondersPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.surfaceContainer,
  },
  respondersPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: DESIGN_COLORS.tertiary,
  },
  incidentTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: ResQColors.textPrimary,
    marginBottom: 14,
    lineHeight: 26,
  },
  infoCard: {
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ResQColors.borderSubtle,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: ResQColors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: ResQColors.textPrimary,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: ResQColors.border,
    marginVertical: 10,
  },
  sectionBox: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: ResQColors.textPrimary,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13.5,
    color: ResQColors.textSecondary,
    lineHeight: 20,
  },
  historyMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: ResQColors.textMuted,
    fontWeight: "500",
  },
  metaVal: {
    fontSize: 13,
    color: ResQColors.textPrimary,
    fontWeight: "700",
  },
  timelineContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timelineHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: ResQColors.textMuted,
    marginBottom: 4,
  },
  timelineItem: {
    fontSize: 12,
    color: ResQColors.textSecondary,
    fontWeight: "500",
    marginTop: 2,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.orangeBg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: ResQColors.orangeText,
    fontWeight: "600",
    flex: 1,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    paddingVertical: 12,
    borderRadius: 12,
  },
  chatBtnText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  falseAlarmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResQColors.orangeBg,
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingVertical: 12,
    borderRadius: 12,
  },
  falseAlarmBtnText: {
    color: ResQColors.orangeText,
    fontSize: 14,
    fontWeight: "700",
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResQColors.primaryRed,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resolveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderWidth: 1,
    borderColor: ResQColors.border,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  detailsBtnText: {
    color: ResQColors.primaryRedText,
    fontSize: 14,
    fontWeight: "700",
  },

  /* Confirmation Overlay */
  confirmOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  confirmCard: {
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  confirmIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ResQColors.orangeBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ResQColors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmSub: {
    fontSize: 13,
    color: ResQColors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderWidth: 1,
    borderColor: ResQColors.border,
    alignItems: "center",
  },
  cancelConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: ResQColors.textSecondary,
  },
  acceptConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ResQColors.orangeText,
    alignItems: "center",
  },
  acceptConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
