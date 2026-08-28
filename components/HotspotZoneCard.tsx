import Colors, { ResQColors } from "@/constants/Colors";
import { HotspotRecord } from "@/backend/hotspots";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { ChevronRight, MapPin, TriangleAlert } from "lucide-react-native";
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
  const hasImage = !!hotspot.images;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Visual header — real photo when available, otherwise a risk-tinted icon panel */}
      <View style={styles.visualHeader}>
        {hasImage ? (
          <>
            <Image
              source={{ uri: hotspot.images! }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.visualScrim} />
          </>
        ) : (
          <View style={[styles.visualPlaceholder, { backgroundColor: `${risk.color}17` }]}>
            <TriangleAlert size={30} color={risk.color} strokeWidth={2} opacity={0.85} />
          </View>
        )}

        <View
          style={[
            styles.riskBadge,
            hasImage
              ? { backgroundColor: "rgba(15, 23, 42, 0.55)" }
              : { backgroundColor: risk.bg },
          ]}
        >
          <TriangleAlert size={11} color={hasImage ? "#FFFFFF" : risk.color} strokeWidth={2.4} />
          <Text
            style={[styles.riskBadgeText, { color: hasImage ? "#FFFFFF" : risk.color }]}
            numberOfLines={1}
          >
            {risk.label}
          </Text>
        </View>

        {hotspot.incident_count != null && hotspot.incident_count > 0 && (
          <View
            style={[
              styles.incidentBadge,
              hasImage
                ? { backgroundColor: "rgba(15, 23, 42, 0.55)" }
                : { backgroundColor: "#FFFFFF" },
            ]}
          >
            <Text style={[styles.incidentBadgeText, { color: hasImage ? "#FFFFFF" : Colors.light.textMuted }]}>
              {hotspot.incident_count} {hotspot.incident_count === 1 ? "incident" : "incidents"}
            </Text>
          </View>
        )}

        {hasImage && (
          <Text style={styles.nameOnImage} numberOfLines={1}>
            {hotspot.name}
          </Text>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        {!hasImage && (
          <Text style={styles.name} numberOfLines={1}>
            {hotspot.name}
          </Text>
        )}

        {hotspot.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {hotspot.description}
          </Text>
        ) : (
          <Text style={[styles.description, styles.descriptionFallback]} numberOfLines={2}>
            No further details reported for this area yet.
          </Text>
        )}

        <View style={styles.footerRow}>
          <View style={styles.footerMeta}>
            <MapPin size={12} color={Colors.light.textMuted} strokeWidth={2.2} />
            <Text style={styles.footerText} numberOfLines={1}>
              {hotspot.radius_meters
                ? `~${Math.round(hotspot.radius_meters)}m radius`
                : "Radius unknown"}
            </Text>
          </View>
          <View style={styles.detailsHint}>
            <Text style={styles.detailsHintText}>Details</Text>
            <ChevronRight size={14} color={Colors.light.primary} strokeWidth={2.4} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 264,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: ResQColors.border,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  visualHeader: {
    height: 104,
    width: "100%",
    position: "relative",
    justifyContent: "flex-end",
  },
  visualScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
  },
  visualPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  nameOnImage: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    paddingHorizontal: 12,
    paddingBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  riskBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "62%",
  },
  riskBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.bold,
    letterSpacing: 0.2,
  },
  incidentBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  incidentBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.semibold,
  },
  body: {
    padding: 14,
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
    marginBottom: 12,
  },
  descriptionFallback: {
    fontStyle: "italic",
    opacity: 0.75,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
  },
  detailsHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  detailsHintText: {
    fontSize: 11.5,
    fontFamily: typography.semibold,
    color: Colors.light.primary,
  },
});
