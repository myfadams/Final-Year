import MedicalInfoModal from "@/components/MedicalInfoModal";
import { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { ChatMessage } from "@/constants/interfaces";
import { getContactChatMessages } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowLeft,
    Camera,
    ChevronRight,
    MapPin,
    Mic,
    MoreVertical,
    Paperclip,
    Pause,
    Phone,
    Play,
    Radio,
    Send,
    ShieldCheck,
    X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RECORDING_WAVEFORM_BARS = [
  8, 16, 24, 12, 28, 18, 30, 22, 14, 26, 16, 28, 20, 10, 22, 14, 8,
];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mode?: string;
    incidentId?: string;
    contactId?: string;
    title?: string;
    name?: string;
    relationship?: string;
    phone?: string;
    avatarUrl?: string;
  }>();

  // Mode Determination
  const isContactMode = params.mode === "contact";

  // Current Scene / Contact Details
  const headerName = isContactMode
    ? params.name || "Contact User"
    : "John Doe • EMT";
  const headerSubtitle = isContactMode
    ? params.relationship || "Trusted Contact"
    : "Currently At Emergency Scene";
  const headerAvatar = isContactMode
    ? params.avatarUrl ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
    : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80";

  // State Management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [medicalModalVisible, setMedicalModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);

  // Audio Recording State (expo-av)
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const voiceScale = useRef(new Animated.Value(1)).current;

  // Audio Playback State (expo-av)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackRemainingSeconds, setPlaybackRemainingSeconds] = useState<
    number | null
  >(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Location Sharing & Walk Safe State
  const [isWalkSafeActive, setIsWalkSafeActive] = useState(false);

  // Lightbox Media Preview Modal
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [activeMedia, setActiveMedia] = useState<{
    uri: string;
    type: "image" | "video";
  } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when keyboard appears
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );
    return () => {
      showSubscription.remove();
    };
  }, []);

  // Initial Seed Messages
  useEffect(() => {
    if (isContactMode) {
      const initialMsgs = getContactChatMessages(
        params.contactId,
        params.name,
        params.relationship,
        headerAvatar,
      );
      setMessages(initialMsgs);
    } else {
      setMessages([
        {
          id: "s1",
          sender: "system",
          timestamp: "10:40 AM",
          type: "text",
          text: "Incident escalated to Multi-Unit Emergency Response",
        },
        {
          id: "m1",
          sender: "other",
          senderName: "John Doe",
          senderRole: "EMT Lead",
          senderAvatar:
            "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80",
          timestamp: "10:42 AM",
          type: "text",
          text: "Unit 4 is en route. ETA 3 minutes. Patient history indicates severe asthma.",
        },
        {
          id: "m2",
          sender: "other",
          senderName: "Dispatch Control",
          senderRole: "KNUST Security",
          senderAvatar:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
          timestamp: "10:44 AM",
          type: "text",
          text: "Traffic on Main St is heavy. Advise taking 4th Ave detour.",
        },
        {
          id: "s2",
          sender: "system",
          timestamp: "10:45 AM",
          type: "text",
          text: "Ambulance Unit 4 is on-site",
        },
        {
          id: "m3",
          sender: "me",
          timestamp: "10:46 AM",
          type: "text",
          text: "Copy that. We are entering the building now. Please prep oxygen and stretcher at the main entrance.",
        },
      ]);
    }
  }, [isContactMode]);

  // Auto-scroll to latest message whenever messages update
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Clean up sound & recording on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Send Text Message
  const handleSendText = () => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
      text: inputText.trim(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  };

  // Audio Recording Press In (expo-av)
  const handleVoicePressIn = async () => {
    Animated.spring(voiceScale, {
      toValue: 1.35,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Microphone access is required to record voice notes.",
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setRecordDuration(0);
      setIsRecording(true);

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;

      recordingIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start audio recording:", err);
      setIsRecording(false);
      Alert.alert("Error", "Could not start audio recording.");
    }
  };

  // Audio Recording Release (expo-av)
  const handleVoicePressOut = async () => {
    Animated.spring(voiceScale, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();

    if (!recordingRef.current) {
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const durationSec = recordDuration;
      recordingRef.current = null;

      if (uri) {
        if (durationSec >= 1) {
          const newMsgId = Date.now().toString();
          const voiceMsg: ChatMessage = {
            id: newMsgId,
            sender: "me",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            type: "audio",
            audioUri: uri,
            audioDuration: durationSec,
            isUploading: true,
          };
          setMessages((prev) => [...prev, voiceMsg]);
          setTimeout(
            () => scrollViewRef.current?.scrollToEnd({ animated: true }),
            100,
          );

          // Simulate 4 second upload finish
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === newMsgId ? { ...m, isUploading: false } : m,
              ),
            );
          }, 4000);
        } else {
          Alert.alert(
            "Recording Too Short",
            "Hold the mic button longer to record a voice note.",
          );
        }
      }
      setRecordDuration(0);
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setIsRecording(false);
      setRecordDuration(0);
    }
  };

  // Audio Playback Handler
  const handlePlayAudio = async (msg: ChatMessage) => {
    if (!msg.audioUri || msg.isUploading) return;

    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    if (playingMessageId === msg.id) {
      setPlayingMessageId(null);
      setPlaybackRemainingSeconds(null);
      setPlaybackProgress(0);
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      setPlayingMessageId(msg.id);
      setPlaybackProgress(0);
      setPlaybackRemainingSeconds(msg.audioDuration || 0);

      const { sound } = await Audio.Sound.createAsync(
        { uri: msg.audioUri },
        { shouldPlay: true, progressUpdateIntervalMillis: 100 },
        (status) => {
          if (status.isLoaded) {
            if (status.isPlaying && status.durationMillis) {
              const remainingSec = Math.max(
                0,
                Math.ceil(
                  (status.durationMillis - status.positionMillis) / 1000,
                ),
              );
              setPlaybackRemainingSeconds(remainingSec);
              setPlaybackProgress(
                status.positionMillis / status.durationMillis,
              );
            }
            if (!status.isPlaying && status.didJustFinish) {
              setPlayingMessageId(null);
              setPlaybackRemainingSeconds(null);
              setPlaybackProgress(0);
            }
          }
        },
      );
      soundRef.current = sound;
    } catch (err) {
      console.error("Error playing audio:", err);
      setPlayingMessageId(null);
      setPlaybackRemainingSeconds(null);
      setPlaybackProgress(0);
    }
  };

  // Camera & Image Attachment Picker
  const handlePickAttachment = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Gallery access is required to share photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mediaMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: "me",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "media",
          mediaUri: asset.uri,
          mediaType: asset.type === "video" ? "video" : "image",
          text:
            asset.type === "video" ? "Video Attachment" : "Photo Attachment",
        };
        setMessages((prev) => [...prev, mediaMsg]);
        setTimeout(
          () => scrollViewRef.current?.scrollToEnd({ animated: true }),
          100,
        );
      }
    } catch (err) {
      console.log("Media library error:", err);
    }
  };

  const handleOpenCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera access is required to take photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        handleSendFromCamera(photo.uri, "Captured Photo", "image");
      }
    } catch (err) {
      console.log("Camera error:", err);
    }
  };

  // Camera Send Handler
  const handleSendFromCamera = (
    photoUri: string,
    caption?: string,
    mediaType?: "image" | "video",
  ) => {
    const mediaMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "media",
      mediaUri: photoUri,
      mediaType: mediaType || "image",
      text: caption,
    };
    setMessages((prev) => [...prev, mediaMsg]);
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  };

  // Location Actions: Share Location, Walk Safe, I'm Okay
  const handleNavigateToMap = (msg: ChatMessage) => {
    const coords = msg.locationCoords || {
      latitude: 6.6751,
      longitude: -1.5715,
    };
    const senderName = msg.senderName || headerName;
    const senderAvatar = msg.senderAvatar || headerAvatar;

    const hasImOkayInChat = messages.some((m) => m.type === "im_okay");

    router.push({
      pathname: "/(resident)/map",
      params: {
        sharedLocationId: `loc_${msg.id}`,
        senderName,
        senderAvatar,
        lat: coords.latitude.toString(),
        lng: coords.longitude.toString(),
        locationType: msg.type === "walk_safe" ? "walk_safe" : "location_share",
        timestampText: msg.locationTimestampText || "Shared Location",
        createdAt: (msg.createdTimestamp || Date.now()).toString(),
        hasImOkay: hasImOkayInChat ? "true" : "false",
        messageText: msg.text || "",
      },
    });
  };

  const handleShareLocation = () => {
    const locMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "location_share",
      text: "You shared current location snapshot",
      locationTimestampText: "Captured just now • Campus Center",
      locationCoords: { latitude: 6.6751, longitude: -1.5715 },
      createdTimestamp: Date.now(),
    };
    setMessages((prev) => [...prev, locMsg]);
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  };

  const handleWalkSafe = () => {
    setIsWalkSafeActive(true);
    const walkMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "walk_safe",
      text: "You requested a Walk Safe session • Track live movement on map",
      locationTimestampText: "Live GPS Stream • Main Campus",
      locationCoords: { latitude: 6.68124, longitude: -1.57018 },
      createdTimestamp: Date.now(),
    };
    setMessages((prev) => [...prev, walkMsg]);
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  };

  const handleImOkay = () => {
    setIsWalkSafeActive(false);
    const safeMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "im_okay",
      text: "You confirmed that you are safe now",
      createdTimestamp: Date.now(),
    };
    setMessages((prev) => [...prev, safeMsg]);
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  };

  // Quick Action Pill Data
  interface PillItem {
    label: string;
    action: string;
    icon?: React.ComponentType<any>;
  }

  const contactPills: PillItem[] = [
    { label: "Walk Safe", action: "walk_safe", icon: Radio },
    { label: "Share Location", action: "location", icon: MapPin },
    { label: "I'm Okay", action: "im_okay", icon: ShieldCheck },
    { label: "On my way", action: "text" },
    { label: "Are you safe?", action: "text" },
    { label: "Call me when free", action: "text" },
    { label: "Heading out now", action: "text" },
  ];

  const emergencyPills: PillItem[] = [
    { label: "On-site", action: "text" },
    { label: "Need backup", action: "text" },
    { label: "Route clear", action: "text" },
    { label: "ETA 3 mins", action: "text" },
    { label: "Prepping oxygen", action: "text" },
  ];

  const pillsToDisplay: PillItem[] = isContactMode
    ? contactPills
    : emergencyPills;

  // Quick Action Pill Handler
  const handlePillPress = (item: PillItem) => {
    if (item.action === "walk_safe") {
      handleWalkSafe();
    } else if (item.action === "location") {
      handleShareLocation();
    } else if (item.action === "im_okay") {
      handleImOkay();
    } else {
      const pillMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: "me",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "text",
        text: item.label,
      };
      setMessages((prev) => [...prev, pillMsg]);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Section with SafeArea Padding */}
      <View
        style={[
          styles.navHeaderWrapper,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <View style={styles.topAccentBar} />
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={ResQColors.primaryRedText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerTitleContainer}
            activeOpacity={0.85}
            onPress={() =>
              isContactMode
                ? setContactModalVisible(true)
                : setMedicalModalVisible(true)
            }
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: headerAvatar }}
                style={styles.headerAvatar}
              />
              <View style={styles.onlineBadgeDot} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.headerNameText} numberOfLines={1}>
                  {headerName}
                </Text>
                {!isContactMode && (
                  <View style={styles.sceneBadge}>
                    <Text style={styles.sceneBadgeText}>On-site</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerSubText} numberOfLines={1}>
                {headerSubtitle}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Direct Phone Call Button */}
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Calling",
                `Initiating direct call to ${headerName}...`,
              )
            }
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <Phone size={19} color="#0D9488" />
          </TouchableOpacity>

          {/* More Options / Contact Modal Button */}
          <TouchableOpacity
            onPress={() =>
              isContactMode
                ? setContactModalVisible(true)
                : setMedicalModalVisible(true)
            }
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <MoreVertical size={20} color={ResQColors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Live Walk Safe Banner Bar if Active */}
        {isContactMode && isWalkSafeActive && (
          <View style={styles.walkSafeBanner}>
            <Radio size={14} color="#FFFFFF" />
            <Text style={styles.walkSafeBannerText}>
              Walk Safe Live Location Active • Streaming GPS
            </Text>
            <TouchableOpacity
              onPress={handleImOkay}
              style={styles.bannerOkBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.bannerOkBtnText}>I'm Okay</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Chat Body & Input with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages Stream */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScrollView}
          contentContainerStyle={styles.chatScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
        >
          {messages.map((msg) => {
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

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowMe : styles.messageRowOther,
                ]}
              >
                {!isMe && (
                  <Image
                    source={{ uri: msg.senderAvatar || headerAvatar }}
                    style={styles.messageAvatar}
                  />
                )}

                <View style={{ maxWidth: "80%" }}>
                  {!isMe && (
                    <View style={styles.senderMetaRow}>
                      <Text style={styles.senderName}>{msg.senderName}</Text>
                      {msg.senderRole && (
                        <Text style={styles.senderRole}>
                          • {msg.senderRole}
                        </Text>
                      )}
                      <Text style={styles.messageTime}>{msg.timestamp}</Text>
                    </View>
                  )}

                  {/* Text Message */}
                  {msg.type === "text" && (
                    <View
                      style={[
                        styles.bubble,
                        isMe ? styles.bubbleMe : styles.bubbleOther,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isMe ? styles.messageTextMe : styles.messageTextOther,
                        ]}
                      >
                        {msg.text}
                      </Text>
                      {isMe && (
                        <Text style={styles.timeStampMe}>{msg.timestamp}</Text>
                      )}
                    </View>
                  )}

                  {/* Audio Voice Note Message */}
                  {msg.type === "audio" && (
                    <View
                      style={[
                        styles.bubble,
                        isMe ? styles.bubbleMe : styles.bubbleOther,
                        styles.audioBubble,
                      ]}
                    >
                      <View style={styles.audioRow}>
                        {msg.isUploading ? (
                          <View
                            style={[
                              styles.audioPlayCircle,
                              {
                                backgroundColor: isMe
                                  ? "rgba(255, 255, 255, 0.25)"
                                  : ResQColors.primaryRedLight,
                              },
                            ]}
                          >
                            <ActivityIndicator
                              size="small"
                              color={
                                isMe ? "#FFFFFF" : ResQColors.primaryRedText
                              }
                            />
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handlePlayAudio(msg)}
                            style={[
                              styles.audioPlayCircle,
                              {
                                backgroundColor: isMe
                                  ? "#FFFFFF"
                                  : ResQColors.primaryRedText,
                              },
                            ]}
                            activeOpacity={0.8}
                          >
                            {playingMessageId === msg.id ? (
                              <Pause
                                size={15}
                                color={
                                  isMe ? ResQColors.primaryRedText : "#FFFFFF"
                                }
                              />
                            ) : (
                              <Play
                                size={15}
                                color={
                                  isMe ? ResQColors.primaryRedText : "#FFFFFF"
                                }
                                style={{ marginLeft: 2 }}
                              />
                            )}
                          </TouchableOpacity>
                        )}

                        {/* Waveform Visualizer Bars */}
                        <View style={styles.waveformContainer}>
                          {RECORDING_WAVEFORM_BARS.map((barHeight, idx) => {
                            const totalBars = RECORDING_WAVEFORM_BARS.length;
                            const isPlayingThis = playingMessageId === msg.id;
                            const activeBarCount = isPlayingThis
                              ? Math.floor(playbackProgress * totalBars)
                              : 0;
                            const isBarPlayed =
                              isPlayingThis && idx <= activeBarCount;

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

                        <Text
                          style={[
                            styles.durationText,
                            isMe
                              ? { color: "#FFFFFF" }
                              : { color: ResQColors.textMuted },
                          ]}
                        >
                          {msg.isUploading
                            ? "Sending..."
                            : playingMessageId === msg.id &&
                                playbackRemainingSeconds !== null
                              ? `0:${playbackRemainingSeconds < 10 ? "0" : ""}${playbackRemainingSeconds}`
                              : `0:${msg.audioDuration ? (msg.audioDuration < 10 ? "0" : "") + msg.audioDuration : "03"}`}
                        </Text>
                      </View>

                      <View style={styles.audioFooterRow}>
                        <Text
                          style={[
                            styles.audioLabel,
                            isMe
                              ? styles.timeStampMe
                              : { color: ResQColors.textMuted, fontSize: 10 },
                          ]}
                        >
                          {msg.isUploading
                            ? "Uploading Audio..."
                            : `Voice Note • ${msg.timestamp}`}
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
                          setActiveMedia({
                            uri: msg.mediaUri,
                            type: msg.mediaType || "image",
                          });
                          setMediaViewerVisible(true);
                        }
                      }}
                      style={[
                        styles.bubble,
                        isMe ? styles.bubbleMe : styles.bubbleOther,
                        { padding: 4 },
                      ]}
                    >
                      <View style={styles.mediaContainer}>
                        <Image
                          source={{ uri: msg.mediaUri }}
                          style={styles.mediaThumbnail}
                        />
                        {msg.mediaType === "video" && (
                          <View style={styles.videoOverlay}>
                            <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      {msg.text && (
                        <Text
                          style={[
                            styles.captionText,
                            isMe
                              ? styles.messageTextMe
                              : styles.messageTextOther,
                          ]}
                        >
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
                      onPress={() => handleNavigateToMap(msg)}
                    >
                      <View style={styles.locationHeaderRow}>
                        <MapPin size={18} color={DESIGN_COLORS.tertiary} />
                        <Text style={styles.locationCardTitle}>
                          Current Location Snapshot
                        </Text>
                      </View>
                      <Text style={styles.locationCardText}>{msg.text}</Text>
                      <View
                        style={[
                          styles.locationClickBadge,
                          { backgroundColor: DESIGN_COLORS.tertiary },
                        ]}
                      >
                        <Text style={styles.locationClickBadgeText}>
                          View Location on Map
                        </Text>
                        <ChevronRight size={14} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Walk Safe Live Location Card */}
                  {msg.type === "walk_safe" && (
                    <TouchableOpacity
                      style={[styles.locationCard, styles.walkSafeCard]}
                      activeOpacity={0.85}
                      onPress={() => handleNavigateToMap(msg)}
                    >
                      <View style={styles.locationHeaderRow}>
                        <Radio size={18} color={ResQColors.primaryRedText} />
                        <Text
                          style={[
                            styles.locationCardTitle,
                            { color: ResQColors.primaryRedText },
                          ]}
                        >
                          Live Walk Safe Tracker
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.locationCardText,
                          { color: ResQColors.primaryRedText },
                        ]}
                      >
                        {msg.text}
                      </Text>
                      <View
                        style={[
                          styles.locationClickBadge,
                          { backgroundColor: ResQColors.primaryRed },
                        ]}
                      >
                        <Text style={styles.locationClickBadgeText}>
                          Track Live Movement on Map
                        </Text>
                        <ChevronRight size={14} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* I'm Okay Confirmation Card */}
                  {msg.type === "im_okay" && (
                    <View style={[styles.locationCard, styles.safeCard]}>
                      <View style={styles.locationHeaderRow}>
                        <ShieldCheck size={18} color={ResQColors.statusGreen} />
                        <Text
                          style={[
                            styles.locationCardTitle,
                            { color: ResQColors.statusGreen },
                          ]}
                        >
                          Safety Confirmation
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.locationCardText,
                          { color: ResQColors.greenText },
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick Action & Suggestion Pills Row */}
        <View style={styles.pillsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {pillsToDisplay.map((item) => {
              const IconComp = item.icon;
              const isWalk = item.action === "walk_safe";
              const isOk = item.action === "im_okay";
              const isLoc = item.action === "location";

              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => handlePillPress(item)}
                  style={[
                    styles.pillBtn,
                    isWalk && styles.pillWalkSafe,
                    isOk && styles.pillImOkay,
                    isLoc && styles.pillShareLoc,
                  ]}
                  activeOpacity={0.8}
                >
                  {IconComp && (
                    <IconComp
                      size={13}
                      color={
                        isWalk
                          ? ResQColors.primaryRedText
                          : isOk
                            ? ResQColors.statusGreen
                            : isLoc
                              ? DESIGN_COLORS.tertiary
                              : ResQColors.textMuted
                      }
                      style={{ marginRight: 5 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.pillText,
                      isWalk && styles.pillTextWalkSafe,
                      isOk && styles.pillTextImOkay,
                      isLoc && styles.pillTextShareLoc,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Bottom Input Bar */}
        <View
          style={[
            styles.inputBarContainer,
            {
              paddingBottom: Math.max(
                Platform.OS === "ios" ? 10 : 8,
                insets.bottom,
              ),
            },
          ]}
        >
          {/* Camera Button */}
          <TouchableOpacity
            onPress={handleOpenCamera}
            style={styles.cameraIconBtn}
            activeOpacity={0.8}
          >
            <Camera size={20} color={ResQColors.primaryRedText} />
          </TouchableOpacity>

          {/* Attachment Button */}
          <TouchableOpacity
            onPress={handlePickAttachment}
            style={styles.attachIconBtn}
            activeOpacity={0.8}
          >
            <Paperclip size={20} color={ResQColors.textMuted} />
          </TouchableOpacity>

          {/* Text Input / Recording Indicator */}
          <View
            style={[
              styles.textInputWrapper,
              isRecording && styles.textInputWrapperRecording,
            ]}
          >
            {isRecording ? (
              <View style={styles.recordingPillContainer}>
                <View style={styles.recordingRedDot} />
                <Text style={styles.recordingLabel}>
                  Recording Voice Note...
                </Text>
                <Text style={styles.recordingTimerText}>
                  {`0:${recordDuration < 10 ? "0" : ""}${recordDuration}`}
                </Text>
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor={ResQColors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => {
                  setTimeout(
                    () =>
                      scrollViewRef.current?.scrollToEnd({ animated: true }),
                    100,
                  );
                }}
              />
            )}
          </View>

          {/* Dynamic Action Button: Voice Record (Empty Input) vs Send Text */}
          {inputText.trim().length > 0 ? (
            <TouchableOpacity
              onPress={handleSendText}
              style={styles.sendCircleBtn}
              activeOpacity={0.85}
            >
              <Send size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          ) : (
            <Animated.View style={{ transform: [{ scale: voiceScale }] }}>
              <TouchableOpacity
                onPressIn={handleVoicePressIn}
                onPressOut={handleVoicePressOut}
                style={[
                  styles.micCircleBtn,
                  isRecording && styles.micCircleBtnActive,
                ]}
                activeOpacity={0.9}
              >
                <Mic size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Medical Info Modal */}
      <MedicalInfoModal
        visible={medicalModalVisible}
        onClose={() => setMedicalModalVisible(false)}
      />

      {/* Contact Profile Modal */}
      <Modal
        visible={contactModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.contactModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Contact Info</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <X size={20} color={ResQColors.textMuted} />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: headerAvatar }} style={styles.modalAvatar} />
            <Text style={styles.modalContactName}>{headerName}</Text>
            <Text style={styles.modalContactSub}>{headerSubtitle}</Text>
            <Text style={styles.modalPhoneText}>
              {params.phone || "+44 999 555 666"}
            </Text>

            <TouchableOpacity
              style={styles.modalCallBtn}
              onPress={() => Alert.alert("Calling", `Calling ${headerName}...`)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCallBtnText}>
                Call Emergency Contact
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Media Lightbox Viewer */}
      <Modal
        visible={mediaViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMediaViewerVisible(false)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setMediaViewerVisible(false)}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {activeMedia && (
            <Image
              source={{ uri: activeMedia.uri }}
              style={styles.fullScreenImg}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardView: {
    flex: 1,
  },
  navHeaderWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  topAccentBar: {
    height: 3,
    backgroundColor: ResQColors.primaryRed,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  onlineBadgeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerNameText: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  headerSubText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: "#64748B",
    marginTop: 1,
  },
  sceneBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  sceneBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: "#166534",
  },
  headerIconBtn: {
    padding: 7,
    marginLeft: 2,
  },
  walkSafeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.primaryRed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  walkSafeBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  bannerOkBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bannerOkBtnText: {
    fontSize: 11.5,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
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
  pillsContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  pillsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillWalkSafe: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  pillImOkay: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  pillShareLoc: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  pillText: {
    fontSize: 12.5,
    fontFamily: typography.semibold,
    color: "#334155",
  },
  pillTextWalkSafe: {
    color: ResQColors.primaryRedText,
    fontFamily: typography.bold,
  },
  pillTextImOkay: {
    color: "#166534",
    fontFamily: typography.bold,
  },
  pillTextShareLoc: {
    color: "#0D9488",
    fontFamily: typography.bold,
  },
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
    height: 42,
    backgroundColor: "#F8FAFC",
    borderRadius: 21,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textInputWrapperRecording: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  recordingPillContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  recordingRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ResQColors.primaryRed,
  },
  recordingLabel: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#64748B",
    flex: 1,
  },
  recordingTimerText: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: ResQColors.primaryRedText,
  },
  textInput: {
    fontSize: 14,
    fontFamily: typography.regular,
    color: "#0F172A",
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
    backgroundColor: "#B91C1C",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  contactModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  modalHeaderRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
  },
  modalContactName: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  modalContactSub: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#64748B",
    marginTop: 2,
  },
  modalPhoneText: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: ResQColors.primaryRedText,
    marginTop: 6,
  },
  modalCallBtn: {
    marginTop: 18,
    width: "100%",
    backgroundColor: ResQColors.primaryRed,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCallBtnText: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenImg: {
    width: "100%",
    height: "80%",
  },
});
