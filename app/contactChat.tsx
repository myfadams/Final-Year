import { getCurrentUser, getUserProfile } from "@/backend/auth";
import {
  fetchChatMessages,
  getCachedChatMessages,
  getOrCreatePrivateChat,
  mapDbMessageToChatMessage,
  sendChatMessage,
  setCachedChatMessages,
  subscribeToChatMessages,
  uploadChatAudio,
  uploadChatMedia,
} from "@/backend/chat";
import HeartBeatWave from "@/components/HeartBeatWave";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInputBar from "@/components/chat/ChatInputBar";
import ChatMessageItem from "@/components/chat/ChatMessageItem";
import ChatPillsRow, { PillItem } from "@/components/chat/ChatPillsRow";
import ContactDetailsModal from "@/components/chat/ContactDetailsModal";
import MediaViewerModal from "@/components/chat/MediaViewerModal";
import { ResQColors } from "@/constants/Colors";
import { ChatMessage } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MapPin } from "lucide-react-native";
import { showPopupAlert } from "@/components/popupAlert";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,

  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function ContactChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    contactId?: string;
    id?: string;
    chatId?: string;
    name?: string;
    relationship?: string;
    phone?: string;
    avatarUrl?: string;
  }>();

  // Contact & Auth Details
  const headerName = params.name || "Contact User";
  const headerSubtitle = params.relationship || "Trusted Contact";
  const headerAvatar = params.avatarUrl || undefined;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Me");
  const [currentUserRole, setCurrentUserRole] = useState<string>("Resident");
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(undefined);
  const [activeChatId, setActiveChatId] = useState<string | null>(params.chatId || null);

  // State Management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [contactModalVisible, setContactModalVisible] = useState(false);

  // Loading & Pagination State
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

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

  // Walk Safe State
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

  // ---------------------------------------------------------------------------
  // Initialize Chat, Fetch Messages & Realtime Subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isSubscribed = true;
    let unsubscribeRealtime: (() => void) | null = null;

    const initChat = async () => {
      setIsLoadingMessages(true);
      try {
        const targetContactId = params.contactId || params.id;
        const initialChatId = params.chatId || null;

        // Load cached messages immediately if available for instant offline display
        if (initialChatId) {
          const cached = await getCachedChatMessages(initialChatId);
          if (cached.length > 0 && isSubscribed) {
            setMessages(cached);
            setIsLoadingMessages(false);
          }
        }

        const { user: currentUser, error: userErr } = await getCurrentUser();
        if (userErr || !currentUser) {
          console.warn("User not logged in or offline");
          if (isSubscribed) {
            if (initialChatId) {
              const cached = await getCachedChatMessages(initialChatId);
              if (cached.length > 0) setMessages(cached);
            }
            setIsLoadingMessages(false);
          }
          return;
        }

        if (isSubscribed) {
          setCurrentUserId(currentUser.id);
        }

        // Fetch user profile for sender details
        const { profile } = await getUserProfile(currentUser.id);
        if (profile && isSubscribed) {
          setCurrentUserName(profile.name || currentUser.email || "Me");
          setCurrentUserRole(profile.role || "Resident");
          setCurrentUserAvatar(profile.profile_image_url || undefined);
        }

        let resolvedChatId = initialChatId;

        if (!resolvedChatId && targetContactId) {
          const { chat, error: chatErr } = await getOrCreatePrivateChat(targetContactId, {
            name: headerName,
            relationship: headerSubtitle,
            avatarUrl: headerAvatar,
          });

          if (chat) {
            resolvedChatId = chat.id;
          } else if (chatErr) {
            console.warn("Could not create/get chat row:", chatErr);
          }
        }

        if (!resolvedChatId) {
          if (isSubscribed) {
            setIsLoadingMessages(false);
          }
          return;
        }

        if (isSubscribed) {
          setActiveChatId(resolvedChatId);
        }

        // If not loaded yet, fetch cached messages for resolvedChatId
        const cached = await getCachedChatMessages(resolvedChatId);
        if (cached.length > 0 && isSubscribed) {
          setMessages(cached);
          setIsLoadingMessages(false);
        }

        // Fetch initial messages from network
        const { messages: fetchedMsgs, hasMore, error: fetchErr } = await fetchChatMessages(
          resolvedChatId,
          currentUser.id,
          35
        );

        if (fetchErr) {
          console.warn("Fetch initial messages notice (offline mode):", fetchErr);
        }

        if (isSubscribed) {
          if (fetchedMsgs.length > 0) {
            setMessages(fetchedMsgs);
            await setCachedChatMessages(resolvedChatId, fetchedMsgs);
          }
          setHasMoreMessages(hasMore);
          setIsLoadingMessages(false);

          // Realtime Subscription
          unsubscribeRealtime = subscribeToChatMessages(
            resolvedChatId,
            (rawMsg) => {
              const newMsg = mapDbMessageToChatMessage(rawMsg, currentUser.id);

              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) {
                  return prev;
                }
                const tempIndex = prev.findIndex(
                  (m) =>
                    m.isUploading &&
                    m.type === newMsg.type &&
                    (m.text === newMsg.text || m.audioDuration === newMsg.audioDuration)
                );
                let updated: ChatMessage[];
                if (tempIndex !== -1) {
                  updated = [...prev];
                  updated[tempIndex] = newMsg;
                } else {
                  updated = [...prev, newMsg];
                }
                setCachedChatMessages(resolvedChatId, updated);
                return updated;
              });

              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            }
          );
        }
      } catch (err: any) {
        console.warn("initChat exception (offline mode active):", err?.message || err);
        if (isSubscribed) {
          setIsLoadingMessages(false);
        }
      }
    };

    initChat();

    return () => {
      isSubscribed = false;
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
    };
  }, [params.contactId, params.id, params.chatId]);

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

  // ---------------------------------------------------------------------------
  // Pagination / Load Older Messages
  // ---------------------------------------------------------------------------
  const handleLoadOlderMessages = async () => {
    if (isLoadingOlder || !hasMoreMessages || !activeChatId || !currentUserId || messages.length === 0) {
      return;
    }

    const oldestMsg = messages[0];
    if (!oldestMsg.createdAtIso) return;

    setIsLoadingOlder(true);
    try {
      const { messages: olderMsgs, hasMore, error: fetchErr } = await fetchChatMessages(
        activeChatId,
        currentUserId,
        30,
        oldestMsg.createdAtIso
      );

      if (fetchErr) {
        console.error("Failed to load older messages:", fetchErr);
        setIsLoadingOlder(false);
        return;
      }

      if (olderMsgs.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filteredOlder = olderMsgs.filter((m) => !existingIds.has(m.id));
          return [...filteredOlder, ...prev];
        });
        setHasMoreMessages(hasMore);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error("Load older messages exception:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetY = event.nativeEvent.contentOffset.y;
    if (contentOffsetY < 20 && !isLoadingOlder && hasMoreMessages) {
      handleLoadOlderMessages();
    }
  };

  // ---------------------------------------------------------------------------
  // Send Text Message
  // ---------------------------------------------------------------------------
  const handleSendText = async () => {
    const textToSend = inputText.trim();
    if (!textToSend) return;

    setInputText("");

    if (!activeChatId || !currentUserId) {
      // Local fallback mode
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: "me",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "text",
        text: textToSend,
      };
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    // Optimistic message update
    const tempId = `temp_${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      chatId: activeChatId,
      senderId: currentUserId,
      sender: "me",
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatar: currentUserAvatar,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
      text: textToSend,
      createdTimestamp: Date.now(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

    const { message, error } = await sendChatMessage({
      chatId: activeChatId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatarUrl: currentUserAvatar,
      type: "text",
      textContent: textToSend,
    });

    if (error) {
      const isNetworkErr = error?.includes("Network request failed") || error?.includes("fetch");
      showPopupAlert(
        isNetworkErr ? "Connection Error" : "Sending Failed",
        isNetworkErr ? "No internet connection. Please check your network and try again." : error,
        undefined,
        undefined,
        "error"
      );
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(textToSend);
    } else if (message) {
      const realMsg = mapDbMessageToChatMessage(message, currentUserId);
      setMessages((prev) => {
        const updated = prev.some((m) => m.id === realMsg.id)
          ? prev.filter((m) => m.id !== tempId)
          : prev.map((m) => (m.id === tempId ? realMsg : m));
        if (activeChatId) setCachedChatMessages(activeChatId, updated);
        return updated;
      });
    }
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

  // ---------------------------------------------------------------------------
  // Voice Recording (Start & Stop)
  // ---------------------------------------------------------------------------
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
          showPopupAlert(
            "Permission Denied",
            "Microphone access is required to record voice notes.",
            undefined,
            undefined,
            "warning"
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

        showPopupAlert(
          "Recording Error",
          "Could not start audio recording. Please try again.",
          undefined,
          undefined,
          "error"
        );
      }
    };

    await startRecording();
  };

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
        showPopupAlert("Recording Error", "The recording file could not be created.", undefined, undefined, "error");
        setRecordDuration(0);
        return;
      }

      if (finalDurationSec < 1) {
        showPopupAlert(
          "Recording Too Short",
          "Hold the mic button for at least one second to record a voice note.",
          undefined,
          undefined,
          "warning"
        );
        setRecordDuration(0);
        return;
      }

      const tempId = `temp_voice_${Date.now()}`;
      const voiceMsg: ChatMessage = {
        id: tempId,
        chatId: activeChatId || undefined,
        senderId: currentUserId || undefined,
        sender: "me",
        senderName: currentUserName,
        senderRole: currentUserRole,
        senderAvatar: currentUserAvatar,
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

      if (!activeChatId || !currentUserId) {
        // Fallback local mode
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, isUploading: false } : m))
          );
        }, 1000);
        return;
      }

      // Upload audio file to Supabase Storage bucket 'images/privateChatMedia/audio'
      try {
        const publicAudioUrl = await uploadChatAudio(uri);

        const { message, error } = await sendChatMessage({
          chatId: activeChatId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderRole: currentUserRole,
          senderAvatarUrl: currentUserAvatar,
          type: "audio",
          audioUrl: publicAudioUrl,
          audioDurationSec: finalDurationSec,
        });

        if (error) {
          showPopupAlert("Audio Upload Error", error, undefined, undefined, "error");
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } else if (message) {
          const realMsg = mapDbMessageToChatMessage(message, currentUserId);
          setMessages((prev) =>
            prev.some((m) => m.id === realMsg.id)
              ? prev.filter((m) => m.id !== tempId)
              : prev.map((m) => (m.id === tempId ? realMsg : m))
          );
        }
      } catch (uploadError: any) {
        const isNetworkErr = String(uploadError?.message || uploadError).includes("Network request failed");
        console.warn("Audio note upload notice:", uploadError?.message || uploadError);
        showPopupAlert(
          isNetworkErr ? "Connection Error" : "Upload Failed",
          isNetworkErr
            ? "No internet connection. Please check your network and try again."
            : "Could not upload voice note. Please try again.",
          undefined,
          undefined,
          "error"
        );
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsRecording(false);
      setRecordDuration(0);
      recordingStartTimeRef.current = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Audio Playback
  // ---------------------------------------------------------------------------
  const handlePlayAudio = async (msg: ChatMessage) => {
    if (!msg.audioUri || msg.isUploading) return;
    if (loadingMessageId === msg.id) return;

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

      const durationSec =
        msg.audioDuration && msg.audioDuration > 0
          ? msg.audioDuration
          : Math.max(1, Math.round((status.durationMillis ?? 1000) / 1000));

      if (!msg.audioDuration) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, audioDuration: durationSec } : m))
        );
      }

      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (!playbackStatus.isLoaded) return;

        const duration =
          playbackStatus.durationMillis && playbackStatus.durationMillis > 0
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
        showPopupAlert("Playback Error", "This voice note could not be played.", undefined, undefined, "error");
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Gallery / Media Attachment Picker
  // ---------------------------------------------------------------------------
  const handlePickAttachment = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        showPopupAlert("Permission Denied", "Gallery access is required to share photos or videos.", undefined, undefined, "warning");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVid = asset.type === "video";
        await uploadAndSendMedia(asset.uri, isVid ? "video" : "image", isVid ? "Video Attachment" : "Photo Attachment");
      }
    } catch (err) {
      console.error("Media library error:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Camera Picker
  // ---------------------------------------------------------------------------
  const handleOpenCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        showPopupAlert("Permission Denied", "Camera access is required to take photos.", undefined, undefined, "warning");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        await uploadAndSendMedia(photo.uri, "image", "Captured Photo");
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const uploadAndSendMedia = async (fileUri: string, mediaType: "image" | "video", caption?: string) => {
    const tempId = `temp_media_${Date.now()}`;
    const mediaMsg: ChatMessage = {
      id: tempId,
      chatId: activeChatId || undefined,
      senderId: currentUserId || undefined,
      sender: "me",
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatar: currentUserAvatar,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "media",
      mediaUri: fileUri,
      mediaType,
      text: caption,
      isUploading: true,
    };

    setMessages((prev) => [...prev, mediaMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    if (!activeChatId || !currentUserId) {
      // Local fallback mode
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, isUploading: false } : m))
        );
      }, 1000);
      return;
    }

    try {
      const publicMediaUrl = await uploadChatMedia(fileUri, mediaType);

      const { message, error } = await sendChatMessage({
        chatId: activeChatId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        senderAvatarUrl: currentUserAvatar,
        type: "media",
        mediaUrl: publicMediaUrl,
        mediaType,
        textContent: caption,
      });

      if (error) {
        showPopupAlert("Media Upload Error", error, undefined, undefined, "error");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else if (message) {
        const realMsg = mapDbMessageToChatMessage(message, currentUserId);
        setMessages((prev) =>
          prev.some((m) => m.id === realMsg.id)
            ? prev.filter((m) => m.id !== tempId)
            : prev.map((m) => (m.id === tempId ? realMsg : m))
        );
      }
    } catch (uploadError: any) {
      const isNetworkErr = String(uploadError?.message || uploadError).includes("Network request failed");
      console.warn("Media upload notice:", uploadError?.message || uploadError);
      showPopupAlert(
        isNetworkErr ? "Connection Error" : "Upload Failed",
        isNetworkErr
          ? "No internet connection. Please check your network and try again."
          : "Could not upload media attachment.",
        undefined,
        undefined,
        "error"
      );
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // ---------------------------------------------------------------------------
  // Location Sharing & Quick Action Pills
  // ---------------------------------------------------------------------------
  const handleNavigateToMap = (msg: ChatMessage) => {
    const coords = msg.locationCoords || { latitude: 6.6751, longitude: -1.5715 };
    const senderName = msg.senderName || headerName;
    const senderAvatar = msg.senderAvatar || headerAvatar;

    router.push({
      pathname: "/(resident)/map",
      params: {
        sharedLocationId: `loc_${msg.id}`,
        senderName,
        senderAvatar,
        lat: coords.latitude.toString(),
        lng: coords.longitude.toString(),
        locationType: "location_share",
        timestampText: msg.locationTimestampText || "Shared Location",
        createdAt: (msg.createdTimestamp || Date.now()).toString(),
        hasImOkay: "false",
        messageText: msg.text || "",
      },
    });
  };

  const handleShareLocation = async () => {
    let coords = { latitude: 6.6751, longitude: -1.5715 };

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === "granted") {
        const currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = {
          latitude: currentLoc.coords.latitude,
          longitude: currentLoc.coords.longitude,
        };
      }
    } catch (err) {
      console.warn("Could not get current GPS location, using fallback:", err);
    }

    if (!activeChatId || !currentUserId) {
      const locMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: "me",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "location_share",
        text: "You shared current location snapshot",
        locationTimestampText: "Captured just now • Live GPS",
        locationCoords: coords,
        createdTimestamp: Date.now(),
      };
      setMessages((prev) => [...prev, locMsg]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    const { message, error } = await sendChatMessage({
      chatId: activeChatId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatarUrl: currentUserAvatar,
      type: "location_share",
      locationLat: coords.latitude,
      locationLng: coords.longitude,
      locationLabel: "Current Location",
      locationTimestampText: "Captured just now • Live GPS",
      textContent: "Shared current location snapshot",
    });

    if (error) {
      showPopupAlert("Location Share Error", error, undefined, undefined, "error");
    } else if (message) {
      const realMsg = mapDbMessageToChatMessage(message, currentUserId);
      setMessages((prev) => (prev.some((m) => m.id === realMsg.id) ? prev : [...prev, realMsg]));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Quick Action Pills (ignoring walk_safe and im_okay)
  const contactPills: PillItem[] = [
    { label: "Share Location", action: "location", icon: MapPin },
    { label: "On my way", action: "text" },
    { label: "Are you safe?", action: "text" },
    { label: "Call me when free", action: "text" },
    { label: "Heading out now", action: "text" },
  ];

  const handlePillPress = (item: PillItem) => {
    if (item.action === "location") {
      handleShareLocation();
    } else {
      setInputText(item.label);
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
        onCallPress={() => showPopupAlert("Calling", `Initiating direct call to ${headerName}...`, undefined, undefined, "info")}
        onOptionsPress={() => setContactModalVisible(true)}
        isWalkSafeActive={false}
      />

      {/* Main Chat Body & Keyboard View */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages List / Loading state */}
        {isLoadingMessages ? (
          <View style={styles.loadingContainer}>
            <HeartBeatWave width={220} color={ResQColors.primaryRed} />
            <Text style={styles.loadingText}>Loading Messages...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScrollView}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={100}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
            onLayout={() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }}
          >
            {isLoadingOlder && (
              <View style={styles.loadingOlderContainer}>
                <ActivityIndicator size="small" color={ResQColors.primaryRed} />
                <Text style={styles.loadingOlderText}>Loading older messages...</Text>
              </View>
            )}

            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>Start the conversation with {headerName}</Text>
              </View>
            ) : (
              messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  msg={msg}
                  headerName={headerName}
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
                  showSenderName={false}
                />
              ))
            )}
          </ScrollView>
        )}

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
      <ContactDetailsModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        contactId={params.contactId || params.id}
        name={headerName}
        relationship={headerSubtitle}
        avatarUrl={headerAvatar}
        phone={params.phone}
        onCallPress={() => showPopupAlert("Calling", `Initiating direct call to ${headerName}...`, undefined, undefined, "info")}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
    marginTop: 12,
  },
  loadingOlderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  loadingOlderText: {
    fontSize: 12.5,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#0F172A",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13.5,
    fontFamily: typography.regular,
    color: ResQColors.textMuted,
    textAlign: "center"
  },
});
