import Colors, { ResQColors } from "@/constants/Colors";
import { HotspotRecord } from "@/backend/hotspots";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { Clock, MapPin, Navigation, ShieldAlert, TriangleAlert, X } from "lucide-react-native";
import React from "react";
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

function formatUpdatedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface HotspotDetailModalProps {
  hotspot: HotspotRecord | null;
  visible: boolean;
  onClose: () => void;
  onNavigate: (hotspot: HotspotRecord) => void;
}

export default function HotspotDetailModal({
  hotspot,
  visible,
  onClose,
  onNavigate,
}: HotspotDetailModalProps) {
  if (!hotspot) return null;

  const risk = getRiskMeta(hotspot.risk_level);
  const hasImage = !!hotspot.images;
  const updatedText = formatUpdatedAt(hotspot.updated_at);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.grabHandle} />

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <ShieldAlert size={16} color={ResQColors.primaryRedText} strokeWidth={2.4} />
              <Text style={styles.headerTitle}>Hotspot Details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <X size={20} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Visual */}
          <View style={styles.visual}>
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
                <TriangleAlert size={44} color={risk.color} strokeWidth={2} />
              </View>
            )}
          </View>

          <View style={styles.body}>
            <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
              <TriangleAlert size={12} color={risk.color} strokeWidth={2.4} />
              <Text style={[styles.riskBadgeText, { color: risk.color }]}>{risk.label}</Text>
            </View>

            <Text style={styles.name}>{hotspot.name}</Text>

            <Text style={styles.description}>
              {hotspot.description || "No further details reported for this area yet. Stay alert and avoid travelling here alone if possible."}
            </Text>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <MapPin size={14} color={Colors.light.textMuted} strokeWidth={2.2} />
                <Text style={styles.metaCardValue}>
                  {hotspot.radius_meters ? `~${Math.round(hotspot.radius_meters)}m` : "Unknown"}
                </Text>
                <Text style={styles.metaCardLabel}>Radius</Text>
              </View>

              <View style={styles.metaCard}>
                <ShieldAlert size={14} color={Colors.light.textMuted} strokeWidth={2.2} />
                <Text style={styles.metaCardValue}>{hotspot.incident_count ?? 0}</Text>
                <Text style={styles.metaCardLabel}>
                  {hotspot.incident_count === 1 ? "Incident" : "Incidents"}
                </Text>
              </View>

              {updatedText && (
                <View style={styles.metaCard}>
                  <Clock size={14} color={Colors.light.textMuted} strokeWidth={2.2} />
                  <Text style={styles.metaCardValue}>{updatedText}</Text>
                  <Text style={styles.metaCardLabel}>Updated</Text>
                </View>
              )}
            </View>
          </View>

          <SafeAreaView style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.navigateButton}
              onPress={() => onNavigate(hotspot)}
              activeOpacity={0.85}
            >
              <Navigation size={17} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.navigateButtonText}>View on Map</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    overflow: "hidden",
  },
  grabHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  visual: {
    height: 160,
    width: "100%",
    position: "relative",
  },
  visualScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.15)",
  },
  visualPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  riskBadgeText: {
    fontSize: 11,
    fontFamily: typography.bold,
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    lineHeight: 21,
    marginBottom: 18,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  metaCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  metaCardValue: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  metaCardLabel: {
    fontSize: 10.5,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  navigateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.primary,
    height: 50,
    borderRadius: 12,
    width: "100%",
  },
  navigateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: typography.bold,
  },
});
