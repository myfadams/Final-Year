import { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { ChatMessage } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import {
  ChevronRight,
  MapPin,
  Pause,
  Play,
  Radio,
  ShieldCheck,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const RECORDING_WAVEFORM_BARS = [8, 16, 24, 12, 28, 18, 30, 22, 14, 26, 16, 28, 20, 10, 22, 14, 8];

interface ChatMessageItemProps {
  msg: ChatMessage;
  headerAvatar: string;
  playingMessageId: string | null;
  pausedMessageId?: string | null;
  loadingMessageId?: string | null;
  playbackProgress: number;
  playbackRemainingSeconds: number | null;
  onPlayAudio: (msg: ChatMessage) => void;
  onOpenMedia: (media: { uri: string; type: "image" | "video" }) => void;
  onNavigateToMap?: (msg: ChatMessage) => void;
}

export default function ChatMessageItem({
  msg,
  headerAvatar,
  playingMessageId,
  pausedMessageId,
  loadingMessageId,
  playbackProgress,
  playbackRemainingSeconds,
  onPlayAudio,
  onOpenMedia,
  onNavigateToMap,
}: ChatMessageItemProps) {
  if (msg.sender === "system") {
    return (
      <View key={msg.id} style={styles.systemBubbleWrapper}>
        <View style={styles.systemBubble}>
          <Text style={styles.systemText}>{msg.text}</Text>
        </View>
      </View>
    );
  }

  const isMe = msg.sender === "me";
  const isLoadingThis = loadingMessageId === msg.id || msg.isUploading;
  const isAnyLoading = !!loadingMessageId && loadingMessageId !== msg.id;
  const isPlayingOrPausedThis = playingMessageId === msg.id || pausedMessageId === msg.id;

  return (
    <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
      {!isMe && (
        <Image source={{ uri: msg.senderAvatar || headerAvatar }} style={styles.messageAvatar} />
      )}

      <View style={{ maxWidth: "80%" }}>
        {!isMe && (
          <View style={styles.senderMetaRow}>
            <Text style={styles.senderName}>{msg.senderName}</Text>
            {msg.senderRole && <Text style={styles.senderRole}>• {msg.senderRole}</Text>}
            <Text style={styles.messageTime}>{msg.timestamp}</Text>
          </View>
        )}

        {/* Text Message */}
        {msg.type === "text" && (
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {msg.text}
            </Text>
            {isMe && <Text style={styles.timeStampMe}>{msg.timestamp}</Text>}
          </View>
        )}

        {/* Audio Voice Note Message */}
        {msg.type === "audio" && (
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, styles.audioBubble]}>
            <View style={styles.audioRow}>
              {isLoadingThis ? (
                <View
                  style={[
                    styles.audioPlayCircle,
                    { backgroundColor: isMe ? "rgba(255, 255, 255, 0.25)" : ResQColors.primaryRedLight },
                  ]}
                >
                  <ActivityIndicator size="small" color={isMe ? "#FFFFFF" : ResQColors.primaryRedText} />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => onPlayAudio(msg)}
                  disabled={isAnyLoading}
                  style={[
                    styles.audioPlayCircle,
                    { backgroundColor: isMe ? "#FFFFFF" : ResQColors.primaryRedText },
                    isAnyLoading && { opacity: 0.5 },
                  ]}
                  activeOpacity={0.8}
                >
                  {playingMessageId === msg.id ? (
                    <Pause size={15} color={isMe ? ResQColors.primaryRedText : "#FFFFFF"} />
                  ) : (
                    <Play size={15} color={isMe ? ResQColors.primaryRedText : "#FFFFFF"} style={{ marginLeft: 2 }} />
                  )}
                </TouchableOpacity>
              )}

              {/* Waveform Visualizer Bars */}
              <View style={styles.waveformContainer}>
                {RECORDING_WAVEFORM_BARS.map((barHeight, idx) => {
                  const totalBars = RECORDING_WAVEFORM_BARS.length;
                  const activeBarCount = isPlayingOrPausedThis ? Math.floor(playbackProgress * totalBars) : 0;
                  const isBarPlayed = isPlayingOrPausedThis && idx <= activeBarCount;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.waveformBar,
                        {
                          height: barHeight,
                          backgroundColor: isMe
                            ? isBarPlayed
                              ? "#FFFFFF"
                              : "rgba(255, 255, 255, 0.45)"
                            : isBarPlayed
                              ? ResQColors.primaryRedText
                              : "#CBD5E1",
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <Text style={[styles.durationText, isMe ? { color: "#FFFFFF" } : { color: ResQColors.textMuted }]}>
                {msg.isUploading
                  ? "Sending..."
                  : isPlayingOrPausedThis && playbackRemainingSeconds !== null
                    ? `${Math.floor(playbackRemainingSeconds / 60)}:${(playbackRemainingSeconds % 60 < 10 ? "0" : "") + (playbackRemainingSeconds % 60)}`
                    : msg.audioDuration !== undefined
                      ? `${Math.floor(msg.audioDuration / 60)}:${(msg.audioDuration % 60 < 10 ? "0" : "") + (msg.audioDuration % 60)}`
                      : "--:--"}
              </Text>
            </View>

            <View style={styles.audioFooterRow}>
              <Text style={[styles.audioLabel, isMe ? styles.timeStampMe : { color: ResQColors.textMuted, fontSize: 10 }]}>
                {msg.isUploading ? "Uploading Audio..." : `Voice Note • ${msg.timestamp}`}
              </Text>
            </View>
          </View>
        )}

        {/* Media Attachment Message */}
        {msg.type === "media" && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (msg.mediaUri) {
                onOpenMedia({ uri: msg.mediaUri, type: msg.mediaType || "image" });
              }
            }}
            style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, { padding: 4 }]}
          >
            <View style={styles.mediaContainer}>
              <Image source={{ uri: msg.mediaUri }} style={styles.mediaThumbnail} />
              {msg.mediaType === "video" && (
                <View style={styles.videoOverlay}>
                  <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              )}
            </View>
            {msg.text && (
              <Text style={[styles.captionText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                {msg.text}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Location Share Card */}
        {msg.type === "location_share" && (
          <TouchableOpacity
            style={styles.locationCard}
            activeOpacity={0.85}
            onPress={() => onNavigateToMap?.(msg)}
          >
            <View style={styles.locationHeaderRow}>
              <MapPin size={18} color={DESIGN_COLORS.tertiary} />
              <Text style={styles.locationCardTitle}>Current Location Snapshot</Text>
            </View>
            <Text style={styles.locationCardText}>{msg.text}</Text>
            <View style={[styles.locationClickBadge, { backgroundColor: DESIGN_COLORS.tertiary }]}>
              <Text style={styles.locationClickBadgeText}>View Location on Map</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Walk Safe Live Location Card */}
        {msg.type === "walk_safe" && (
          <TouchableOpacity
            style={[styles.locationCard, styles.walkSafeCard]}
            activeOpacity={0.85}
            onPress={() => onNavigateToMap?.(msg)}
          >
            <View style={styles.locationHeaderRow}>
              <Radio size={18} color={ResQColors.primaryRedText} />
              <Text style={[styles.locationCardTitle, { color: ResQColors.primaryRedText }]}>
                Live Walk Safe Tracker
              </Text>
            </View>
            <Text style={[styles.locationCardText, { color: ResQColors.primaryRedText }]}>
              {msg.text}
            </Text>
            <View style={[styles.locationClickBadge, { backgroundColor: ResQColors.primaryRed }]}>
              <Text style={styles.locationClickBadgeText}>Track Live Movement on Map</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Safety Confirmation Card */}
        {msg.type === "im_okay" && (
          <View style={[styles.locationCard, styles.safeCard]}>
            <View style={styles.locationHeaderRow}>
              <ShieldCheck size={18} color={ResQColors.statusGreen} />
              <Text style={[styles.locationCardTitle, { color: ResQColors.statusGreen }]}>
                Safety Confirmation
              </Text>
            </View>
            <Text style={[styles.locationCardText, { color: ResQColors.greenText }]}>
              {msg.text}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  systemBubbleWrapper: {
    alignItems: "center",
    marginVertical: 12,
  },
  systemBubble: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  systemText: {
    fontSize: 11.5,
    fontFamily: typography.semibold,
    color: "#64748B",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 4,
  },
  senderMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  senderRole: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  messageTime: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: "#94A3B8",
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: ResQColors.primaryRed,
    borderBottomRightRadius: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  messageTextMe: {
    fontFamily: typography.medium,
    color: "#FFFFFF",
  },
  messageTextOther: {
    fontFamily: typography.regular,
    color: "#0F172A",
  },
  timeStampMe: {
    fontSize: 9.5,
    fontFamily: typography.regular,
    color: "rgba(255, 255, 255, 0.8)",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  audioBubble: {
    width: 245,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  audioPlayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  waveformContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 32,
    paddingHorizontal: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2.5,
  },
  durationText: {
    fontSize: 11.5,
    fontFamily: typography.bold,
    minWidth: 42,
    textAlign: "right",
  },
  audioFooterRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audioLabel: {
    fontSize: 10.5,
  },
  mediaContainer: {
    width: 200,
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  mediaThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  captionText: {
    fontSize: 13,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  walkSafeCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  safeCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  locationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  locationCardTitle: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: DESIGN_COLORS.tertiary,
  },
  locationCardText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#334155",
    lineHeight: 18,
  },
  locationClickBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DESIGN_COLORS.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 8,
  },
  locationClickBadgeText: {
    fontSize: 11.5,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
});
