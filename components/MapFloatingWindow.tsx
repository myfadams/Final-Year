import Colors from "@/constants/Colors";
import { Person } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { AlertTriangle, Check, Clock, MapPin, MoreHorizontal, Siren, X } from "lucide-react-native";
import React from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const URGENCY_LABELS = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
};

interface MapFloatingWindowProps {
  selectedPerson: Person;
  activeEmergency: Person | null;
  distance: string;
  duration: string;
  isNearLocation?: boolean;
  isArrived?: boolean;
  onClose: () => void;
  onRespondToggle: () => void;
  onConfirmArrival?: () => void;
  onOpenDetails: () => void;
}

export const MapFloatingWindow: React.FC<MapFloatingWindowProps> = ({
  selectedPerson,
  activeEmergency,
  distance,
  duration,
  isNearLocation = false,
  isArrived = false,
  onClose,
  onRespondToggle,
  onConfirmArrival,
  onOpenDetails,
}) => {
  const isResponding = activeEmergency?.id === selectedPerson.id;
  const parsedDuration = parseInt(duration.replace(/[^0-9]/g, ""), 10);
  const isResponseRestricted =
    selectedPerson.urgency === "critical" &&
    !isNaN(parsedDuration) &&
    parsedDuration > 5;

  const isFalseAlarm = Boolean(selectedPerson.falseAlarm || (selectedPerson as any).isFalseAlarm);

  return (
    <View
      style={[
        styles.floatingDetailCard,
        {
          borderTopColor: isFalseAlarm ? "#FDBA74" : Colors.URGENCY_COLORS[selectedPerson.urgency],
          borderTopWidth: 5,
        },
      ]}
    >
      <View style={styles.cardContentWrapper}>
        {/* Meta Row */}
        <View style={styles.cardMetaRow}>
          <View style={styles.metaBadgesWrapper}>
            <View
              style={[
                styles.urgencyBadge,
                {
                  backgroundColor:
                    Colors.URGENCY_BACKGROUND[selectedPerson.urgency],
                },
              ]}
            >
              <Text
                style={[
                  styles.urgencyBadgeText,
                  { color: Colors.URGENCY_COLORS[selectedPerson.urgency] },
                ]}
              >
                {URGENCY_LABELS[selectedPerson.urgency]}
              </Text>
            </View>

            {isFalseAlarm && (
              <View style={[styles.urgencyBadge, { backgroundColor: "#FFF7ED", borderColor: "#FDBA74", borderWidth: 1 }]}>
                <Text style={[styles.urgencyBadgeText, { color: "#C2410C" }]}>
                  FALSE ALARM
                </Text>
              </View>
            )}

            {/* Distance and ETA calculations with Lucide icons */}
            <View style={styles.metaInfoRow}>
              <MapPin size={12.5} color="#64748B" style={{ marginRight: 3 }} />
              <Text style={styles.distanceMetaText}>{distance}</Text>

              <View style={styles.metaInfoDotSeparator} />

              <Clock size={12.5} color="#64748B" style={{ marginRight: 3 }} />
              <Text style={styles.distanceMetaText}>{duration}</Text>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.cardCloseButton} onPress={onClose}>
            <X size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Title / Description */}
        <Text style={styles.cardIncidentTitle} numberOfLines={1}>
          {selectedPerson.name}
        </Text>
        <Text style={styles.cardIncidentDescription} numberOfLines={2}>
          {selectedPerson.description || selectedPerson.requesterDesc}
        </Text>

        {/* False Alarm Notice Banner */}
        {/* {isFalseAlarm && (
          <View
            style={{
              backgroundColor: "#FFF7ED",
              borderColor: "#FDBA74",
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertTriangle size={16} color="#C2410C" />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#C2410C", flex: 1 }}>
              Flagged as False Info by creator. Responding disabled.
            </Text>
          </View>
        )} */}

        {/* Actions Row */}
        <View style={styles.cardActionRow}>
          {selectedPerson.falseAlarm || (selectedPerson as any).isFalseAlarm ? (
            <TouchableOpacity
              style={[
                styles.disabledRespondBadge,
                { backgroundColor: "#FFF7ED", borderColor: "#FDBA74", borderWidth: 1 },
              ]}
              onPress={() => {
                Alert.alert(
                  "False Emergency Alert",
                  "The creator of this emergency flagged it as false information. You cannot respond to it."
                );
              }}
              activeOpacity={0.8}
            >
              <AlertTriangle size={15} color="#C2410C" style={{ marginRight: 5 }} />
              <Text style={[styles.disabledRespondBadgeText, { color: "#C2410C", fontWeight: "700" }]}>
                Flagged as False Info
              </Text>
            </TouchableOpacity>
          ) : isArrived ? (
            // Arrived Badge
            <View style={styles.arrivedCTAButton}>
              <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.arrivedCTAText}>Arrived at Scene</Text>
            </View>
          ) : isResponding ? (
            isNearLocation ? (
              // Proximity Triggered "I've Arrived" Button (only when actively responding AND 50m or less from incident)
              <TouchableOpacity
                style={styles.arriveCTAButton}
                onPress={onConfirmArrival}
                activeOpacity={0.85}
              >
                <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.arriveCTAText}>I've Arrived</Text>
              </TouchableOpacity>
            ) : (
              // Cancel Response Button (when responding but > 50m away)
              <TouchableOpacity
                style={[styles.respondCTAButton, styles.respondCTAActive]}
                onPress={onRespondToggle}
                activeOpacity={0.85}
              >
                <Siren
                  size={16}
                  color={Colors.URGENCY_COLORS.critical}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.respondCTAText,
                    { color: Colors.URGENCY_COLORS.critical },
                  ]}
                >
                  Cancel Response
                </Text>
              </TouchableOpacity>
            )
          ) : isResponseRestricted ? (
            // Disabled status indicator instead of respond button
            <View style={styles.disabledRespondBadge}>
              <X size={15} color="#94A3B8" style={{ marginRight: 5 }} />
              <Text style={styles.disabledRespondBadgeText}>
                {parsedDuration > 8
                  ? "Too Late to Respond"
                  : "Too Far Out to Respond"}
              </Text>
            </View>
          ) : (
            // Normal Primary Respond Button (when user is not responding)
            <TouchableOpacity
              style={[
                styles.respondCTAButton,
                {
                  backgroundColor:
                    Colors.URGENCY_COLORS[selectedPerson.urgency],
                },
              ]}
              onPress={onRespondToggle}
              activeOpacity={0.85}
            >
              <Siren size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={[styles.respondCTAText, { color: "#FFFFFF" }]}>
                Respond Now
              </Text>
            </TouchableOpacity>
          )}

          {/* Details Icon Button */}
          <TouchableOpacity
            style={styles.detailsOutlineButton}
            onPress={onOpenDetails}
            activeOpacity={0.85}
          >
            <MoreHorizontal size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingDetailCard: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 120 : 86,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 5,
  },
  cardContentWrapper: {
    flex: 1,
    padding: 18,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  metaBadgesWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
  },
  distanceMetaText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#64748B",
  },
  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaInfoDotSeparator: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
    marginHorizontal: 8,
  },
  cardCloseButton: {
    padding: 4,
  },
  cardIncidentTitle: {
    fontSize: 17,
    fontFamily: typography.semibold,
    color: "#0F172A",
    marginBottom: 4,
  },
  cardIncidentDescription: {
    fontSize: 13.5,
    fontFamily: typography.regular,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 14,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabledRespondBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    height: 40,
    borderRadius: 10,
  },
  disabledRespondBadgeText: {
    color: "#94A3B8",
    fontSize: 13.5,
    fontFamily: typography.semibold,
  },
  respondCTAButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 10,
  },
  respondCTAActive: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  respondCTAText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
  },
  detailsOutlineButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  arriveCTAButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 10,
    backgroundColor: "#16A34A",
  },
  arriveCTAText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
  arrivedCTAButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 10,
    backgroundColor: "#15803D",
  },
  arrivedCTAText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
});
