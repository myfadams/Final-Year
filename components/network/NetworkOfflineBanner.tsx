import React from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { WifiOff, RefreshCw, X } from "lucide-react-native";
import { typography } from "@/constants/typograyph";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NetworkOfflineBannerProps {
  visible: boolean;
  message?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const NetworkOfflineBanner: React.FC<NetworkOfflineBannerProps> = ({
  visible,
  message,
  onRetry,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const translateYAnim = React.useRef(new Animated.Value(-120)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateYAnim, {
          toValue: -120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          paddingTop: Math.max(insets.top, 12) + 6,
          transform: [{ translateY: translateYAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.iconCircle}>
          <WifiOff size={18} color="#FFFFFF" strokeWidth={2.3} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle}>Connection Offline</Text>
          <Text style={styles.bannerMessage} numberOfLines={2}>
            {message ||
              "Network request failed. Check your connection or try again."}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          {onRetry && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.8}
            >
              <RefreshCw size={13} color="#991B1B" strokeWidth={2.5} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}

          {onDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#991B1B" strokeWidth={2.3} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const SCREEN_WIDTH = Dimensions.get("window").width;

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FEE2E2",
    borderBottomWidth: 1.5,
    borderBottomColor: "#FCA5A5",
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowColor: "#7F1D1D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: typography.bold || "System",
    color: "#991B1B",
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 12,
    fontFamily: typography.regular || "System",
    color: "#7F1D1D",
    lineHeight: 16,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  retryText: {
    fontSize: 12,
    fontFamily: typography.bold || "System",
    color: "#991B1B",
  },
  dismissButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
});
