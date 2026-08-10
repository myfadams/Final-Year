import NavHeader from "@/components/NavHeader";
import Colors from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { emergencyAlerts, PEOPLE } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  BriefcaseMedical,
  Car,
  Check,
  Clock,
  Flame,
  Footprints,
  Info,
  MapPin,
  MessageSquare,
  Mic,
  Pause,
  Phone,
  Play,
  RotateCw,
  Shield,
  Siren,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

// Default demo clip used whenever a voice note doesn't have a real, playable URI.
const FALLBACK_VOICE_NOTE_URI =
  "https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3";

export default function IncidentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();
  // console.log(resolvedFromParams);
  // console.log(incident);
  // console.log(params);

  // Resolve the incident details from params first (for robust direct state pass),
  // falling back to lookup in emergencyAlerts if incomplete.
  const resolvedFromParams = params.title && params.location;

  const incident = resolvedFromParams
    ? {
        id: params.id || "1",
        title: params.title,
        description: params.description || "",
        location: params.location,
        distance: params.distance ? parseInt(params.distance, 10) : 120,
        time: params.time ? parseInt(params.time, 10) : 0,
        responseTime: params.responseTime
          ? parseInt(params.responseTime, 10)
          : 240,
        severity: params.severity || "Moderate",
        isResolved: params.isResolved === "true",
        photos: params.photos ? JSON.parse(params.photos) : null,
      }
    : emergencyAlerts.find((item) => item.id === params.id) ||
      emergencyAlerts[0];

  // Lookup coordinate from PEOPLE list, fallback to KNUST main campus coordinates
  const person = PEOPLE.find((p) => p.id === incident.id);
  const latitude = person ? person.latitude : 6.675155;
  const longitude = person ? person.longitude : -1.571569;

  // Resolve color scheme dynamically from severity level
  const getSeverityColors = (level: string) => {
    switch (level) {
      case "Critical":
        return {
          color: Colors.URGENCY_COLORS.critical,
          bg: Colors.URGENCY_BACKGROUND.critical,
        };
      case "Moderate":
        return {
          color: Colors.URGENCY_COLORS.high,
          bg: Colors.URGENCY_BACKGROUND.high,
        };
      case "Low":
      default:
        return {
          color: Colors.URGENCY_COLORS.medium,
          bg: Colors.URGENCY_BACKGROUND.medium,
        };
    }
  };
  // console.log(incident.severity);
  const severityColors = getSeverityColors(incident.severity);

  // State for fullscreen photo/video viewer lightbox
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeMediaUri, setActiveMediaUri] = useState<string | null>(null);
  const [activeMediaType, setActiveMediaType] = useState<"image" | "video">(
    "image",
  );

  // State to track if the current resident is responding to this emergency
  const [isResponding, setIsResponding] = useState(
    globalState.activeEmergencyId === incident.id.toString(),
  );

  // Sync response state in real-time whenever the details screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      setIsResponding(globalState.activeEmergencyId === incident.id.toString());
    }, [incident.id]),
  );

  const handleRespondToggle = () => {
    const idStr = incident.id.toString();
    if (isResponding) {
      globalState.activeEmergencyId = null;
      setIsResponding(false);
      Alert.alert(
        "Response Cancelled",
        "You are no longer assigned as a responder to this incident.",
      );
    } else {
      globalState.activeEmergencyId = idStr;
      setIsResponding(true);
      Alert.alert(
        "Response Assigned",
        "You have been successfully assigned to respond. Would you like to view the navigation map route?",
        [
          {
            text: "View Navigation Map",
            onPress: () => {
              router.push({
                pathname: "/(resident)/map",
                params: { personId: idStr, action: "respond" },
              });
            },
          },
          { text: "Dismiss", style: "cancel" },
        ],
      );
    }
  };

  // Retrieve attached media (from submitted report state or database mock)
  const mediaList =
    (incident as any).photos ||
    (person && person.images
      ? person.images.map((url: string) => ({
          uri: url,
          type: "image" as const,
        }))
      : []);

  // Retrieve attached voice notes (from params, report submit, or mock data).
  // Memoized off stable primitives (incident.id, the raw params string) so this
  // array keeps a STABLE reference across re-renders. Without this, a new array
  // was created on every render, which retriggered the duration-fetch effect
  // below on every render — including its cleanup, which was unloading the
  // sound that was actively playing, killing playback moments after it started.
  const voiceNotesList: { id: string; uri: string; duration: number }[] =
    React.useMemo(() => {
      if (params.voiceNotes) {
        try {
          const parsed = JSON.parse(params.voiceNotes as string);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.log("Failed to parse voiceNotes param:", e);
        }
      }

      return (
        (incident as any).voiceNotes || [
          {
            id: "vn_1",
            uri: FALLBACK_VOICE_NOTE_URI,
            duration: 3,
          },
        ]
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.voiceNotes, incident.id]);

  // Audio Playback state for voice notes
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [pausedNoteId, setPausedNoteId] = useState<string | null>(null);
  const [noteDurations, setNoteDurations] = useState<Record<string, number>>(
    {},
  );
  const [playbackRemaining, setPlaybackRemaining] = useState<
    Record<string, number>
  >({});
  const [playbackProgress, setPlaybackProgress] = useState<
    Record<string, number>
  >({});
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const isMountedRef = React.useRef(true);

  // Resolve a safe, playable URI for a voice note, falling back to a demo clip
  // for anything that isn't a genuine remote/local audio URI.
  const resolveVoiceNoteUri = (uri?: string | null) => {
    if (!uri) return FALLBACK_VOICE_NOTE_URI;
    const isPlayableScheme =
      uri.startsWith("http://") ||
      uri.startsWith("https://") ||
      uri.startsWith("file://") ||
      uri.startsWith("content://") ||
      uri.startsWith("data:");
    return isPlayableScheme ? uri : FALLBACK_VOICE_NOTE_URI;
  };

  // Configure the audio mode once on mount. On unmount, stop and release
  // whatever is currently loaded so nothing keeps playing in the background.
  React.useEffect(() => {
    isMountedRef.current = true;

    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    return () => {
      isMountedRef.current = false;
      const sound = soundRef.current;
      soundRef.current = null;
      if (sound) {
        sound.setOnPlaybackStatusUpdate(null);
        sound.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Fetch each voice note's real duration once (without playing it). This only
  // reruns when voiceNotesList genuinely changes (e.g. navigating to a
  // different incident), not on every render.
  React.useEffect(() => {
    let cancelled = false;

    const loadDurations = async () => {
      for (const note of voiceNotesList) {
        if (cancelled) return;
        try {
          const { sound, status } = await Audio.Sound.createAsync(
            { uri: resolveVoiceNoteUri(note.uri) },
            { shouldPlay: false },
          );
          if (status.isLoaded && status.durationMillis && !cancelled) {
            const exactSeconds = Math.max(
              1,
              Math.round(status.durationMillis / 1000),
            );
            setNoteDurations((prev) => ({ ...prev, [note.id]: exactSeconds }));
          }
          await sound.unloadAsync().catch(() => {});
        } catch (e) {
          console.log("Error loading audio duration:", e);
        }
      }
    };

    loadDurations();

    return () => {
      cancelled = true;
    };
  }, [voiceNotesList]);

  // Stop any playing voice note when the screen loses focus (e.g. user
  // navigates to another tab/screen) so audio doesn't keep running unattended.
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        const sound = soundRef.current;
        soundRef.current = null;
        if (sound) {
          sound.setOnPlaybackStatusUpdate(null);
          sound.stopAsync().catch(() => {});
          sound.unloadAsync().catch(() => {});
        }
        setPlayingNoteId(null);
        setPausedNoteId(null);
      };
    }, []),
  );

  const stopActivePlayback = async () => {
    setPlayingNoteId(null);
    setPausedNoteId(null);
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      sound.setOnPlaybackStatusUpdate(null);
      try {
        await sound.stopAsync();
      } catch (e) {}
      try {
        await sound.unloadAsync();
      } catch (e) {}
    }
  };

  const handlePlayVoiceNote = async (note: {
    id: string;
    uri: string;
    duration?: number;
  }) => {
    // 1. If currently PLAYING this note -> PAUSE IT (keep sound loaded & preserve position!)
    if (playingNoteId === note.id && soundRef.current) {
      try {
        await soundRef.current.pauseAsync();
        setPlayingNoteId(null);
        setPausedNoteId(note.id);
      } catch (e) {
        console.error("Error pausing voice note:", e);
      }
      return;
    }

    // 2. If currently PAUSED on this note -> RESUME IT from paused position!
    if (pausedNoteId === note.id && soundRef.current) {
      try {
        setPausedNoteId(null);
        setPlayingNoteId(note.id);
        await soundRef.current.playAsync();
      } catch (e) {
        console.error("Error resuming voice note:", e);
      }
      return;
    }

    // 3. Only one note plays at a time — stop and release whatever is active first.
    await stopActivePlayback();

    try {
      const knownDuration = noteDurations[note.id] || note.duration || 3;
      setPlaybackRemaining((prev) => ({ ...prev, [note.id]: knownDuration }));
      setPlaybackProgress((prev) => ({ ...prev, [note.id]: 0 }));
      setPlayingNoteId(note.id);
      setPausedNoteId(null);

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: resolveVoiceNoteUri(note.uri) },
        {
          shouldPlay: true,
          positionMillis: 0,
          volume: 1.0,
          isMuted: false,
          progressUpdateIntervalMillis: 150,
        },
      );

      if (!status.isLoaded) {
        await sound.unloadAsync().catch(() => {});
        throw new Error("Failed to load audio");
      }

      soundRef.current = sound;
      const fallbackDurationMs = knownDuration * 1000;

      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (!isMountedRef.current || !playbackStatus.isLoaded) return;

        const durationMs =
          playbackStatus.durationMillis && playbackStatus.durationMillis > 0
            ? playbackStatus.durationMillis
            : fallbackDurationMs;
        const positionMs = playbackStatus.positionMillis ?? 0;

        if (durationMs > 0) {
          const remainingSec = Math.max(
            0,
            Math.ceil((durationMs - positionMs) / 1000),
          );
          setPlaybackRemaining((prev) => ({
            ...prev,
            [note.id]: remainingSec,
          }));
          setPlaybackProgress((prev) => ({
            ...prev,
            [note.id]: Math.min(1, positionMs / durationMs),
          }));
        }

        if (playbackStatus.didJustFinish) {
          setPlayingNoteId((current) => (current === note.id ? null : current));
          setPausedNoteId((current) => (current === note.id ? null : current));
          setPlaybackRemaining((prev) => ({
            ...prev,
            [note.id]: Math.round(durationMs / 1000),
          }));
          setPlaybackProgress((prev) => ({ ...prev, [note.id]: 0 }));

          if (soundRef.current === sound) {
            soundRef.current = null;
          }
          sound.setOnPlaybackStatusUpdate(null);
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (err) {
      console.error("Failed to play voice note in incident detail:", err);
      setPlayingNoteId(null);
      setPausedNoteId(null);
      await stopActivePlayback();
      Alert.alert("Audio Error", "Could not play voice note.");
    }
  };

  // Hardcoded coordinates for nearby responders relative to center
  const respondersData = [
    {
      id: "resp_1",
      name: "John Doe",
      role: "EMT",
      status: "On-site",
      statusColor: "#2E7D32",
      icon: BriefcaseMedical,
      lat: latitude + 0.0003,
      lng: longitude + 0.0004,
      color: "#2E7D32",
      statusText: "On-site",
      timeText: "",
    },
    {
      id: "resp_2",
      name: "Sarah Smith",
      role: "Security",
      status: "2 mins away",
      statusColor: "#F57C00",
      icon: Shield,
      lat: latitude - 0.0008,
      lng: longitude + 0.0007,
      color: "#F57C00",
      statusText: "2 mins away",
      timeText: "2 mins away",
    },
    {
      id: "resp_3",
      name: "Ambulance Unit 4",
      role: "",
      status: "En route",
      statusColor: "#1976D2",
      icon: Car,
      lat: latitude + 0.0016,
      lng: longitude - 0.0014,
      color: "#1976D2",
      statusText: "En route",
      timeText: "En route",
    },
  ];

  const handleCallServices = () => {
    Alert.alert(
      "Call Dispatch",
      "Direct line to KNUST emergency responders. Would you like to call now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: () => Alert.alert("Connecting", "Calling KNUST Dispatch..."),
        },
      ],
    );
  };

  const handleMessage = () => {
    router.push({
      pathname: "/emergencyChat",
      params: {
        incidentId: incident.id.toString(),
        title: incident.title,
        severity: incident.severity,
        location: incident.location,
      },
    });
  };

  const handleRefresh = () => {
    Alert.alert(
      "Status Refreshed",
      "Responders status and GPS coordinates updated.",
    );
  };

  // Determine standard alert incident icon
  const getAlertIcon = () => {
    const titleLower = incident.title.toLowerCase();
    if (
      titleLower.includes("breathing") ||
      titleLower.includes("injury") ||
      titleLower.includes("medical")
    ) {
      return BriefcaseMedical;
    } else if (
      titleLower.includes("fire") ||
      titleLower.includes("smoke") ||
      titleLower.includes("electric")
    ) {
      return Flame;
    } else if (
      titleLower.includes("suspicious") ||
      titleLower.includes("security") ||
      titleLower.includes("loiter")
    ) {
      return Shield;
    } else {
      return AlertTriangle;
    }
  };

  const ActiveAlertIcon = getAlertIcon();

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Header */}

      <NavHeader title="Incident Details" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Incident Summary Card */}
        <View style={styles.summaryContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.incidentTitle} numberOfLines={2}>
              {incident.title}
            </Text>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severityColors.bg },
              ]}
            >
              <Text
                style={[styles.severityText, { color: severityColors.color }]}
              >
                {incident.severity.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={16} color="#64748B" />
              <Text style={styles.metaText}>Started 4 mins ago</Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={16} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>
                {incident.location}
              </Text>
            </View>
          </View>
        </View>

        {/* Map View Card */}
        <View style={styles.mapCard}>
          <MapView
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.006,
              longitudeDelta: 0.006,
            }}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            {/* Pulsating alert circle range */}
            <Circle
              center={{ latitude, longitude }}
              radius={130}
              fillColor="rgba(211, 47, 47, 0.09)"
              strokeColor="rgba(211, 47, 47, 0.25)"
              strokeWidth={1.5}
            />

            {/* Main active incident marker */}
            <Marker coordinate={{ latitude, longitude }}>
              <View style={styles.incidentMarkerContainer}>
                <View
                  style={[
                    styles.incidentMarkerCircle,
                    { backgroundColor: severityColors.color },
                  ]}
                >
                  <ActiveAlertIcon
                    size={16}
                    color="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </View>
                <View
                  style={[
                    styles.incidentMarkerArrow,
                    { borderTopColor: severityColors.color },
                  ]}
                />
              </View>
            </Marker>

            {/* Responder location markers */}
            {respondersData.map((resp) => {
              const RespIcon = resp.icon;
              return (
                <Marker
                  key={resp.id}
                  coordinate={{ latitude: resp.lat, longitude: resp.lng }}
                >
                  <View style={styles.responderMarkerContainer}>
                    <View
                      style={[
                        styles.responderMarkerCircle,
                        { backgroundColor: resp.color },
                      ]}
                    >
                      <RespIcon size={13} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        </View>

        {/* Responder Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Responder Status</Text>
          <View style={styles.timelineCard}>
            {respondersData.map((resp, index) => {
              const isLast = index === respondersData.length - 1;

              return (
                <View key={resp.id} style={styles.timelineRow}>
                  {/* Left bullet marker and connector */}
                  <View style={styles.timelineBulletContainer}>
                    <View
                      style={[
                        styles.timelineBulletCircle,
                        { borderColor: resp.color },
                      ]}
                    >
                      <View
                        style={[
                          styles.timelineBulletInner,
                          { backgroundColor: resp.color },
                        ]}
                      />
                    </View>
                    {!isLast && <View style={styles.timelineConnector} />}
                  </View>

                  {/* Content details */}
                  <View style={styles.timelineContent}>
                    <View style={styles.responderNameRow}>
                      <Text style={styles.responderName}>{resp.name}</Text>
                      {resp.role !== "" && (
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>{resp.role}</Text>
                        </View>
                      )}
                    </View>

                    {/* Status badges matching mockup */}
                    <View style={styles.statusBadgeRow}>
                      {resp.status === "On-site" ? (
                        <View style={styles.statusLabelContainer}>
                          <View style={styles.checkmarkCircle}>
                            <Check size={10} color="#FFFFFF" strokeWidth={3} />
                          </View>
                          <Text
                            style={[
                              styles.statusLabelText,
                              { color: resp.statusColor },
                            ]}
                          >
                            {resp.status}
                          </Text>
                        </View>
                      ) : resp.status === "2 mins away" ? (
                        <View style={styles.statusLabelContainer}>
                          <Footprints size={14} color={resp.statusColor} />
                          <Text
                            style={[
                              styles.statusLabelText,
                              { color: resp.statusColor },
                            ]}
                          >
                            {resp.status}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.statusLabelContainer}>
                          <Car size={14} color={resp.statusColor} />
                          <Text
                            style={[
                              styles.statusLabelText,
                              { color: resp.statusColor },
                            ]}
                          >
                            {resp.status}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Incident Description Card */}
        <View style={styles.section}>
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <Info
                size={18}
                color={severityColors.color}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.descriptionCardTitle}>
                Incident Description
              </Text>
            </View>
            <Text style={styles.descriptionBody}>{incident.description}</Text>
          </View>
        </View>

        {/* Voice Notes Section */}
        {voiceNotesList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Voice Notes ({voiceNotesList.length})
            </Text>
            {voiceNotesList.map((note) => {
              const isPlaying = playingNoteId === note.id;
              const isPaused = pausedNoteId === note.id;
              const isPlayingOrPaused = isPlaying || isPaused;
              const totalSec = noteDurations[note.id] || note.duration || 14;
              const currentRemaining =
                isPlayingOrPaused && playbackRemaining[note.id] !== undefined
                  ? playbackRemaining[note.id]
                  : totalSec;
              const currentProgress = isPlayingOrPaused
                ? playbackProgress[note.id] || 0
                : 0;

              const formatSeconds = (sec: number) => {
                const mins = Math.floor(sec / 60);
                const secs = sec % 60;
                return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
              };

              const waveformBars = [
                12, 22, 16, 30, 24, 14, 28, 34, 20, 15, 26, 18, 10, 22, 29, 16,
                24, 12,
              ];

              return (
                <View key={note.id} style={styles.voiceNoteCard}>
                  <View style={styles.voiceNoteHeader}>
                    <View
                      style={[
                        styles.micIconCircle,
                        { backgroundColor: severityColors.bg },
                      ]}
                    >
                      <Mic size={18} color={severityColors.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.voiceNoteTitle}>
                        Voice Note Attachment
                      </Text>
                      <Text style={styles.voiceNoteSubtitle}>
                        Audio message from reporter
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.durationBadge,
                        { backgroundColor: severityColors.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.durationBadgeText,
                          { color: severityColors.color },
                        ]}
                      >
                        {formatSeconds(currentRemaining)}
                      </Text>
                    </View>
                  </View>

                  {/* Visualizer Waveform Bar */}
                  <View style={styles.waveformContainer}>
                    {waveformBars.map((h, i) => {
                      const totalBars = waveformBars.length;
                      const activeBarCount = Math.floor(
                        currentProgress * totalBars,
                      );
                      const isBarPlayed =
                        isPlayingOrPaused && i <= activeBarCount;

                      return (
                        <View
                          key={i}
                          style={[
                            styles.waveformBar,
                            {
                              height: h,
                              backgroundColor: isBarPlayed
                                ? severityColors.color
                                : "#CBD5E1",
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  {/* Controls Row */}
                  <View style={styles.voiceControlsRow}>
                    <TouchableOpacity
                      onPress={() => handlePlayVoiceNote(note)}
                      style={[
                        styles.voicePlayBtn,
                        { backgroundColor: severityColors.color },
                      ]}
                      activeOpacity={0.85}
                    >
                      {isPlaying ? (
                        <Pause size={16} color="#FFFFFF" fill="#FFFFFF" />
                      ) : (
                        <Play
                          size={16}
                          color="#FFFFFF"
                          fill="#FFFFFF"
                          style={{ marginLeft: 2 }}
                        />
                      )}
                    </TouchableOpacity>
                    <Text style={styles.voiceStatusText}>
                      {isPlaying
                        ? `Playing audio recording... (${formatSeconds(currentRemaining)})`
                        : "Tap to listen to audio report"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Media Attachments Section */}
        {mediaList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Media Attachments</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaRowContainer}
            >
              {mediaList.map((media: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mediaCardWrapper}
                  activeOpacity={0.85}
                  onPress={() => {
                    setActiveMediaUri(media.uri);
                    setActiveMediaType(media.type || "image");
                    setViewerVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.attachmentThumbnail}
                  />
                  {media.type === "video" && (
                    <View style={styles.videoPlayOverlay}>
                      <View style={styles.miniPlayCircle}>
                        <Play
                          size={12}
                          color="#0F172A"
                          fill="#0F172A"
                          style={{ marginLeft: 2 }}
                        />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Lightbox / Media Viewer Modal */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseOverlay}
            activeOpacity={1}
            onPress={() => setViewerVisible(false)}
          />

          <View style={styles.modalContentContainer}>
            {activeMediaUri && (
              <Image
                source={{ uri: activeMediaUri }}
                style={styles.fullScreenMedia}
                contentFit="contain"
              />
            )}

            {activeMediaType === "video" && (
              <View style={styles.videoPlayerBadge}>
                <Play
                  size={20}
                  color="#FFFFFF"
                  fill="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.videoPlayerBadgeText}>
                  Simulated Video Attachment
                </Text>
              </View>
            )}
          </View>

          {/* Close Action Buttons */}
          <TouchableOpacity
            onPress={() => setViewerVisible(false)}
            style={styles.modalCloseButton}
          >
            <X size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Bottom Fixed Navigation Actions */}
      <View style={styles.bottomBarContainer}>
        {/* Dynamic primary Siren Response button or restricted status badge */}

        {incident.severity === "Critical" &&
        incident.time / 60 > 8 &&
        !isResponding ? (
          <View style={styles.restrictedRespondBadge}>
            <X size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <Text style={styles.restrictedRespondBadgeText}>
              {incident.time / 60
                ? "Too Late to Respond"
                : "Too Far Out to Respond"}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleRespondToggle}
            style={[
              styles.respondButton,
              isResponding
                ? {
                    backgroundColor: Colors.URGENCY_BACKGROUND.critical,
                    borderWidth: 1.5,
                    borderColor: Colors.URGENCY_COLORS.critical,
                  }
                : { backgroundColor: severityColors.color },
            ]}
            activeOpacity={0.85}
          >
            <Siren
              size={18}
              color={isResponding ? Colors.URGENCY_COLORS.critical : "#FFFFFF"}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.respondButtonText,
                isResponding
                  ? { color: Colors.URGENCY_COLORS.critical }
                  : { color: "#FFFFFF" },
              ]}
            >
              {isResponding
                ? "Cancel Response Assignment"
                : "Respond to Emergency"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Secondary options row */}
        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            onPress={handleCallServices}
            style={[
              styles.callButton,
              {
                backgroundColor: severityColors.bg,
                borderColor: severityColors.color,
              },
            ]}
            activeOpacity={0.85}
          >
            <Phone
              size={14}
              color={severityColors.color}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.callButtonText, { color: severityColors.color }]}
            >
              Call Services
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMessage}
            style={styles.messageButton}
            activeOpacity={0.85}
          >
            <MessageSquare
              size={14}
              color="#0F172A"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
            activeOpacity={0.85}
          >
            <RotateCw size={14} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIconButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17.5,
    fontFamily: typography.semibold,
    color: "#0F172A",
  },
  scrollContent: {
    paddingBottom: 135,
  },
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  incidentTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: typography.bold,
    color: "#0F172A",
    lineHeight: 28,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  severityText: {
    fontSize: 10.5,
    fontFamily: typography.bold,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  mapCard: {
    height: 220,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  incidentMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  incidentMarkerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  incidentMarkerArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    alignSelf: "center",
    marginTop: -1,
  },
  responderMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  responderMarkerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 2,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontFamily: typography.semibold,
    color: "#0F172A",
    marginBottom: 10,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  timelineRow: {
    flexDirection: "row",
  },
  timelineBulletContainer: {
    alignItems: "center",
    marginRight: 14,
    width: 20,
  },
  timelineBulletCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineBulletInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 4,
  },
  responderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  responderName: {
    fontSize: 14.5,
    fontFamily: typography.semibold,
    color: "#0F172A",
  },
  roleBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: "#64748B",
    textTransform: "uppercase",
  },
  statusBadgeRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  statusLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkmarkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },
  statusLabelText: {
    fontSize: 13,
    fontFamily: typography.semibold,
  },
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  descriptionCardTitle: {
    fontSize: 14.5,
    fontFamily: typography.semibold,
    color: "#0F172A",
  },
  descriptionBody: {
    fontSize: 14,
    fontFamily: typography.regular,
    color: "#475569",
    lineHeight: 22,
  },
  voiceNoteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  voiceNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  micIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceNoteTitle: {
    fontSize: 14.5,
    fontFamily: typography.semibold,
    color: "#0F172A",
  },
  voiceNoteSubtitle: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#64748B",
    marginTop: 2,
  },
  durationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationBadgeText: {
    fontSize: 12,
    fontFamily: typography.bold,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    height: 36,
    paddingHorizontal: 4,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 2,
  },
  voiceControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  voicePlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  voiceStatusText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#475569",
  },
  bottomBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    gap: 8,
  },
  respondButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    width: "100%",
  },
  respondButtonText: {
    fontSize: 14.5,
    fontFamily: typography.semibold,
  },
  bottomButtonsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  callButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    height: 42,
    borderRadius: 10,
  },
  callButtonText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
  },
  messageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    height: 42,
    borderRadius: 10,
  },
  messageButtonText: {
    color: "#0F172A",
    fontSize: 13.5,
    fontFamily: typography.semibold,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  restrictedRespondBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    height: 48,
    borderRadius: 12,
    width: "100%",
  },
  restrictedRespondBadgeText: {
    color: "#94A3B8",
    fontSize: 14.5,
    fontFamily: typography.semibold,
  },
  mediaRowContainer: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 16,
  },
  mediaCardWrapper: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachmentThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  miniPlayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContentContainer: {
    width: "100%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenMedia: {
    width: "90%",
    height: "100%",
  },
  videoPlayerBadge: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  videoPlayerBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: typography.semibold,
  },
  modalCloseButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});
