import Colors from "@/constants/Colors";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from "react-native";

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 30;

interface VerifyPhoneScreenProps {
  phoneNumber?: string;
  onVerify?: (code: string) => void;
  onResend?: () => void;
  onBack?: () => void;
}

const VerifyPhoneScreen: React.FC<VerifyPhoneScreenProps> = ({
  phoneNumber = "+1 (555) 000-0000",
  onVerify,
  onResend,
  onBack,
}) => {
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [timer, setTimer] = useState<number>(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const boxAnims = useRef(
    Array.from({ length: OTP_LENGTH }, () => new Animated.Value(0)),
  ).current;
  const router = useRouter();
  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger box animations
    boxAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: 300 + i * 60,
        useNativeDriver: true,
      }).start();
    });

    // Focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 400);
  }, []);
  useEffect(() => {
    if (success) {
      router.navigate("/(resident)/home");
    }
  }, [success]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  const handleChangeText = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // Auto-submit when last digit entered
    if (digit && index === OTP_LENGTH - 1) {
      const fullCode = [...newCode].join("");
      if (fullCode.length === OTP_LENGTH) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === "Backspace") {
      const newCode = [...code];
      if (code[index]) {
        newCode[index] = "";
        setCode(newCode);
      } else if (index > 0) {
        newCode[index - 1] = "";
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeToVerify = fullCode ?? code.join("");
    if (codeToVerify.length < OTP_LENGTH) return;

    setIsVerifying(true);
    // Simulate API call
    await new Promise((res) => setTimeout(res, 1200));

    // Demo: treat "000000" as wrong, anything else as correct
    if (codeToVerify === "000000") {
      triggerShake();
      setIsVerifying(false);
    } else {
      setSuccess(true);
      setIsVerifying(false);
      onVerify?.(codeToVerify);
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setCode(Array(OTP_LENGTH).fill(""));
    setTimer(RESEND_TIMEOUT);
    setCanResend(false);
    setSuccess(false);
    inputRefs.current[0]?.focus();
    setFocusedIndex(0);
    onResend?.();
  };

  const filledCount = code.filter(Boolean).length;
  const isComplete = filledCount === OTP_LENGTH;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View
        style={[
          styles.inner,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Back button */}
        {/* <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity> */}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>{success ? "✓" : "💬"}</Text>
          </View>
          <Text style={styles.title}>
            {success ? "Verified!" : "Verify Phone"}
          </Text>
          <Text style={styles.subtitle}>
            {success
              ? "Your number has been successfully verified."
              : `Enter the 6-digit code sent to\n${phoneNumber}`}
          </Text>
        </View>

        {/* OTP Boxes */}
        <Animated.View
          style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
        >
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.boxWrapper,
                {
                  opacity: boxAnims[i],
                  transform: [
                    {
                      translateY: boxAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TextInput
                ref={(ref) => {
                  inputRefs.current[i] = ref;
                }}
                style={[
                  styles.box,
                  focusedIndex === i && styles.boxFocused,
                  code[i] ? styles.boxFilled : null,
                  success ? styles.boxSuccess : null,
                ]}
                value={code[i]}
                onChangeText={(text) => handleChangeText(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocusedIndex(i)}
                keyboardType="number-pad"
                maxLength={1}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                selectTextOnFocus
                caretHidden
                editable={!isVerifying && !success}
              />
              {/* Dot indicator under each box */}
              <View style={[styles.dot, code[i] ? styles.dotActive : null]} />
            </Animated.View>
          ))}
        </Animated.View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${(filledCount / OTP_LENGTH) * 100}%`,
                backgroundColor: success ? "#22c55e" : Colors.light.accent,
              },
            ]}
          />
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[
            styles.verifyBtn,
            !isComplete && styles.verifyBtnDisabled,
            isVerifying && styles.verifyBtnLoading,
            success && styles.verifyBtnSuccess,
          ]}
          onPress={() => handleVerify()}
          disabled={!isComplete || isVerifying || success}
          activeOpacity={0.85}
        >
          <Text style={styles.verifyBtnText}>
            {success
              ? "✓  Verified"
              : isVerifying
                ? "Verifying…"
                : "Verify Code"}
          </Text>
        </TouchableOpacity>

        {/* Resend section */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.timerPill}>
              <Text style={styles.timerText}>{formatTimer(timer)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.helpText}>
          Make sure your phone has signal and that you haven't blocked SMS from
          unknown numbers.
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#0f0f13",
    justifyContent: "center",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    // backgroundColor: "#1c1c24",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#2a2a36",
  },
  backArrow: {
    color: "#a0a0b8",
    fontSize: 18,
    lineHeight: 22,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    // backgroundColor: "#1c1c24",
    borderWidth: 1,
    borderColor: "#2a2a36",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f0f0ff",
    letterSpacing: -0.5,
    marginBottom: 10,
    // fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b6b84",
    textAlign: "center",
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  boxWrapper: {
    alignItems: "center",
  },
  box: {
    width: 48,
    height: 58,
    borderRadius: 14,
    // backgroundColor: "#1c1c24",
    borderWidth: 1.5,
    borderColor: "#2a2a36",
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0,
  },
  boxFocused: {
    borderColor: Colors.light.accent,
    // backgroundColor: "#1e1e2e",
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  boxFilled: {
    borderColor: Colors.light.accent,
    // backgroundColor: "#1e1e2e",
  },
  boxSuccess: {
    borderColor: "#22c55e",
    // backgroundColor: "#0f2318",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    // backgroundColor: "#2a2a36",
    marginTop: 6,
  },
  dotActive: {
    backgroundColor: Colors.light.accent,
  },
  progressTrack: {
    height: 2,
    // backgroundColor: "#1c1c24",
    borderRadius: 2,
    marginHorizontal: 4,
    marginBottom: 32,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  verifyBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  verifyBtnDisabled: {
    // backgroundColor: "#1c1c24",
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnLoading: {
    backgroundColor: Colors.light.accent,
    shadowOpacity: 0.2,
  },
  verifyBtnSuccess: {
    backgroundColor: "#16a34a",
    shadowColor: "#22c55e",
  },
  verifyBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  resendLabel: {
    color: "#6b6b84",
    fontSize: 14,
  },
  resendLink: {
    color: "#818cf8",
    fontSize: 14,
    fontWeight: "600",
  },
  timerPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: "#1c1c24",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a2a36",
  },
  timerText: {
    color: "#818cf8",
    fontSize: 13,
    fontWeight: "600",
    // fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  helpText: {
    color: "#3a3a4a",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});

export default VerifyPhoneScreen;
