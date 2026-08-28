import { getCurrentUser, getUserProfile } from "@/backend/auth";
import {
  fetchEmergencyChatMessages,
  getOrCreateEmergencyChat,
  getCachedEmergencyMessages,
  getPendingEmergencyMessages,
  mapDbEmergencyMessageToChatMessage,
  mergeAndDeduplicateMessages,
  removePendingEmergencyMessage,
  savePendingEmergencyMessage,
  sendEmergencyChatMessage,
  setCachedEmergencyMessages,
  subscribeToEmergencyChatMessages,
  subscribeToEmergencyResponders,
  uploadEmergencyChatAudio,
  uploadEmergencyChatMedia,
  generateUUID,
  isValidUuid,
  EmergencyChat,
} from "@/backend/chat";
import { fetchEmergencyById, fetchEmergencyResponders, EmergencyRecord } from "@/backend/emergencies";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInputBar from "@/components/chat/ChatInputBar";
import ChatMessageItem from "@/components/chat/ChatMessageItem";
import ChatPillsRow, { PillItem } from "@/components/chat/ChatPillsRow";
import MediaViewerModal from "@/components/chat/MediaViewerModal";
import MedicalInfoModal from "@/components/MedicalInfoModal";
import HeartBeatWave from "@/components/HeartBeatWave";
import { showPopupAlert } from "@/components/popupAlert";
import { ResQColors } from "@/constants/Colors";
import { ChatMessage } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, RefreshCw, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";

// ---------------------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------------------

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

const configureAudioMode = async (forRecording: boolean) => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: forRecording,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
};

import { globalState } from "@/constants/globalState";

