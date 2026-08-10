import ChatHeader from "@/components/chat/ChatHeader";
import ChatInputBar from "@/components/chat/ChatInputBar";
import ChatMessageItem from "@/components/chat/ChatMessageItem";
import ChatPillsRow, { PillItem } from "@/components/chat/ChatPillsRow";
import MediaViewerModal from "@/components/chat/MediaViewerModal";
import { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { ChatMessage } from "@/constants/interfaces";
import { getContactChatMessages } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MapPin, Radio, ShieldCheck, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ContactChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    contactId?: string;
    name?: string;
    relationship?: string;
    phone?: string;
    avatarUrl?: string;
  }>();

  // Contact Details
  const headerName = params.name || "Contact User";
  const headerSubtitle = params.relationship || "Trusted Contact";
  const headerAvatar =
    params.avatarUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";

  // State Management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [contactModalVisible, setContactModalVisible] = useState(false);

  // Audio Recording State (expo-av)
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const micPressActiveRef = useRef(false);
  const voiceScale = useRef(new Animated.Value(1)).current;

  // Audio Playback State (expo-av)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [pausedMessageId, setPausedMessageId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [playbackRemainingSeconds, setPlaybackRemainingSeconds] = useState<number | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const audioTokenRef = useRef<number>(0);
  const lastRemainingSecRef = useRef<number | null>(null);

  // Location Sharing & Walk Safe State
  const [isWalkSafeActive, setIsWalkSafeActive] = useState(false);

  // Lightbox Media Preview Modal
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [activeMedia, setActiveMedia] = useState<{ uri: string; type: "image" | "video" } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when keyboard appears
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    return () => {
      showSubscription.remove();
    };
  }, []);

  // Initial Seed Messages
  useEffect(() => {
    const initialMsgs = getContactChatMessages(
      params.contactId,
      params.name,
      params.relationship,
      headerAvatar
    );
    setMessages(initialMsgs);
  }, [params.contactId, params.name, params.relationship, headerAvatar]);

  // Auto-scroll to latest message whenever messages update
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Configure iOS/Android audio session on mount
  useEffect(() => {
    let mounted = true;

    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        if (mounted) {
          console.error("Failed to configure chat audio session:", error);
        }
      }
    };

    configureAudio();

    return () => {
      mounted = false;
    };
  }, []);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      micPressActiveRef.current = false;
      audioTokenRef.current += 1;

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => { });
        recordingRef.current = null;
      }

      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => { });
        soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }
    };
  }, []);

  // Send Text Message
  const handleSendText = () => {
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
      text: inputText.trim(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const clearRecordingTimer = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const stopCurrentSound = async () => {
    audioTokenRef.current += 1;
    setLoadingMessageId(null);
    setPlayingMessageId(null);
    setPausedMessageId(null);

    if (!soundRef.current) return;

    const sound = soundRef.current;
    soundRef.current = null;

    try {
      await sound.stopAsync();
    } catch { }

    try {
      await sound.unloadAsync();
    } catch { }
  };

  // Start Voice Recording
  const handleVoicePressIn = async () => {
    if (micPressActiveRef.current || recordingRef.current) return;

    micPressActiveRef.current = true;

    Animated.spring(voiceScale, {
      toValue: 1.35,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();

    const startRecording = async () => {
      try {
        await stopCurrentSound();
        setPlayingMessageId(null);
        setPausedMessageId(null);
        setPlaybackRemainingSeconds(null);
        setPlaybackProgress(0);

        const permission = await Audio.requestPermissionsAsync();

        if (!permission.granted) {
          micPressActiveRef.current = false;
          setIsRecording(false);
          Alert.alert(
            "Permission Denied",
            "Microphone access is required to record voice notes."
          );
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        if (!micPressActiveRef.current) {
          await recording.stopAndUnloadAsync().catch(() => { });
          return;
        }

        recordingRef.current = recording;
        recordingStartTimeRef.current = Date.now();
        setRecordDuration(0);
        setIsRecording(true);

        clearRecordingTimer();
        recordingIntervalRef.current = setInterval(() => {
          if (recordingStartTimeRef.current) {
            const elapsed = Math.floor(
              (Date.now() - recordingStartTimeRef.current) / 1000
            );
            setRecordDuration(elapsed);
          }
        }, 250);
      } catch (error) {
        console.error("Failed to start audio recording:", error);
        recordingRef.current = null;
        recordingStartTimeRef.current = null;
        clearRecordingTimer();
        setIsRecording(false);
        micPressActiveRef.current = false;

        Alert.alert(
          "Recording Error",
          "Could not start audio recording. Please try again."
        );
      }
    };

    await startRecording();
  };

  // Stop Voice Recording
  const handleVoicePressOut = async () => {
    micPressActiveRef.current = false;

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

    const recording = recordingRef.current;
    recordingRef.current = null;

    try {
      clearRecordingTimer();
      setIsRecording(false);

      const startedAt = recordingStartTimeRef.current;
      const durationSec = startedAt
        ? Math.max(0, Math.round((Date.now() - startedAt) / 1000))
        : recordDuration;

      const recStatus = await recording.getStatusAsync().catch(() => null);
      const statusDurationSec = recStatus?.durationMillis ? Math.round(recStatus.durationMillis / 1000) : 0;
      const finalDurationSec = Math.max(1, statusDurationSec || durationSec);

      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();

      if (!uri) {
        Alert.alert("Recording Error", "The recording file could not be created.");
        setRecordDuration(0);
        return;
      }

      if (finalDurationSec < 1) {
        Alert.alert(
          "Recording Too Short",
          "Hold the mic button for at least one second to record a voice note."
        );
        setRecordDuration(0);
        return;
      }

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
        audioDuration: finalDurationSec,
        isUploading: true,
      };

      setMessages((prev) => [...prev, voiceMsg]);
      setRecordDuration(0);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

      // Simulate 2-second audio upload delay
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsgId ? { ...m, isUploading: false } : m))
        );
      }, 2000);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsRecording(false);
      setRecordDuration(0);
      recordingStartTimeRef.current = null;
    }
  };

  // Play Audio Voice Note
  const handlePlayAudio = async (msg: ChatMessage) => {
    if (!msg.audioUri || msg.isUploading) return;

    if (loadingMessageId === msg.id) return;

    // 1. If currently playing this audio -> PAUSE it (keep loaded & keep progress)
    if (playingMessageId === msg.id && soundRef.current) {
      try {
        await soundRef.current.pauseAsync();
        setPlayingMessageId(null);
        setPausedMessageId(msg.id);
      } catch (err) {
        console.error("Error pausing audio:", err);
      }
      return;
    }

    // 2. If currently paused on this audio -> RESUME it from paused position!
    if (pausedMessageId === msg.id && soundRef.current) {
      try {
        setPausedMessageId(null);
        setPlayingMessageId(msg.id);
        await soundRef.current.playAsync();
      } catch (err) {
        console.error("Error resuming audio:", err);
      }
      return;
    }

    // 3. New audio or playing a different audio -> unload previous and start new audio
    const currentToken = ++audioTokenRef.current;
    setLoadingMessageId(msg.id);

    try {
      await stopCurrentSound();
      audioTokenRef.current = currentToken;

      setPlayingMessageId(null);
      setPausedMessageId(null);
      setPlaybackRemainingSeconds(null);
      setPlaybackProgress(0);
      lastRemainingSecRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const uriToPlay =
        msg.audioUri.startsWith("http://") ||
          msg.audioUri.startsWith("https://") ||
          msg.audioUri.startsWith("file://") ||
          msg.audioUri.startsWith("content://") ||
          msg.audioUri.startsWith("data:")
          ? msg.audioUri
          : "https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3";

      const audioSource = { uri: uriToPlay };

      const { sound, status } = await Audio.Sound.createAsync(
        audioSource,
        {
          shouldPlay: false,
          volume: 1.0,
          isMuted: false,
          progressUpdateIntervalMillis: 150,
        }
      );

      if (currentToken !== audioTokenRef.current) {
        await sound.unloadAsync().catch(() => { });
        return;
      }

      if (!status.isLoaded) {
        await sound.unloadAsync().catch(() => { });
        setLoadingMessageId(null);
        throw new Error("Audio failed to load");
      }

      soundRef.current = sound;

      const durationSec = msg.audioDuration && msg.audioDuration > 0
        ? msg.audioDuration
        : Math.max(1, Math.round((status.durationMillis ?? 1000) / 1000));

      if (!msg.audioDuration) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, audioDuration: durationSec } : m
          )
        );
      }

      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (!playbackStatus.isLoaded) return;

        const duration = (playbackStatus.durationMillis && playbackStatus.durationMillis > 0)
          ? playbackStatus.durationMillis
          : durationSec * 1000;

        const position = playbackStatus.positionMillis ?? 0;
        // const position = playbackStatus.positionMillis ?? 0;

        if (duration > 0) {
          setPlaybackProgress(Math.min(1, position / duration));
          const remainingSec = Math.max(0, Math.ceil((duration - position) / 1000));

          if (lastRemainingSecRef.current !== remainingSec) {
            lastRemainingSecRef.current = remainingSec;
            setPlaybackRemainingSeconds(remainingSec);
          }
        }

        if (playbackStatus.didJustFinish) {
          setPlayingMessageId(null);
          setPausedMessageId(null);
          setLoadingMessageId(null);
          setPlaybackRemainingSeconds(null);
          setPlaybackProgress(0);
          lastRemainingSecRef.current = null;

          if (soundRef.current === sound) {
            soundRef.current = null;
          }

          sound.unloadAsync().catch(() => { });
        }
      });

      setLoadingMessageId(null);
      setPlayingMessageId(msg.id);
      setPausedMessageId(null);
      setPlaybackRemainingSeconds(durationSec);
      setPlaybackProgress(0);

      await sound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);

      if (currentToken === audioTokenRef.current) {
        if (soundRef.current) {
          await soundRef.current.unloadAsync().catch(() => { });
          soundRef.current = null;
        }

        setLoadingMessageId(null);
        setPlayingMessageId(null);
        setPausedMessageId(null);
        setPlaybackRemainingSeconds(null);
        setPlaybackProgress(0);
        lastRemainingSecRef.current = null;
        Alert.alert("Playback Error", "This voice note could not be played.");
      }
    }
  };

  // Gallery Picker
  const handlePickAttachment = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Gallery access is required to share photos.");
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
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "media",
          mediaUri: asset.uri,
          mediaType: asset.type === "video" ? "video" : "image",
          text: asset.type === "video" ? "Video Attachment" : "Photo Attachment",
        };
        setMessages((prev) => [...prev, mediaMsg]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.log("Media library error:", err);
    }
  };

  // Camera Picker
  const handleOpenCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Camera access is required to take photos.");
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

  const handleSendFromCamera = (photoUri: string, caption?: string, mediaType?: "image" | "video") => {
    const mediaMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "media",
      mediaUri: photoUri,
      mediaType: mediaType || "image",
      text: caption,
    };
    setMessages((prev) => [...prev, mediaMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Location Actions: Share Location, Walk Safe, I'm Okay
  const handleNavigateToMap = (msg: ChatMessage) => {
    const coords = msg.locationCoords || { latitude: 6.6751, longitude: -1.5715 };
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
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "location_share",
      text: "You shared current location snapshot",
      locationTimestampText: "Captured just now • Campus Center",
      locationCoords: { latitude: 6.6751, longitude: -1.5715 },
      createdTimestamp: Date.now(),
    };
    setMessages((prev) => [...prev, locMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleWalkSafe = () => {
    setIsWalkSafeActive(true);
    const walkMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "walk_safe",
      text: "You requested a Walk Safe session • Track live movement on map",
      locationTimestampText: "Live GPS Stream • Main Campus",
      locationCoords: { latitude: 6.68124, longitude: -1.57018 },
      createdTimestamp: Date.now(),
    };
    setMessages((prev) => [...prev, walkMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleImOkay = () => {
    setIsWalkSafeActive(false);
    const safeMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "im_okay",
      text: "You confirmed that you are safe now",
      createdTimestamp: Date.now(),
    };
    setMessages((prev) => [...prev, safeMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Quick Action Pills
  const contactPills: PillItem[] = [
    { label: "Walk Safe", action: "walk_safe", icon: Radio },
    { label: "Share Location", action: "location", icon: MapPin },
    { label: "I'm Okay", action: "im_okay", icon: ShieldCheck },
    { label: "On my way", action: "text" },
    { label: "Are you safe?", action: "text" },
    { label: "Call me when free", action: "text" },
    { label: "Heading out now", action: "text" },
  ];

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
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "text",
        text: item.label,
      };
      setMessages((prev) => [...prev, pillMsg]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Component */}
      <ChatHeader
        headerName={headerName}
        headerSubtitle={headerSubtitle}
        headerAvatar={headerAvatar}
        onBackPress={() => router.back()}
        onCallPress={() => Alert.alert("Calling", `Initiating direct call to ${headerName}...`)}
        onOptionsPress={() => setContactModalVisible(true)}
        isWalkSafeActive={isWalkSafeActive}
        onImOkayPress={handleImOkay}
      />

      {/* Main Chat Body & Keyboard View */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages List */}
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
          {messages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              headerAvatar={headerAvatar}
              playingMessageId={playingMessageId}
              pausedMessageId={pausedMessageId}
              loadingMessageId={loadingMessageId}
              playbackProgress={playbackProgress}
              playbackRemainingSeconds={playbackRemainingSeconds}
              onPlayAudio={handlePlayAudio}
              onOpenMedia={(media) => {
                setActiveMedia(media);
                setMediaViewerVisible(true);
              }}
              onNavigateToMap={handleNavigateToMap}
            />
          ))}
        </ScrollView>

        {/* Quick Action Pills Row */}
        <ChatPillsRow pills={contactPills} onPillPress={handlePillPress} />

        {/* Bottom Input Bar */}
        <ChatInputBar
          inputText={inputText}
          setInputText={setInputText}
          isRecording={isRecording}
          recordDuration={recordDuration}
          voiceScale={voiceScale}
          onSendText={handleSendText}
          onVoicePressIn={handleVoicePressIn}
          onVoicePressOut={handleVoicePressOut}
          onOpenCamera={handleOpenCamera}
          onPickAttachment={handlePickAttachment}
          onFocusInput={() => {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
          }}
        />
      </KeyboardAvoidingView>

      {/* Contact Details Modal */}
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
            <Text style={styles.modalPhoneText}>{params.phone || "+44 999 555 666"}</Text>

            <TouchableOpacity
              style={styles.modalCallBtn}
              onPress={() => Alert.alert("Calling", `Calling ${headerName}...`)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCallBtnText}>Call Emergency Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Lightbox Media Viewer Modal */}
      <MediaViewerModal
        visible={mediaViewerVisible}
        activeMedia={activeMedia}
        onClose={() => setMediaViewerVisible(false)}
      />
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
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  contactModalCard: {
    width: "100%",
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
    fontSize: 18,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  modalContactName: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  modalContactSub: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: "#64748B",
    marginTop: 2,
  },
  modalPhoneText: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: DESIGN_COLORS.tertiary,
    marginTop: 6,
    marginBottom: 18,
  },
  modalCallBtn: {
    width: "100%",
    backgroundColor: ResQColors.primaryRed,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalCallBtnText: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
});
