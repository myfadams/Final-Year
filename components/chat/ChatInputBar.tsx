import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Camera, Mic, Paperclip, Send } from "lucide-react-native";
import React from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatInputBarProps {
  inputText: string;
  setInputText: (text: string) => void;
  isRecording: boolean;
  recordDuration: number;
  voiceScale: Animated.Value;
  onSendText: () => void;
  onVoicePressIn: () => void;
  onVoicePressOut: () => void;
  onOpenCamera: () => void;
  onPickAttachment: () => void;
  onFocusInput?: () => void;
  placeholder?: string;
}

export default function ChatInputBar({
  inputText,
  setInputText,
  isRecording,
  recordDuration,
  voiceScale,
  onSendText,
  onVoicePressIn,
  onVoicePressOut,
  onOpenCamera,
  onPickAttachment,
  onFocusInput,
  placeholder = "Type a message...",
}: ChatInputBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.inputBarContainer,
        { paddingBottom: Math.max(Platform.OS === "ios" ? 10 : 8, insets.bottom) },
      ]}
    >
      {/* Camera Button */}
      <TouchableOpacity
        onPress={onOpenCamera}
        style={styles.cameraIconBtn}
        activeOpacity={0.8}
      >
        <Camera size={20} color={ResQColors.primaryRedText} />
      </TouchableOpacity>

      {/* Attachment Button */}
      <TouchableOpacity
        onPress={onPickAttachment}
        style={styles.attachIconBtn}
        activeOpacity={0.8}
      >
        <Paperclip size={20} color={ResQColors.textMuted} />
      </TouchableOpacity>

      {/* Text Input / Recording Indicator */}
      <View style={[styles.textInputWrapper, isRecording && styles.textInputWrapperRecording]}>
        {isRecording ? (
          <View style={styles.recordingPillContainer}>
            <View style={styles.recordingRedDot} />
            <Text style={styles.recordingLabel}>Recording Voice Note...</Text>
            <Text style={styles.recordingTimerText}>
              {`0:${recordDuration < 10 ? "0" : ""}${recordDuration}`}
            </Text>
          </View>
        ) : (
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor={ResQColors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onFocus={onFocusInput}
          />
        )}
      </View>

      {/* Dynamic Action Button: Voice Record vs Send Text */}
      {inputText.trim().length > 0 ? (
        <TouchableOpacity onPress={onSendText} style={styles.sendCircleBtn} activeOpacity={0.85}>
          <Send size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      ) : (
        <Animated.View style={{ transform: [{ scale: voiceScale }] }}>
          <TouchableOpacity
            onPressIn={onVoicePressIn}
            onPressOut={onVoicePressOut}
            style={[styles.micCircleBtn, isRecording && styles.micCircleBtnActive]}
            activeOpacity={0.9}
          >
            <Mic size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  cameraIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  attachIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    minHeight: 42,
    justifyContent: "center",
  },
  textInputWrapperRecording: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  textInput: {
    fontSize: 14.5,
    fontFamily: typography.regular,
    color: "#0F172A",
  },
  recordingPillContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ResQColors.primaryRed,
  },
  recordingLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.medium,
    color: ResQColors.primaryRedText,
  },
  recordingTimerText: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: ResQColors.primaryRedText,
  },
  sendCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ResQColors.primaryRed,
    alignItems: "center",
    justifyContent: "center",
  },
  micCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ResQColors.primaryRed,
    alignItems: "center",
    justifyContent: "center",
  },
  micCircleBtnActive: {
    backgroundColor: "#DC2626",
  },
});