export default function EmergencyChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    incidentId?: string;
    id?: string;
    title?: string;
    severity?: string;
    location?: string;
    creatorId?: string;
    avatar?: string;
  }>();

  const passedId = params.incidentId || params.id;
  const activeGlobalId = globalState.activeEmergencyId;

  const emergencyId =
    passedId && isValidUuid(passedId)
      ? passedId
      : activeGlobalId && isValidUuid(activeGlobalId)
        ? activeGlobalId
        : "00000000-0000-0000-0000-000000000001";
  const headerName = params.title || "Emergency Response Unit";
  const headerSubtitle = params.location || "Active Scene Response";
  
  const [emergencyRecord, setEmergencyRecord] = useState<EmergencyRecord | null>(null);
  const [sceneGalleryVisible, setSceneGalleryVisible] = useState<boolean>(false);

  // Auth & Profile state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Responder");
  const [currentUserRole, setCurrentUserRole] = useState<string>("EMT");
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(undefined);

  // Active Chat Session state
  const [activeChatId, setActiveChatId] = useState<string>(emergencyId);
  const [emergencyChatData, setEmergencyChatData] = useState<EmergencyChat | null>(null);
  const [isResolved, setIsResolved] = useState<boolean>(false);
  const [participantCount, setParticipantCount] = useState<number>(1);

  // Connection & Sync state
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting" | "offline">("connected");
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [medicalModalVisible, setMedicalModalVisible] = useState(false);

  const sceneMediaFromRecord = emergencyRecord?.visual_media || [];
  const sceneMediaFromMessages = messages
    .filter((m) => (m.type === "media" || !!m.mediaUri) && !!m.mediaUri)
    .map((m) => m.mediaUri!);

  const allSceneMedia = Array.from(
    new Set([...sceneMediaFromRecord, ...sceneMediaFromMessages].filter(Boolean))
  );

  const headerAvatar =
    allSceneMedia.length > 0 ? allSceneMedia[0] : params.avatar || undefined;

  const handleHeaderAvatarPress = () => {
    if (allSceneMedia.length > 0) {
      setSceneGalleryVisible(true);
    } else {
      setMedicalModalVisible(true);
    }
  };

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
  const isSyncingRef = useRef<boolean>(false);

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

  // Configure audio session on mount
  useEffect(() => {
    let mounted = true;
    const initAudio = async () => {
      try {
        await configureAudioMode(false);
      } catch (error) {
        if (mounted) console.error("Audio mode setup notice:", error);
      }
    };
    initAudio();
    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup audio & timers on unmount
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
  // Process Pending Offline Messages Queue
  // ---------------------------------------------------------------------------
  const processPendingQueue = useCallback(async (chatId: string, userId: string) => {
    try {
      const pending = await getPendingEmergencyMessages(chatId);
      if (pending.length === 0) return;

      for (const msg of pending) {
        const { message, error } = await sendEmergencyChatMessage({
          id: msg.id,
          chatId,
          senderId: userId,
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          senderAvatarUrl: msg.senderAvatar,
          type: msg.type,
          textContent: msg.text,
          audioUrl: msg.audioUri,
          audioDurationSec: msg.audioDuration,
          mediaUrl: msg.mediaUri,
          mediaType: msg.mediaType,
          locationLat: msg.locationCoords?.latitude,
          locationLng: msg.locationCoords?.longitude,
          locationLabel: msg.locationLabel,
          isSystemMessage: msg.isSystemMessage,
        });

        if (message && !error) {
          await removePendingEmergencyMessage(chatId, msg.id, msg.text);
          const mapped = mapDbEmergencyMessageToChatMessage(message, userId);
          const confirmedMsg = { ...mapped, status: "sent" as const };
          setMessages((prev) => {
            const updated = mergeAndDeduplicateMessages(prev, [confirmedMsg]);
            setCachedEmergencyMessages(chatId, updated);
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn("processPendingQueue notice:", err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Sync Messages with Server & Merge Cache
  // ---------------------------------------------------------------------------
  const syncEmergencyChatMessages = useCallback(async (chatId: string, userId: string) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const { messages: serverMsgs, hasMore, error } = await fetchEmergencyChatMessages(
        chatId,
        userId,
        50
      );

      if (error) {
        setConnectionStatus("reconnecting");
      } else {
        setConnectionStatus("connected");
      }

      setHasMoreMessages(hasMore);

      // Merge server messages with current local state (preserving sending/failed optimistic items)
      setMessages((prev) => {
        const merged = mergeAndDeduplicateMessages(prev, serverMsgs);
        setCachedEmergencyMessages(chatId, merged);
        return merged;
      });

      // Process any pending offline messages
      await processPendingQueue(chatId, userId);
    } catch (err) {
      console.warn("syncEmergencyChatMessages exception:", err);
      setConnectionStatus("offline");
    } finally {
      isSyncingRef.current = false;
    }
  }, [processPendingQueue]);

  // ---------------------------------------------------------------------------
  // Initialize Chat, Auth, Caching & Realtime Subscriptions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isSubscribed = true;
    let unsubRealtime: (() => void) | null = null;
    let unsubResponders: (() => void) | null = null;

    const initEmergencyChat = async () => {
      setIsLoadingMessages(true);

      // Step 1: Load local cache immediately for instant display
      const cachedMsgs = await getCachedEmergencyMessages(emergencyId);
      if (cachedMsgs.length > 0 && isSubscribed) {
        setMessages(cachedMsgs);
        setIsLoadingMessages(false);
      }

      // Step 2: Fetch authenticated user
      const { user, error: userErr } = await getCurrentUser();
      let userId = user?.id || null;

      if (userErr || !user) {
        console.warn("User not logged in or offline during emergency chat initialization");
      }

      if (userId && isSubscribed) {
        setCurrentUserId(userId);
        const { profile } = await getUserProfile(userId);
        if (profile && isSubscribed) {
          setCurrentUserName(profile.name || user?.email || "Responder");
          setCurrentUserRole((profile.role || "Responder").toUpperCase());
          setCurrentUserAvatar(profile.profile_img_url || undefined);
        }
      }

      // Step 3: Get or Create Emergency Chat record & load emergency resolution status
      const { chat, error: chatErr } = await getOrCreateEmergencyChat({
        incidentId: emergencyId,
        title: headerName,
        location: headerSubtitle,
        severity: params.severity,
        creatorId: params.creatorId,
      });

      if (chat && isSubscribed) {
        setActiveChatId(chat.id);
        setEmergencyChatData(chat);
        setIsResolved(!chat.is_active || !!chat.resolved_at);
        if (chat.participant_ids) {
          setParticipantCount(Math.max(1, chat.participant_ids.length));
        }
      } else if (chatErr) {
        console.warn("getOrCreateEmergencyChat notice:", chatErr);
      }

      // Check primary emergencies table for resolution & scene media
      if (emergencyId) {
        const { data: empRec } = await fetchEmergencyById(emergencyId);
        if (empRec && isSubscribed) {
          setEmergencyRecord(empRec);
          if (empRec.is_resolved) {
            setIsResolved(true);
          }
        }
      }

      // Step 4: Fetch latest server messages & merge with cache
      if (userId) {
        await syncEmergencyChatMessages(emergencyId, userId);
      }

      if (isSubscribed) {
        setIsLoadingMessages(false);
      }

      // Step 5: Subscribe to Realtime emergency chat messages
      unsubRealtime = subscribeToEmergencyChatMessages(
        emergencyId,
        (rawMsg) => {
          if (!isSubscribed) return;
          const mapped = mapDbEmergencyMessageToChatMessage(rawMsg, userId || "");

          removePendingEmergencyMessage(emergencyId, mapped.id);

          setMessages((prev) => {
            const confirmedMsg = { ...mapped, status: "sent" as const };
            const filtered = prev.filter((m) => m.id !== confirmedMsg.id);
            const next = mergeAndDeduplicateMessages(filtered, [confirmedMsg]);
            setCachedEmergencyMessages(emergencyId, next);
            return next;
          });

          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        },
        (updatedChat) => {
          if (!isSubscribed) return;
          if (updatedChat) {
            setEmergencyChatData(updatedChat);
            if (updatedChat.is_active === false || updatedChat.resolved_at) {
              setIsResolved(true);
            }
          }
        },
        (status) => {
          if (!isSubscribed) return;
          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected");
            if (userId) {
              syncEmergencyChatMessages(emergencyId, userId);
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConnectionStatus("reconnecting");
          } else if (status === "CLOSED") {
            setConnectionStatus("offline");
          }
        }
      );

      // Step 6: Subscribe to active responders list
      unsubResponders = subscribeToEmergencyResponders(emergencyId, async () => {
        if (!isSubscribed) return;
        const { data: responders } = await fetchEmergencyResponders(emergencyId);
        if (responders && isSubscribed) {
          setParticipantCount(Math.max(1, responders.length + (params.creatorId ? 1 : 0)));
        }
      });
    };

    initEmergencyChat();

    return () => {
      isSubscribed = false;
      if (unsubRealtime) unsubRealtime();
      if (unsubResponders) unsubResponders();
    };
  }, [emergencyId, headerName, headerSubtitle, params.creatorId, params.severity, syncEmergencyChatMessages]);

  // ---------------------------------------------------------------------------
  // Load Older Messages (Upward Pagination)
  // ---------------------------------------------------------------------------
  const handleLoadOlderMessages = async () => {
    if (isLoadingOlder || !hasMoreMessages || messages.length === 0 || !activeChatId) return;

    setIsLoadingOlder(true);
    try {
      const oldestMessage = messages[0];
      const beforeTimestamp = oldestMessage?.createdAtIso || (oldestMessage?.createdTimestamp ? new Date(oldestMessage.createdTimestamp).toISOString() : undefined);

      const { messages: olderMsgs, hasMore } = await fetchEmergencyChatMessages(
        activeChatId,
        currentUserId || "",
        35,
        beforeTimestamp
      );

      setHasMoreMessages(hasMore);

      if (olderMsgs.length > 0) {
        setMessages((prev) => {
          const merged = mergeAndDeduplicateMessages(olderMsgs, prev);
          setCachedEmergencyMessages(activeChatId, merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn("handleLoadOlderMessages notice:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y < 30 && !isLoadingOlder && hasMoreMessages) {
      handleLoadOlderMessages();
    }
  };

  // ---------------------------------------------------------------------------
  // Send Generic Message Helper (Optimistic UI + Idempotent Client ID)
  // ---------------------------------------------------------------------------
  const executeSendMessage = async (msgParams: {
    customId?: string;
    type: ChatMessage["type"];
    text?: string;
    audioUri?: string;
    audioDuration?: number;
    mediaUri?: string;
    mediaType?: "image" | "video";
    locationCoords?: { latitude: number; longitude: number };
    locationLabel?: string;
    isSystemMessage?: boolean;
  }) => {
    if (isResolved) {
      showPopupAlert(
        "Emergency Resolved",
        "This emergency conversation is closed and now read-only.",
        undefined,
        undefined,
        "info"
      );
      return;
    }

    const clientMsgId =
      msgParams.customId && isValidUuid(msgParams.customId)
        ? msgParams.customId
        : generateUUID();

    const createdIso = new Date().toISOString();
    const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Step 1: Optimistic UI Message Insertion
    const optimisticMsg: ChatMessage = {
      id: clientMsgId,
      chatId: activeChatId,
      senderId: currentUserId || "anon",
      sender: msgParams.isSystemMessage ? "system" : "me",
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatar: currentUserAvatar,
      timestamp: formattedTime,
      type: msgParams.type,
      text: msgParams.text,
      audioUri: msgParams.audioUri,
      audioDuration: msgParams.audioDuration,
      mediaUri: msgParams.mediaUri,
      mediaType: msgParams.mediaType,
      locationCoords: msgParams.locationCoords,
      locationLabel: msgParams.locationLabel,
      isSystemMessage: msgParams.isSystemMessage,
      status: "sending",
      createdTimestamp: Date.now(),
      createdAtIso: createdIso,
    };

    setMessages((prev) => {
      const updated = mergeAndDeduplicateMessages(prev, [optimisticMsg]);
      setCachedEmergencyMessages(activeChatId, updated);
      return updated;
    });

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

    // Step 2: Supabase Server Insertion
    const { message, error } = await sendEmergencyChatMessage({
      id: clientMsgId,
      chatId: activeChatId,
      senderId: currentUserId || "00000000-0000-0000-0000-000000000000",
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatarUrl: currentUserAvatar,
      type: msgParams.type,
      textContent: msgParams.text,
      audioUrl: msgParams.audioUri,
      audioDurationSec: msgParams.audioDuration,
      mediaUrl: msgParams.mediaUri,
      mediaType: msgParams.mediaType,
      locationLat: msgParams.locationCoords?.latitude,
      locationLng: msgParams.locationCoords?.longitude,
      locationLabel: msgParams.locationLabel,
      isSystemMessage: msgParams.isSystemMessage,
    });

    // Step 3: Handle Server Response / Network Offline Failure
    if (error || !message) {
      console.warn("Failed to send emergency message, queuing offline:", error);

      setMessages((prev) => {
        const existingSent = prev.find(
          (m) =>
            (m.id === clientMsgId || (!!msgParams.text && m.text === msgParams.text)) &&
            m.status === "sent"
        );
        if (existingSent) return prev;

        const failedMsg = { ...optimisticMsg, status: "failed" as const };
        savePendingEmergencyMessage(activeChatId, failedMsg);
        return prev.map((m) => (m.id === clientMsgId ? failedMsg : m));
      });

      setConnectionStatus("offline");
    } else {
      await removePendingEmergencyMessage(activeChatId, clientMsgId, msgParams.text);
      const serverMapped = mapDbEmergencyMessageToChatMessage(message, currentUserId || "");
      const confirmedMsg = { ...serverMapped, status: "sent" as const };

      setMessages((prev) => {
        const updated = mergeAndDeduplicateMessages(prev, [confirmedMsg]);
        setCachedEmergencyMessages(activeChatId, updated);
        return updated;
      });
      setConnectionStatus("connected");
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (msg: ChatMessage) => {
    await removePendingEmergencyMessage(activeChatId, msg.id);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    await executeSendMessage({
      customId: msg.id,
      type: msg.type,
      text: msg.text,
      audioUri: msg.audioUri,
      audioDuration: msg.audioDuration,
      mediaUri: msg.mediaUri,
      mediaType: msg.mediaType,
      locationCoords: msg.locationCoords,
      locationLabel: msg.locationLabel,
      isSystemMessage: msg.isSystemMessage,
    });
  };

  // Send Text Message
  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText("");
    await executeSendMessage({ type: "text", text: textToSend });
  };

  // ---------------------------------------------------------------------------
  // Audio Voice Note Recording Logic
  // ---------------------------------------------------------------------------
  const clearRecordingTimer = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

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

  const handleVoicePressIn = async () => {
    if (isResolved) return;
    if (micPressActiveRef.current || recordingRef.current) return;
    micPressActiveRef.current = true;

    Animated.spring(voiceScale, {
      toValue: 1.35,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();

    try {
      audioTokenRef.current += 1;
      await stopCurrentSound();

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        micPressActiveRef.current = false;
        setIsRecording(false);
        showPopupAlert(
          "Permission Denied",
          "Microphone access is required to record emergency voice notes.",
          undefined,
          undefined,
          "warning"
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
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          setRecordDuration(elapsed);
        }
      }, 250);
    } catch (error) {
      console.error("Failed to start emergency audio recording:", error);
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
      const localUri = recording.getURI();
      const durationSec = startedAt
        ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
        : Math.max(1, recordDuration);

      await configureAudioMode(false).catch(() => { });

      if (!localUri) {
        setRecordDuration(0);
        showPopupAlert("Recording Error", "The recording file could not be created.", undefined, undefined, "error");
        return;
      }

      if (durationSec < 1) {
        setRecordDuration(0);
        showPopupAlert(
          "Recording Too Short",
          "Hold the mic button for at least one second to record a voice note.",
          undefined,
          undefined,
          "warning"
        );
        return;
      }

      // Upload Audio to Supabase Storage bucket 'images' under folder 'emergencyChatMedia/audio/'
      let publicAudioUrl = localUri;
      try {
        publicAudioUrl = await uploadEmergencyChatAudio(localUri);
      } catch (uploadErr) {
        console.warn("Audio upload notice (falling back to local URI):", uploadErr);
      }

      setRecordDuration(0);

      await executeSendMessage({
        type: "audio",
        audioUri: publicAudioUrl,
        audioDuration: durationSec,
      });
    } catch (error) {
      console.error("Failed to stop voice recording:", error);
      setIsRecording(false);
      setRecordDuration(0);
      recordingStartTimeRef.current = null;
    }
  };

  // Play Audio Voice Note
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
        await soundRef.current.playAsync();
        setPausedMessageId(null);
        setPlayingMessageId(msg.id);
        return;
      } catch (err) {
        console.error("Error resuming audio:", err);
      }
    }

    const currentToken = ++audioTokenRef.current;
    await stopCurrentSound();
    if (currentToken !== audioTokenRef.current) return;
    setLoadingMessageId(msg.id);

    try {
      await configureAudioMode(false);
      const uriToPlay = resolvePlayableUri(msg.audioUri);

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: uriToPlay },
        { shouldPlay: false, positionMillis: 0, volume: 1.0, isMuted: false, progressUpdateIntervalMillis: 150 }
      );

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
          if (soundRef.current === sound) soundRef.current = null;
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
      console.error("Error playing emergency audio:", error);
      if (currentToken === audioTokenRef.current) {
        await stopCurrentSound();
        showPopupAlert("Playback Error", "This voice note could not be played.", undefined, undefined, "error");
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Visual Media (Gallery & Camera Pickers)
  // ---------------------------------------------------------------------------
  const handlePickAttachment = async () => {
    if (isResolved) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        showPopupAlert("Permission Denied", "Gallery access is required to share photos.", undefined, undefined, "warning");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVideo = asset.type === "video";
        let uploadedUrl = asset.uri;

        try {
          uploadedUrl = await uploadEmergencyChatMedia(asset.uri, isVideo ? "video" : "image");
        } catch (upErr) {
          console.warn("Media upload notice (using local URI):", upErr);
        }

        await executeSendMessage({
          type: "media",
          mediaUri: uploadedUrl,
          mediaType: isVideo ? "video" : "image",
          text: isVideo ? "🎥 Emergency Video Attachment" : "📷 Emergency Photo Attachment",
        });
      }
    } catch (err) {
      console.log("Media library error:", err);
    }
  };

  const handleOpenCamera = async () => {
    if (isResolved) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        showPopupAlert("Permission Denied", "Camera access is required to capture scene evidence.", undefined, undefined, "warning");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        let uploadedUrl = photo.uri;
        try {
          uploadedUrl = await uploadEmergencyChatMedia(photo.uri, "image");
        } catch (upErr) {
          console.warn("Camera image upload notice:", upErr);
        }

        await executeSendMessage({
          type: "media",
          mediaUri: uploadedUrl,
          mediaType: "image",
          text: "📷 Scene Evidence Photo",
        });
      }
    } catch (err) {
      console.log("Camera error:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Share Current GPS Location
  // ---------------------------------------------------------------------------
  const handleShareLocation = async () => {
    if (isResolved) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showPopupAlert("Permission Denied", "GPS location access is required.", undefined, undefined, "warning");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;

      await executeSendMessage({
        type: "location_share",
        locationCoords: { latitude, longitude },
        locationLabel: headerSubtitle,
        text: `📍 Shared GPS Location: Near ${headerSubtitle} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      });
    } catch (err) {
      console.warn("Share location error:", err);
      showPopupAlert("Location Error", "Could not retrieve GPS location coordinates.", undefined, undefined, "error");
    }
  };

  // Emergency Quick Pills
  const emergencyPills: PillItem[] = [
    { label: "On-site", action: "text" },
    { label: "📍 Share GPS", action: "text" },
    { label: "Need backup", action: "text" },
    { label: "Route clear", action: "text" },
    { label: "ETA 3 mins", action: "text" },
    { label: "Prepping oxygen", action: "text" },
  ];

  const handlePillPress = async (item: PillItem) => {
    if (isResolved) return;
    if (item.label.includes("Share GPS")) {
      await handleShareLocation();
    } else {
      await executeSendMessage({ type: "text", text: item.label });
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Component */}
      <ChatHeader
        headerName={headerName}
        headerSubtitle={`${headerSubtitle} • ${participantCount} Active ${participantCount === 1 ? "Responder" : "Responders"}`}
        headerAvatar={headerAvatar}
        showSceneBadge={true}
        sceneBadgeText={isResolved ? "Resolved" : "On-site"}
        showCallButton={false}
        onBackPress={() => router.back()}
        onOptionsPress={() => setMedicalModalVisible(true)}
        onAvatarPress={handleHeaderAvatarPress}
      />

      {/* Connection & Network Status Banner */}
      <View style={styles.connectionBannerRow}>
        <View style={styles.statusIndicatorWrapper}>
          <View
            style={[
              styles.statusDot,
              connectionStatus === "connected"
                ? styles.dotGreen
                : connectionStatus === "reconnecting"
                  ? styles.dotAmber
                  : styles.dotGray,
            ]}
          />
          <Text style={styles.connectionStatusText}>
            {connectionStatus === "connected"
              ? "● Realtime Connected"
              : connectionStatus === "reconnecting"
                ? "⚠ Reconnecting channel..."
                : "○ Offline (Queuing messages locally)"}
          </Text>
        </View>
        {connectionStatus !== "connected" && (
          <TouchableOpacity
            style={styles.retrySyncBtn}
            onPress={() => syncEmergencyChatMessages(activeChatId, currentUserId || "")}
          >
            <RefreshCw size={12} color="#0F172A" />
            <Text style={styles.retrySyncText}>Sync</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Read-Only Emergency Resolved Banner */}
      {isResolved && (
        <View style={styles.resolvedBanner}>
          <AlertTriangle size={16} color="#991B1B" />
          <Text style={styles.resolvedBannerText}>
            🔴 Emergency Resolved — This conversation is now read-only.
          </Text>
        </View>
      )}

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
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
        >
          {/* Loading Older Messages Wave */}
          {isLoadingOlder && (
            <View style={styles.olderLoadingWrapper}>
              <HeartBeatWave width={140} color={ResQColors.primaryRedText} thickness={4} />
              <Text style={styles.olderLoadingText}>Loading older emergency messages...</Text>
            </View>
          )}

          {isLoadingMessages && messages.length === 0 ? (
            <View style={styles.centerLoading}>
              <HeartBeatWave width={220} color={ResQColors.primaryRed} />
              <Text style={styles.loadingText}>Initializing Emergency Response Chat...</Text>
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
                onNavigateToMap={() => {
                  router.push({
                    pathname: "/IncidentDetails",
                    params: { incidentId: emergencyId },
                  } as any);
                }}
                onRetry={handleRetryMessage}
                showSenderName={true}
                showAvatar={true}
              />
            ))
          )}
        </ScrollView>

        {/* Emergency Quick Action Pills Row */}
        {!isResolved && <ChatPillsRow pills={emergencyPills} onPillPress={handlePillPress} />}

        {/* Bottom Input Bar */}
        {!isResolved ? (
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
        ) : (
          <View style={styles.readOnlyFooter}>
            <Text style={styles.readOnlyFooterText}>
              Emergency resolved. New messages cannot be sent.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Medical Info Modal */}
      <MedicalInfoModal
        visible={medicalModalVisible}
        onClose={() => setMedicalModalVisible(false)}
      />

      {/* Emergency Scene Media Gallery Modal */}
      <Modal
        visible={sceneGalleryVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSceneGalleryVisible(false)}
      >
        <View style={styles.galleryBackdrop}>
          <View style={styles.galleryCard}>
            <View style={styles.galleryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.galleryTitle}>
                  Emergency Scene Media ({allSceneMedia.length})
                </Text>
                <Text style={styles.gallerySub}>
                  Photos & visual evidence reported for this incident
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSceneGalleryVisible(false)}
                style={styles.galleryCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.galleryGrid} showsVerticalScrollIndicator={false}>
              {allSceneMedia.map((mediaUri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.galleryItem}
                  activeOpacity={0.85}
                  onPress={() => {
                    setActiveMedia({ uri: mediaUri, type: "image" });
                    setMediaViewerVisible(true);
                  }}
                >
                  <Image source={{ uri: mediaUri }} style={styles.galleryThumb} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  connectionBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  statusIndicatorWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGreen: {
    backgroundColor: "#10B981",
  },
  dotAmber: {
    backgroundColor: "#F59E0B",
  },
  dotGray: {
    backgroundColor: "#94A3B8",
  },
  connectionStatusText: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: "#475569",
  },
  retrySyncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  retrySyncText: {
    fontSize: 11,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  resolvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#FCA5A5",
  },
  resolvedBannerText: {
    fontSize: 12,
    fontFamily: typography.bold,
    color: "#991B1B",
  },
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  olderLoadingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  olderLoadingText: {
    fontSize: 11.5,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  readOnlyFooter: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
  },
  readOnlyFooterText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  galleryBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
  galleryCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: "75%",
  },
  galleryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  galleryTitle: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  gallerySub: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: "#64748B",
    marginTop: 2,
  },
  galleryCloseBtn: {
    padding: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 4,
  },
  galleryItem: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  galleryThumb: {
    width: "100%",
    height: "100%",
  },
});