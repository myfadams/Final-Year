import { CreatedEmergencyRecord } from "@/backend/userEmergencies";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { formatTimeAgo, getSeverityColors } from "@/externalFunctions/functions";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  Users,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CreatedEmergencyCardProps {
  item: CreatedEmergencyRecord;
  onPress?: () => void;
}

export const CreatedEmergencyCard: React.FC<CreatedEmergencyCardProps> = ({
  item,
  onPress,
}) => {
  const router = useRouter();

  const createdMs = item.created_at ? new Date(item.created_at).getTime() : Date.now();
  const ageSeconds = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
  const timeAgoStr = formatTimeAgo(ageSeconds);

  const severity = (item.severity || "Moderate") as "Critical" | "Moderate" | "Low";
  const [severityBorder, severityBg] = getSeverityColors(
    item.is_resolved ? "Resolved" : severity
  );

  const isResolved = item.is_resolved ?? false;
  const isFalseAlarm = item.false_alarm ?? false;

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: "/IncidentDetails",
        params: {
          id: item.id,
          title: item.title,
          description: item.description || "",
          location: item.nearest_landmark || item.location_text,
          severity: item.severity || "Moderate",
          isResolved: isResolved ? "true" : "false",
        },
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleCardPress}
      style={[
        styles.card,
        {
          borderColor: severityBorder,
        },
      ]}
    >
      {/* Top Accent Line */}
      <View style={[styles.topLine, { backgroundColor: severityBorder }]} />

      <View style={styles.content}>
        {/* Header Row: Badges */}
        <View style={styles.headerRow}>
          <View style={styles.badgeGroup}>
            {/* Severity Badge */}
            <View style={[styles.badge, { backgroundColor: severityBg, borderColor: severityBorder }]}>
              <ShieldAlert size={12} color={severityBorder} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeText, { color: severityBorder }]}>
                {item.severity || "Emergency"}
              </Text>
            </View>

            {/* Status Badge */}
            {isFalseAlarm ? (
              <View style={[styles.badge, styles.falseAlarmBadge]}>
                <AlertTriangle size={12} color={ResQColors.orangeText} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, { color: ResQColors.orangeText }]}>
                  False Alarm
                </Text>
              </View>
            ) : isResolved ? (
              <View style={[styles.badge, styles.resolvedBadge]}>
                <CheckCircle2 size={12} color={ResQColors.greenText} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, { color: ResQColors.greenText }]}>
                  Resolved
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.activeBadge]}>
                <View style={styles.livePulseDot} />
                <Text style={[styles.badgeText, { color: ResQColors.primaryRedText }]}>
                  Active Distress
                </Text>
              </View>
            )}
          </View>

          {/* Time Ago */}
          <View style={styles.timeRow}>
            <Clock size={12} color={ResQColors.textMuted} />
            <Text style={styles.timeText}>{timeAgoStr}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Description preview if present */}
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Location & Responder Info Bar */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <MapPin size={14} color={ResQColors.primaryRedText} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.nearest_landmark || item.location_text}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Users size={14} color={DESIGN_COLORS.tertiary} />
            <Text style={[styles.metaText, { color: DESIGN_COLORS.tertiary, fontWeight: "600" }]}>
              {item.activeRespondersCount ?? item.responders_count ?? 0} Responders
            </Text>
          </View>
        </View>

        {/* Footer Action */}
        <View style={styles.footerRow}>
          <Text style={styles.footerHelpText}>Reported by you</Text>
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>View Details</Text>
            <ArrowRight size={14} color={ResQColors.primaryRedText} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CreatedEmergencyCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topLine: {
    height: 4,
    width: "100%",
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
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: ResQColors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
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
