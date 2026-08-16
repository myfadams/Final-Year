import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  Check,
  Compass,
  MapPin,
  Navigation,
  Radio,
  ShieldAlert,
  X,
} from "lucide-react-native";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";

export interface SosMonitoringFloatingWindowProps {
  senderName?: string;
  senderAvatar?: string | null;
  distance: string;
  isRoutingActive: boolean;
  isLoadingRoute?: boolean;
  onToggleRoute: () => void;
  onConfirmArrival: () => void;
  onStopResponding: () => void;
  onClose?: () => void;
}

export const SosMonitoringFloatingWindow: React.FC<
  SosMonitoringFloatingWindowProps
> = ({
  senderName = "Someone in Distress",
  senderAvatar,
  distance,
  isRoutingActive,
  isLoadingRoute = false,
  onToggleRoute,
  onConfirmArrival,
  onStopResponding,
  onClose,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Live pulsing indicator effect
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Top Banner Row */}
      <View style={styles.headerRow}>
        <View style={styles.beaconBadge}>
          <ShieldAlert size={14} color="#FFFFFF" />
          <Text style={styles.beaconBadgeText}>ACTIVE SOS</Text>
        </View>

        {onClose && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sender Headline / Subtitle */}
      <View style={styles.senderSection}>
        {senderAvatar ? (
          <Image source={{ uri: senderAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>
              {senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.senderTextCol}>
          <Text style={styles.senderTitle} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={styles.senderSubtext}>Needs your urgent assistance</Text>
        </View>
      </View>

      {/* Live Status Indicators (Distance & Realtime GPS) */}
      <View style={styles.statusBox}>
        <View style={styles.statusItem}>
          <MapPin size={15} color={ResQColors.primaryRedText} />
          <Text style={styles.statusLabel}>Distance:</Text>
          <Text style={styles.statusValue}>{distance || "Calculating..."}</Text>
        </View>

        <View style={styles.statusDivider} />

        <View style={styles.statusItem}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.statusLabel}>Location:</Text>
          <Text style={styles.liveUpdatingText}>Updating live</Text>
        </View>
      </View>

      {/* Primary Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Toggle Route Navigation Button */}
        <TouchableOpacity
          style={[
            styles.routeBtn,
            isRoutingActive && styles.routeBtnActive,
          ]}
          onPress={onToggleRoute}
          activeOpacity={0.85}
          disabled={isLoadingRoute}
        >
          {isLoadingRoute ? (
            <ActivityIndicator
              size="small"
              color={isRoutingActive ? "#B91C1C" : "#FFFFFF"}
              style={{ marginRight: 8 }}
            />
          ) : (
            <Compass
              size={18}
              color={isRoutingActive ? "#B91C1C" : "#FFFFFF"}
              style={{ marginRight: 8 }}
            />
          )}
          <Text
            style={[
              styles.routeBtnText,
              isRoutingActive && styles.routeBtnTextActive,
            ]}
          >
            {isRoutingActive ? "HIDE ROUTE" : "SHOW ROUTE"}
          </Text>
        </TouchableOpacity>

        {/* Secondary Buttons Row: I've Arrived & Stop Responding */}
        <View style={styles.secondaryButtonRow}>
          <TouchableOpacity
            style={styles.arrivedBtn}
            onPress={onConfirmArrival}
            activeOpacity={0.85}
          >
            <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.arrivedBtnText}>I'VE ARRIVED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stopBtn}
            onPress={onStopResponding}
            activeOpacity={0.85}
          >
            <Text style={styles.stopBtnText}>STOP RESPONDING</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 115 : 82,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: "#FEE2E2",
    borderTopWidth: 5,
    borderTopColor: ResQColors.primaryRed,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  beaconBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ResQColors.primaryRed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  beaconBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: typography.bold,
    letterSpacing: 0.6,
  },
  closeBtn: {
    padding: 4,
  },
  senderSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ResQColors.primaryRedLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: ResQColors.primaryRedText,
  },
  senderTextCol: {
    flex: 1,
  },
  senderTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  senderSubtext: {
    fontSize: 12.5,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#64748B",
  },
  statusValue: {
    fontSize: 12.5,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  statusDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  liveUpdatingText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#16A34A",
  },
  actionsContainer: {
    gap: 8,
  },
  routeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResQColors.primaryRed,
    paddingVertical: 12,
    borderRadius: 12,
  },
  routeBtnActive: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1.5,
    borderColor: "#B91C1C",
  },
  routeBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: typography.bold,
    letterSpacing: 0.4,
  },
  routeBtnTextActive: {
    color: "#B91C1C",
  },
  secondaryButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  arrivedBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    borderRadius: 12,
  },
  arrivedBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: typography.bold,
    letterSpacing: 0.3,
  },
  stopBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 12,
  },
  stopBtnText: {
    color: "#64748B",
    fontSize: 12,
    fontFamily: typography.semibold,
  },
});
