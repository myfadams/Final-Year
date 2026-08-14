import { UserResponderHistoryItem } from "@/backend/userEmergencies";
import { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { formatTimeAgo, getSeverityColors } from "@/externalFunctions/functions";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Footprints,
  MapPin,
  Navigation,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ResponderHistoryCardProps {
  item: UserResponderHistoryItem;
  onPress?: () => void;
}

export const ResponderHistoryCard: React.FC<ResponderHistoryCardProps> = ({
  item,
  onPress,
}) => {
  const router = useRouter();
  const emp = item.emergency;

  const respondedMs = item.respondedAt ? new Date(item.respondedAt).getTime() : Date.now();
  const ageSeconds = Math.max(0, Math.floor((Date.now() - respondedMs) / 1000));
  const timeAgoStr = formatTimeAgo(ageSeconds);

  const severity = (emp?.severity || "Moderate") as "Critical" | "Moderate" | "Low";
  const [severityBorder, severityBg] = getSeverityColors(
    emp?.isResolved ? "Resolved" : severity
  );

  const renderTransportIcon = () => {
    const mode = (item.transportMode || "").toLowerCase();
    if (mode.includes("bike") || mode.includes("bicycle")) {
      return <Bike size={12} color={DESIGN_COLORS.tertiary} />;
    }
    if (mode.includes("car") || mode.includes("vehicle") || mode.includes("drive")) {
      return <Car size={12} color={DESIGN_COLORS.tertiary} />;
    }
    return <Footprints size={12} color={DESIGN_COLORS.tertiary} />;
  };

  const renderStatusBadge = () => {
    switch (item.status) {
      case "arrived":
        return (
          <View style={[styles.badge, styles.arrivedBadge]}>
            <CheckCircle2 size={12} color={ResQColors.greenText} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: ResQColors.greenText }]}>Arrived at Scene</Text>
          </View>
        );
      case "done_helping":
        return (
          <View style={[styles.badge, styles.doneBadge]}>
            <CheckCircle2 size={12} color={DESIGN_COLORS.tertiary} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: DESIGN_COLORS.tertiary }]}>Assistance Completed</Text>
          </View>
        );
      case "cancelled":
        return (
          <View style={[styles.badge, styles.cancelledBadge]}>
            <XCircle size={12} color={ResQColors.badgeGrayText} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: ResQColors.badgeGrayText }]}>Response Cancelled</Text>
          </View>
        );
      case "responding":
      default:
        return (
          <View style={[styles.badge, styles.respondingBadge]}>
            <Navigation size={12} color={ResQColors.primaryRedText} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: ResQColors.primaryRedText }]}>En Route / Responding</Text>
          </View>
        );
    }
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else if (emp) {
      router.push({
        pathname: "/IncidentDetails",
        params: {
          id: emp.id,
          title: emp.title,
          description: emp.description || "",
          location: emp.nearestLandmark || emp.locationText,
          severity: emp.severity || "Moderate",
          isResolved: emp.isResolved ? "true" : "false",
        },
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleCardPress}
      style={styles.card}
    >
      <View style={styles.content}>
        {/* Header Row: Severity & Response Status */}
        <View style={styles.headerRow}>
          <View style={styles.badgeGroup}>
            {/* Status Badge */}
            {renderStatusBadge()}

            {/* Severity Badge */}
            <View style={[styles.badge, { backgroundColor: severityBg, borderColor: severityBorder }]}>
              <ShieldAlert size={12} color={severityBorder} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeText, { color: severityBorder }]}>
                {emp?.severity || "Emergency"}
              </Text>
            </View>
          </View>

          {/* Time Ago */}
          <View style={styles.timeRow}>
            <Clock size={12} color={ResQColors.textMuted} />
            <Text style={styles.timeText}>{timeAgoStr}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {emp?.title || "Emergency Response"}
        </Text>

        {/* Victim / Creator details */}
        {emp?.creatorName ? (
          <View style={styles.personRow}>
            <User size={13} color={ResQColors.textMuted} />
            <Text style={styles.personText}>Distress Victim: {emp.creatorName}</Text>
          </View>
        ) : null}

        {/* Meta Bar: Location & Transport Mode */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <MapPin size={14} color={ResQColors.primaryRedText} />
            <Text style={styles.metaText} numberOfLines={1}>
              {emp?.nearestLandmark || emp?.locationText || "Location unavailable"}
            </Text>
          </View>

          <View style={styles.metaRow}>
            {renderTransportIcon()}
            <Text style={[styles.metaText, { color: DESIGN_COLORS.tertiary, fontWeight: "600" }]}>
              {item.transportMode || "Foot"}
            </Text>
          </View>
        </View>

        {/* Response Timestamps */}
        <View style={styles.timelineBox}>
          <Text style={styles.timelineLabel}>Response Log:</Text>
          <Text style={styles.timelineText}>
            • Dispatched: {item.respondedAt ? new Date(item.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
          </Text>
          {item.actualArrivalAt ? (
            <Text style={styles.timelineText}>
              • Arrived: {new Date(item.actualArrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : item.cancelledAt ? (
            <Text style={styles.timelineText}>
              • Cancelled: {new Date(item.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
        </View>

        {/* Footer Action */}
        <View style={styles.footerRow}>
          <Text style={styles.footerHelpText}>You acted as responder</Text>
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>View Incident</Text>
            <ArrowRight size={14} color={ResQColors.primaryRedText} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ResponderHistoryCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ResQColors.border,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
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
    fontSize: 11,
    fontWeight: "700",
  },
  respondingBadge: {
    backgroundColor: ResQColors.primaryRedLight,
    borderColor: ResQColors.primaryRedBorder,
  },
  arrivedBadge: {
    backgroundColor: ResQColors.greenBg,
    borderColor: "#BBF7D0",
  },
  doneBadge: {
    backgroundColor: DESIGN_COLORS.surfaceContainer,
    borderColor: DESIGN_COLORS.surfaceDim,
  },
  cancelledBadge: {
    backgroundColor: ResQColors.badgeGrayBg,
    borderColor: "#CBD5E1",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: ResQColors.textMuted,
    fontWeight: "500",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: ResQColors.textPrimary,
    marginBottom: 4,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  personText: {
    fontSize: 13,
    color: ResQColors.textSecondary,
    fontWeight: "500",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
    color: ResQColors.textSecondary,
    fontWeight: "500",
  },
  timelineBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: ResQColors.textMuted,
    marginBottom: 2,
  },
  timelineText: {
    fontSize: 11,
    color: ResQColors.textSecondary,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: ResQColors.borderSubtle,
    paddingTop: 10,
  },
  footerHelpText: {
    fontSize: 12,
    color: ResQColors.textMuted,
    fontWeight: "500",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: ResQColors.primaryRedText,
  },
});
