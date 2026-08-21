import Colors, { ResQColors } from "@/constants/Colors";
import { HotspotRecord } from "@/backend/hotspots";
import { typography } from "@/constants/typograyph";
import { MapPin, TriangleAlert } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface RiskMeta {
  label: string;
  color: string;
  bg: string;
}

function getRiskMeta(riskLevel: string | null): RiskMeta {
  switch ((riskLevel || "").toLowerCase()) {
    case "critical":
      return { label: "Critical Risk", color: Colors.URGENCY_COLORS.critical, bg: Colors.URGENCY_BACKGROUND.critical };
    case "high":
      return { label: "High Risk", color: Colors.URGENCY_COLORS.high, bg: Colors.URGENCY_BACKGROUND.high };
    case "medium":
      return { label: "Medium Risk", color: Colors.URGENCY_COLORS.medium, bg: Colors.URGENCY_BACKGROUND.medium };
    case "low":
      return { label: "Low Risk", color: ResQColors.greenText, bg: ResQColors.greenBg };
    default:
      return { label: "Caution Area", color: ResQColors.badgeGrayText, bg: ResQColors.badgeGrayBg };
  }
}

interface HotspotZoneCardProps {
  hotspot: HotspotRecord;
  onPress: () => void;
}

export default function HotspotZoneCard({ hotspot, onPress }: HotspotZoneCardProps) {
  const risk = getRiskMeta(hotspot.risk_level);

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: risk.bg }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.accentBar, { backgroundColor: risk.color }]} />

      <View style={styles.headerRow}>
        <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
          <TriangleAlert size={11} color={risk.color} strokeWidth={2.4} />
          <Text style={[styles.riskBadgeText, { color: risk.color }]} numberOfLines={1}>
            {risk.label}
          </Text>
        </View>
        {hotspot.incident_count != null && hotspot.incident_count > 0 && (
          <Text style={styles.incidentCountText}>
            {hotspot.incident_count} {hotspot.incident_count === 1 ? "incident" : "incidents"}
          </Text>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {hotspot.name}
      </Text>

      {hotspot.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {hotspot.description}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <MapPin size={12} color={Colors.light.textMuted} strokeWidth={2.2} />
        <Text style={styles.footerText} numberOfLines={1}>
          {hotspot.radius_meters
            ? `~${Math.round(hotspot.radius_meters)}m radius • Tap to view on map`
            : "Tap to view on map"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    minHeight: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    paddingLeft: 18,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "70%",
  },
  riskBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.bold,
    letterSpacing: 0.2,
  },
  incidentCountText: {
    fontSize: 11,
    fontFamily: typography.semibold,
    color: Colors.light.textMuted,
  },
  name: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    lineHeight: 17,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: "auto",
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
  },
});
