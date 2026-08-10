import ChatHeader from "@/components/chat/ChatHeader";
import ChatInputBar from "@/components/chat/ChatInputBar";
import ChatMessageItem from "@/components/chat/ChatMessageItem";
import ChatPillsRow, { PillItem } from "@/components/chat/ChatPillsRow";
import MediaViewerModal from "@/components/chat/MediaViewerModal";
import MedicalInfoModal from "@/components/MedicalInfoModal";
import { ChatMessage } from "@/constants/interfaces";
import { getEmergencyChatMessages } from "@/constants/tempData";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

// ---------------------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------------------

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Only used for mock/demo chat messages (e.g. seeded from getEmergencyChatMessages())
// that don't have a real recorded or remote audio file behind them yet. This must
// NEVER silently override a real recording's URI, which is why the check below is
// strict about recognized schemes.
const DEMO_FALLBACK_AUDIO_URI =
  "https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3";

const isPlayableUriScheme = (uri: string) =>
  uri.startsWith("http://") ||
  uri.startsWith("https://") ||
  uri.startsWith("file://") ||
  uri.startsWith("content://") ||
  uri.startsWith("data:");

const resolvePlayableUri = (uri: string) =>
  isPlayableUriScheme(uri) ? uri : DEMO_FALLBACK_AUDIO_URI;

// Single source of truth for switching the audio session between recording
// and playback. Doing this in one place avoids the two modes drifting out of
// sync, which on iOS in particular can leave audio routed/muted oddly.
const configureAudioMode = async (forRecording: boolean) => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: forRecording,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
};

