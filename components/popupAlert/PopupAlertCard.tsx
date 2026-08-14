import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  HelpCircle,
  X,
  ShieldAlert,
} from "lucide-react-native";
import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";

export type AlertType = "info" | "success" | "warning" | "error" | "confirm";

export interface PopupAlertButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface PopupAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
  type?: AlertType;
}

export interface PopupAlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: PopupAlertButton[];
  type?: AlertType;
  options?: PopupAlertOptions;
}

interface PopupAlertCardProps {
  alert: PopupAlertState;
  onClose: () => void;
}

export const PopupAlertCard: React.FC<PopupAlertCardProps> = ({
  alert,
  onClose,
}) => {
  const { visible, title, message, buttons, type, options } = alert;
  const scaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (visible) {
      // Spring pop animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

      // Subtle pulse animation on icon badge
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  // Infer alert type if not explicitly set
  let resolvedType: AlertType = type || "info";
  if (!type && buttons && buttons.length > 0) {
    const hasDestructive = buttons.some((b) => b.style === "destructive");
    if (hasDestructive) {
      resolvedType = "error";
    } else if (buttons.length > 1) {
      resolvedType = "confirm";
    }
  }

  // Define icon & accent colors based on type
  const getTypeDetails = () => {
    switch (resolvedType) {
      case "success":
        return {
          icon: <CheckCircle2 size={34} color="#059669" strokeWidth={2.2} />,
          outerRingBg: "#D1FAE5",
          innerBadgeBg: "#ECFDF5",
          borderColor: "#A7F3D0",
          accentColor: "#059669",
          badgeBorder: "#6EE7B7",
          topBarColor: "#10B981",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={34} color="#D97706" strokeWidth={2.2} />,
          outerRingBg: "#FEF3C7",
          innerBadgeBg: "#FFFBEB",
          borderColor: "#FDE68A",
          accentColor: "#D97706",
          badgeBorder: "#FCD34D",
          topBarColor: "#F59E0B",
        };
      case "error":
        return {
          icon: <ShieldAlert size={34} color="#DC2626" strokeWidth={2.2} />,
          outerRingBg: "#FEE2E2",
          innerBadgeBg: "#FEF2F2",
          borderColor: "#FECACA",
          accentColor: "#DC2626",
          badgeBorder: "#FCA5A5",
          topBarColor: "#EF4444",
        };
      case "confirm":
        return {
          icon: <HelpCircle size={34} color={ResQColors.primaryRed || "#AF101A"} strokeWidth={2.2} />,
          outerRingBg: "#FEE2E2",
          innerBadgeBg: "#FEF2F2",
          borderColor: "#FECACA",
          accentColor: ResQColors.primaryRed || "#AF101A",
          badgeBorder: "#FCA5A5",
          topBarColor: ResQColors.primaryRed || "#AF101A",
        };
      case "info":
      default:
        return {
          icon: <Info size={34} color={ResQColors.primaryRed || "#AF101A"} strokeWidth={2.2} />,
          outerRingBg: "#FEE2E2",
          innerBadgeBg: "#FEF2F2",
          borderColor: "#FECACA",
          accentColor: ResQColors.primaryRed || "#AF101A",
          badgeBorder: "#FCA5A5",
          topBarColor: ResQColors.primaryRed || "#AF101A",
        };
    }
  };

  const typeConfig = getTypeDetails();
  const isCancelable = options?.cancelable ?? true;

  const handleBackdropPress = () => {
    if (isCancelable) {
      options?.onDismiss?.();
      onClose();
    }
  };

  const rawButtons: PopupAlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: "OK", style: "default" }];

  // Determine if buttons should stack vertically
  // If any button text is long (> 10 chars) or if there are 3+ buttons, stack vertically
  const hasLongText = rawButtons.some(
    (b) => (b.text || "OK").length > 10 || (b.text || "").includes("\n")
  );
  const isStacked = rawButtons.length > 2 || hasLongText;

  // When stacked, reorder so main action is on top, cancel is at bottom
  let displayButtons = [...rawButtons];
  if (isStacked && displayButtons.length === 2) {
    const cancelIdx = displayButtons.findIndex((b) => b.style === "cancel");
    if (cancelIdx === 0) {
      // Put non-cancel button first (top) and cancel button second (bottom)
      displayButtons = [displayButtons[1], displayButtons[0]];
    }
  }

  const handleButtonPress = (btn: PopupAlertButton) => {
    onClose();
    btn.onPress?.();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleBackdropPress}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.cardContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              {/* Top Accent Strip */}
              <View
                style={[
                  styles.topAccentBar,
                  { backgroundColor: typeConfig.topBarColor },
                ]}
              />

              {/* Close Button Header */}
              {isCancelable && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleBackdropPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#64748B" strokeWidth={2.2} />
                </TouchableOpacity>
              )}

              {/* Dual Ring Icon Badge */}
              <View style={styles.iconWrapper}>
                <Animated.View
                  style={[
                    styles.outerIconRing,
                    {
                      backgroundColor: typeConfig.outerRingBg,
                      borderColor: typeConfig.borderColor,
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.innerIconBadge,
                    {
                      backgroundColor: typeConfig.innerBadgeBg,
                      borderColor: typeConfig.badgeBorder,
                    },
                  ]}
                >
                  {typeConfig.icon}
                </View>
              </View>

              {/* Title & Body Content */}
              <View style={styles.contentContainer}>
                <Text style={styles.title}>{title}</Text>
                {message ? (
                  <Text style={styles.message}>{message}</Text>
                ) : null}
              </View>

              {/* Action Buttons Container */}
              <View
                style={[
                  styles.buttonContainerBase,
                  isStacked ? styles.buttonColumn : styles.buttonRow,
                ]}
              >
                {displayButtons.map((btn, index) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";

                  let btnStyle: StyleProp<ViewStyle> = styles.primaryButton;
                  let textStyle: StyleProp<TextStyle> = styles.primaryButtonText;

                  if (isCancel) {
                    btnStyle = styles.cancelButton;
                    textStyle = styles.cancelButtonText;
                  } else if (isDestructive) {
                    btnStyle = styles.destructiveButton;
                    textStyle = styles.destructiveButtonText;
                  } else {
                    btnStyle = [
                      styles.primaryButton,
                      { backgroundColor: typeConfig.accentColor },
                    ];
                    textStyle = styles.primaryButtonText;
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.baseButton,
                        btnStyle,
                        !isStacked && styles.halfButton,
                        isStacked && styles.fullWidthButton,
                      ]}
                      onPress={() => handleButtonPress(btn)}
                      activeOpacity={0.82}
                    >
                      <Text
                        style={[styles.baseButtonText, textStyle]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        {btn.text || "OK"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const SCREEN_WIDTH = Dimensions.get("window").width;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: Math.min(SCREEN_WIDTH - 40, 360),
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 16,
    position: "relative",
    overflow: "hidden",
  },
  topAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  iconWrapper: {
    width: 76,
    height: 76,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 4,
    position: "relative",
  },
  outerIconRing: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
  },
  innerIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  contentContainer: {
    alignItems: "center",
    marginBottom: 22,
    width: "100%",
  },
  title: {
    fontSize: 19.5,
    fontFamily: typography.bold || "System",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14.5,
    fontFamily: typography.regular || "System",
    color: "#475569",
    textAlign: "center",
    lineHeight: 21.5,
    paddingHorizontal: 4,
  },
  buttonContainerBase: {
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonColumn: {
    flexDirection: "column",
    gap: 10,
    width: "100%",
  },
  baseButton: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  halfButton: {
    flex: 1,
  },
  fullWidthButton: {
    width: "100%",
  },
  baseButtonText: {
    fontSize: 14.5,
    fontFamily: typography.semibold || "System",
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: 19,
  },
  primaryButton: {
    backgroundColor: ResQColors.primaryRed || "#AF101A",
    shadowColor: "#AF101A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: typography.bold || "System",
  },
  defaultButton: {
    backgroundColor: "#F1F5F9",
  },
  defaultButtonText: {
    color: "#1E293B",
  },
  cancelButton: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  cancelButtonText: {
    color: "#64748B",
  },
  destructiveButton: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  destructiveButtonText: {
    color: "#FFFFFF",
  },
});