export default function EmergencyChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    incidentId?: string;
    title?: string;
    severity?: string;
    location?: string;
  }>();

  // Scene Details
  const headerName = params.title || "John Doe • EMT";
  const headerSubtitle = "Currently At Emergency Scene";
  const headerAvatar =
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80";

  // State Management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [medicalModalVisible, setMedicalModalVisible] = useState(false);

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

  // Initial Seed Emergency Messages
  useEffect(() => {
    const emergencyMsgs = getEmergencyChatMessages();
    setMessages(emergencyMsgs);
  }, []);

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

    const initAudio = async () => {
      try {
        await configureAudioMode(false);
      } catch (error) {
        if (mounted) {
          console.error("Failed to configure emergency chat audio session:", error);
        }
      }
    };

    initAudio();

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

  // Unloads/stops whatever sound is currently active and resets playback UI
  // state. Does NOT touch audioTokenRef - callers own that so they can tell
  // whether they've been superseded by a newer play/record request.
  const stopCurrentSound = async () => {
    setLoadingMessageId(null);
    setPlayingMessageId(null);
    setPausedMessageId(null);
    setPlaybackRemainingSeconds(null);
    setPlaybackProgress(0);
    lastRemainingSecRef.current = null;

    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;

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
        audioTokenRef.current += 1; // invalidate any in-flight playback
        await stopCurrentSound();

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

        await configureAudioMode(true);

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
      recordingStartTimeRef.current = null;

      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      const durationSec = startedAt
        ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
        : Math.max(1, recordDuration);

      // Reset audio mode back to playback mode after finishing recording
      await configureAudioMode(false).catch(() => { });

      if (!uri) {
        Alert.alert("Recording Error", "The recording file could not be created.");
        setRecordDuration(0);
        return;
      }

      if (durationSec < 1) {
        Alert.alert(
          "Recording Too Short",
          "Hold the mic button for at least one second to record a voice note."
        );
        setRecordDuration(0);
        return;
      }

      // Sanity-check the file itself. On some devices a recording can
      // "complete" with a correct duration and no thrown error, while the
      // file it wrote out is empty or truncated - that then plays back as
      // silence and finishes instantly. Catching it here means a broken
      // voice note is never sent in the first place.
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const fileSize = (fileInfo as { size?: number }).size ?? 0;
        if (!fileInfo.exists || fileSize < 1024) {
          Alert.alert(
            "Recording Error",
            "That recording came out empty. Please try again."
          );
          setRecordDuration(0);
          return;
        }
      } catch (validationError) {
        // If we can't check the file, don't block sending - failing open is
        // better than silently dropping a possibly-valid recording.
        console.warn("Could not verify recorded file:", validationError);
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
        audioDuration: durationSec,
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

    // 1. Currently playing this message -> pause (keep loaded & keep progress)
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

    // 2. Currently paused on this message -> resume from where it left off
    if (pausedMessageId === msg.id && soundRef.current) {
      try {
        await soundRef.current.playAsync();
        setPausedMessageId(null);
        setPlayingMessageId(msg.id);
        return;
      } catch (err) {
        console.error("Error resuming audio, reloading instead:", err);
        // fall through and reload the sound from scratch below
      }
    }

    // 3. New audio, or a different message -> unload previous, load this one
    const currentToken = ++audioTokenRef.current;
    await stopCurrentSound();
    if (currentToken !== audioTokenRef.current) return; // superseded mid-stop
    setLoadingMessageId(msg.id);

    try {
      await configureAudioMode(false);

      const uriToPlay = resolvePlayableUri(msg.audioUri);

      const loadSound = () =>
        Audio.Sound.createAsync(
          { uri: uriToPlay },
          {
            shouldPlay: false,
            positionMillis: 0,
            volume: 1.0,
            isMuted: false,
            progressUpdateIntervalMillis: 150,
          }
        );

      let { sound, status } = await loadSound();

      // Some devices report a 0ms duration on the very first load right
      // after a file was recorded (metadata not finalized on disk yet),
      // which then makes playback end immediately with no audible sound.
      // If that happens for a local recording, unload and retry once after
      // a brief pause rather than treating the message as unplayable.
      if (
        status.isLoaded &&
        !status.durationMillis &&
        uriToPlay.startsWith("file://")
      ) {
        await sound.unloadAsync().catch(() => { });
        await wait(300);
        ({ sound, status } = await loadSound());
      }

      if (currentToken !== audioTokenRef.current) {
        await sound.unloadAsync().catch(() => { });
        return;
      }

      if (!status.isLoaded) {
        await sound.unloadAsync().catch(() => { });
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

      sound.setOnPlaybackStatusUpdate((playbackStatus: AVPlaybackStatus) => {
        if (!playbackStatus.isLoaded) return;

        const duration = (playbackStatus.durationMillis && playbackStatus.durationMillis > 0)
          ? playbackStatus.durationMillis
          : durationSec * 1000;

        const position = playbackStatus.positionMillis ?? 0;

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

  // Emergency Quick Pills
  const emergencyPills: PillItem[] = [
    { label: "On-site", action: "text" },
    { label: "Need backup", action: "text" },
    { label: "Route clear", action: "text" },
    { label: "ETA 3 mins", action: "text" },
    { label: "Prepping oxygen", action: "text" },
  ];

  const handlePillPress = (item: PillItem) => {
    const pillMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
      text: item.label,
    };
    setMessages((prev) => [...prev, pillMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={styles.container}>
      {/* Top Header Component */}
      <ChatHeader
        headerName={headerName}
        headerSubtitle={headerSubtitle}
        headerAvatar={headerAvatar}
        showSceneBadge={true}
        sceneBadgeText="On-site"
        showCallButton={false}
        onBackPress={() => router.back()}
        onOptionsPress={() => setMedicalModalVisible(true)}
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
            />
          ))}
        </ScrollView>

        {/* Emergency Quick Action Pills Row */}
        <ChatPillsRow pills={emergencyPills} onPillPress={handlePillPress} />

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
          placeholder="Type emergency message..."
          onFocusInput={() => {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
          }}
        />
      </KeyboardAvoidingView>

      {/* Medical Info Modal */}
      <MedicalInfoModal
        visible={medicalModalVisible}
        onClose={() => setMedicalModalVisible(false)}
      />

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
});