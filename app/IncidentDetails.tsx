import NavHeader from "@/components/NavHeader";
import Colors from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { emergencyAlerts, PEOPLE } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  BriefcaseMedical,
  Car,
  Check,
  Clock,
  Flame,
  Footprints,
  HeartPulse,
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
  User,
  X,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Default demo audio clip used whenever a voice note doesn't have a real, playable URI.
const FALLBACK_VOICE_NOTE_URI =
  "https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3";

export default function IncidentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();

  // Transport mode selection state
  const [travelMode, setTravelMode] = useState<"driving" | "running" | "walking">(
    params.travelMode || "running"
  );

  // User current GPS coordinates for dynamic ETA calculation
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Resolve incident details from navigation params or fallback to mock tempData emergencyAlerts
  const resolvedFromParams = Boolean(params.title && params.location);

  const incident = useMemo(() => {
    if (resolvedFromParams) {
      return {
        id: (params.id || params.personId || "1").toString(),
        title: params.title as string,
        description: (params.description as string) || "",
        location: (params.location as string) || "Campus location",
        severity: (params.severity as string) || "Moderate",
        isResolved: params.isResolved === "true",
        created_at: params.createdAt || null,
        photos: params.photos ? JSON.parse(params.photos as string) : null,
      };
    }
    const matched = emergencyAlerts.find(
      (item) => item.id === (params.id || params.personId)
    ) || emergencyAlerts[0];

    return {
      id: matched.id.toString(),
      title: matched.title,
      description: matched.description,
      location: matched.location,
      severity: matched.severity,
      isResolved: matched.isResolved,
      created_at: null,
      photos: null,
    };
  }, [params, resolvedFromParams]);

  // Lookup reporter / target person profile from PEOPLE mock dataset or params
  const person = useMemo(() => {
    return PEOPLE.find((p) => p.id === incident.id) || PEOPLE[0];
  }, [incident.id]);

  const creatorProfile = useMemo(() => {
    return {
      name: params.creatorName || person?.name || "Resident",
      role: params.creatorRole || "RESIDENT",
      phone: params.creatorPhone || "+233 55 123 4567",
      profile_image_url: params.creatorImage || person?.images?.[0] || null,
      known_health_problems: person?.knownHealthProblems || ["No chronic conditions listed"],
    };
  }, [params, person]);

  // Incident coordinates
  const latitude = typeof params.lat === "string" || typeof params.lat === "number"
    ? parseFloat(params.lat as string)
    : (person ? person.latitude : 6.675155);

  const longitude = typeof params.lng === "string" || typeof params.lng === "number"
    ? parseFloat(params.lng as string)
    : (person ? person.longitude : -1.571569);

  // Load device position for dynamic ETA calculation
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (_) {}
    })();
  }, []);

  // Map reference to center & animate camera to incident location
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500
      );
    }
  }, [latitude, longitude]);

  // Severity color tokens
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
  const severityColors = getSeverityColors(incident.severity);

  // Fullscreen image/video lightbox state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeMediaUri, setActiveMediaUri] = useState<string | null>(null);
  const [activeMediaType, setActiveMediaType] = useState<"image" | "video">("image");

  // Response assignment state
  const [isResponding, setIsResponding] = useState(
    globalState.activeEmergencyId === incident.id
  );

  useFocusEffect(
    useCallback(() => {
      setIsResponding(globalState.activeEmergencyId === incident.id);
    }, [incident.id])
  );

  // Calculate distance & travel ETA dynamically
  const calculatedEta = useMemo(() => {
    if (!userCoords) {
      const defaultMins = travelMode === "driving" ? 2 : travelMode === "running" ? 4 : 8;
      return { distanceText: "Near location", durationText: `${defaultMins} mins`, totalSeconds: defaultMins * 60 };
    }

    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(latitude - userCoords.latitude);
    const dLon = toRad(longitude - userCoords.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(userCoords.latitude)) * Math.cos(toRad(latitude)) * Math.sin(dLon / 2) ** 2;
    const distanceMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

    let speed = 4.5; // running ~16 km/h
    if (travelMode === "driving") speed = 12.0; // driving ~43 km/h
    else if (travelMode === "walking") speed = 1.4; // walking ~5 km/h

    const seconds = Math.max(30, Math.round(distanceMeters / speed));
    const mins = Math.max(1, Math.ceil(seconds / 60));

    const distanceText = distanceMeters < 1000 ? `${distanceMeters}m` : `${(distanceMeters / 1000).toFixed(1)}km`;
    return { distanceText, durationText: `${mins} min${mins > 1 ? "s" : ""}`, totalSeconds: seconds };
  }, [userCoords, latitude, longitude, travelMode]);

  const handleRespondToggle = () => {
    if (!isResponding && incident.severity === "Critical" && calculatedEta.totalSeconds / 60 > 8) {
      Alert.alert(
        "Too Far Out to Respond",
        "For critical emergencies, your estimated travel time (ETA) must be 8 minutes or less to respond."
      );
      return;
    }

    if (isResponding) {
      Alert.alert(
        "Cancel Response?",
        "Are you sure you want to cancel your response attempt?",
        [
          { text: "No, Stay Responding", style: "cancel" },
          {
            text: "Yes, Cancel Response",
            style: "destructive",
            onPress: () => {
              globalState.activeEmergencyId = null;
              globalState.activeEmergencyPerson = null;
              setIsResponding(false);
              Alert.alert(
                "Response Cancelled",
                "Your response assignment has been cancelled."
              );
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Respond to this emergency?",
        `You are approximately ${calculatedEta.durationText} away (${calculatedEta.distanceText}).`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm Response",
            onPress: () => {
              globalState.activeEmergencyId = incident.id;
              setIsResponding(true);

              Alert.alert(
                "Response Recorded",
                `You are now responding. Estimated ETA: ${calculatedEta.durationText}.`,
                [
                  {
                    text: "View Navigation Map",
                    onPress: () => {
                      router.push({
                        pathname: "/(resident)/map",
                        params: { personId: incident.id, action: "respond" },
                      });
                    },
                  },
                  { text: "OK", style: "cancel" },
                ]
              );
            },
          },
        ]
      );
    }
  };

  // Retrieve attached visual media from incident or params
  const mediaList: { uri: string; type: "image" | "video" }[] = useMemo(() => {
    if (incident.photos && Array.isArray(incident.photos)) {
      return incident.photos;
    }
    if (person && person.images && person.images.length > 0) {
      return person.images.map((url) => ({
        uri: url,
        type: "image" as const,
      }));
    }
    if (params.photos) {
      try {
        const parsed = JSON.parse(params.photos as string);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.log("Failed to parse photos param:", e);
      }
    }
    return [
      {
        uri: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80",
        type: "image" as const,
      },
    ];
  }, [incident.photos, person, params.photos]);

  // Retrieve attached voice notes
  const voiceNotesList: { id: string; uri: string; duration: number }[] = useMemo(() => {
    if (params.voiceNotes) {
      try {
        const parsed = JSON.parse(params.voiceNotes as string);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.log("Failed to parse voiceNotes param:", e);
      }
    }
    return [
      {
        id: "vn_1",
        uri: FALLBACK_VOICE_NOTE_URI,
        duration: 5,
      },
    ];
  }, [params.voiceNotes]);

  // Audio Playback state
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [pausedNoteId, setPausedNoteId] = useState<string | null>(null);
  const [noteDurations, setNoteDurations] = useState<Record<string, number>>({});
  const [playbackRemaining, setPlaybackRemaining] = useState<Record<string, number>>({});
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);

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

  useEffect(() => {
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

  useEffect(() => {
    let cancelled = false;

    const loadDurations = async () => {
      for (const note of voiceNotesList) {
        if (cancelled) return;
        try {
          const { sound, status } = await Audio.Sound.createAsync(
            { uri: resolveVoiceNoteUri(note.uri) },
            { shouldPlay: false }
          );
          if (status.isLoaded && status.durationMillis && !cancelled) {
            const exactSeconds = Math.max(
              1,
              Math.round(status.durationMillis / 1000)
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

  useFocusEffect(
    useCallback(() => {
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
    }, [])
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

    await stopActivePlayback();

    try {
      const knownDuration = noteDurations[note.id] || note.duration || 5;
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
        }
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
            Math.ceil((durationMs - positionMs) / 1000)
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

  // Nearby responders dummy dataset
  const respondersData = useMemo(() => {
    const data: Array<{
      id: string;
      name: string;
      role: string;
      status: string;
      statusColor: string;
      icon: any;
      lat: number;
      lng: number;
      color: string;
      statusText: string;
      timeText: string;
      mode: "driving" | "running" | "walking";
    }> = [
      {
        id: "resp_1",
        name: "Dr. Kwabena Frimpong",
        role: "EMT",
        status: "On-site",
        statusColor: "#2E7D32",
        icon: BriefcaseMedical,
        lat: latitude + 0.0003,
        lng: longitude + 0.0004,
        color: "#2E7D32",
        statusText: "On-site",
        timeText: "Arrived",
        mode: "driving",
      },
      {
        id: "resp_2",
        name: "Officer Samuel Mensah",
        role: "Security",
        status: "2 mins away",
        statusColor: "#F57C00",
        icon: Shield,
        lat: latitude - 0.0008,
        lng: longitude + 0.0007,
        color: "#F57C00",
        statusText: "ETA: 2 mins (250m)",
        timeText: "2 mins away",
        mode: "running",
      },
      {
        id: "resp_3",
        name: "Ambulance Unit 4",
        role: "PARAMEDIC",
        status: "En route",
        statusColor: "#1976D2",
        icon: Car,
        lat: latitude + 0.0016,
        lng: longitude - 0.0014,
        color: "#1976D2",
        statusText: "ETA: 4 mins (1.2km)",
        timeText: "En route",
        mode: "driving",
      },
    ];
    return data;
  }, [latitude, longitude]);

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
      ]
    );
  };

  const handleMessage = () => {
    router.push({
      pathname: "/emergencyChat",
      params: {
        incidentId: incident.id,
        title: incident.title,
        severity: incident.severity,
        location: incident.location,
      },
    });
  };

  const handleRefresh = () => {
    Alert.alert(
      "Status Refreshed",
      "Responders status and GPS coordinates updated."
    );
  };

  // Contextual active alert icon
  const getAlertIcon = () => {
    const titleLower = incident.title.toLowerCase();
    if (
      titleLower.includes("breathing") ||
      titleLower.includes("injury") ||
      titleLower.includes("medical") ||
      titleLower.includes("allergic")
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
      {/* Header */}
      <NavHeader title="Incident Details" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Incident Summary Header Card */}
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
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            region={{
              latitude,
              longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            {/* Pulsating alert radius circle */}
            <Circle
              center={{ latitude, longitude }}
              radius={130}
              fillColor="rgba(211, 47, 47, 0.09)"
              strokeColor="rgba(211, 47, 47, 0.25)"
              strokeWidth={1.5}
            />

            {/* Incident Pin Marker */}
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

            {/* Responder Markers */}
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

        {/* Transport Mode & Dynamic ETA Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transport Mode & ETA</Text>
          <View style={styles.transportCard}>
            <View style={styles.etaHeaderRow}>
              <View style={styles.etaBadge}>
                <Clock size={15} color={severityColors.color} style={{ marginRight: 5 }} />
                <Text style={[styles.etaBadgeText, { color: severityColors.color }]}>
                  ETA: {calculatedEta.durationText}
                </Text>
              </View>
              <View style={styles.distanceBadge}>
                <MapPin size={14} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.distanceBadgeText}>{calculatedEta.distanceText} away</Text>
              </View>
            </View>

            <View style={styles.transportButtonsRow}>
              {(["driving", "running", "walking"] as const).map((mode) => {
                const isActive = travelMode === mode;
                const renderIcon = () => {
                  const size = 16;
                  const color = isActive ? "#FFFFFF" : "#475569";
                  if (mode === "driving") return <Car size={size} color={color} />;
                  if (mode === "running") return <Zap size={size} color={color} />;
                  return <Footprints size={size} color={color} />;
                };

                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.transportBtn, isActive && styles.transportBtnActive]}
                    onPress={() => setTravelMode(mode)}
                    activeOpacity={0.85}
                  >
                    {renderIcon()}
                    <Text style={[styles.transportBtnText, isActive && styles.transportBtnTextActive]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Reporter Profile & Medical Conditions Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reporter Profile & Health Info</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.profileAvatarCircle}>
                {creatorProfile?.profile_image_url ? (
                  <Image source={{ uri: creatorProfile.profile_image_url }} style={styles.profileAvatarImage} />
                ) : (
                  <User size={20} color="#AF101A" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileNameText}>
                  {creatorProfile.name}
                </Text>
                <Text style={styles.profileRoleText}>
                  {creatorProfile.role.toUpperCase()}
                </Text>
              </View>
              {creatorProfile.phone && (
                <TouchableOpacity
                  style={styles.profileCallButton}
                  onPress={() => Alert.alert("Call Reporter", `Calling ${creatorProfile.phone}...`)}
                  activeOpacity={0.85}
                >
                  <Phone size={14} color="#AF101A" />
                </TouchableOpacity>
              )}
            </View>

            {/* Known Health Conditions */}
            <View style={styles.healthInfoContainer}>
              <View style={styles.healthInfoHeader}>
                <HeartPulse size={15} color="#AF101A" style={{ marginRight: 6 }} />
                <Text style={styles.healthInfoTitle}>Known Health Conditions</Text>
              </View>
              <View style={styles.healthTagsRow}>
                {creatorProfile.known_health_problems.map((condition, idx) => (
                  <View key={idx} style={styles.healthTagPill}>
                    <Text style={styles.healthTagText}>{condition}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Responder Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Responders ({respondersData.length})
          </Text>
          <View style={styles.timelineCard}>
            {respondersData.map((r, index) => {
              const isLast = index === respondersData.length - 1;
              const color = r.color;

              const renderTransportIcon = () => {
                const iconSize = 13;
                const iconColor = "#475569";
                if (r.mode === "driving") return <Car size={iconSize} color={iconColor} />;
                if (r.mode === "walking" || r.mode === "running") return <Footprints size={iconSize} color={iconColor} />;
                return <Zap size={iconSize} color={iconColor} />;
              };

              return (
                <View key={r.id} style={styles.timelineRow}>
                  <View style={styles.timelineBulletContainer}>
                    <View style={[styles.timelineBulletCircle, { borderColor: color }]}>
                      <View style={[styles.timelineBulletInner, { backgroundColor: color }]} />
                    </View>
                    {!isLast && <View style={styles.timelineConnector} />}
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.responderNameRow}>
                      <Text style={styles.responderName}>{r.name}</Text>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{r.role}</Text>
                      </View>
                    </View>

                    <View style={styles.statusBadgeRow}>
                      <View style={styles.statusLabelContainer}>
                        <Check size={12} color={color} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusLabelText, { color }]}>
                          {r.statusText}
                        </Text>
                      </View>
                      <View style={styles.transportModeTag}>
                        {renderTransportIcon()}
                        <Text style={styles.transportModeTagText}>
                          {r.mode.charAt(0).toUpperCase() + r.mode.slice(1)}
                        </Text>
                      </View>
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
              const totalSec = noteDurations[note.id] || note.duration || 5;
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

                  {/* Waveform Bar */}
                  <View style={styles.waveformContainer}>
                    {waveformBars.map((h, i) => {
                      const totalBars = waveformBars.length;
                      const activeBarCount = Math.floor(
                        currentProgress * totalBars
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

          {/* Close Action Button */}
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
        {incident.severity === "Critical" &&
        calculatedEta.totalSeconds / 60 > 8 &&
        !isResponding ? (
          <View style={styles.restrictedRespondBadge}>
            <X size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <Text style={styles.restrictedRespondBadgeText}>
              Too Far Out to Respond (ETA &gt; 8 mins)
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

        {/* Secondary buttons row */}
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
  transportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  etaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  etaBadgeText: {
    fontSize: 14,
    fontFamily: typography.bold,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceBadgeText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: "#64748B",
  },
  transportButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  transportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  transportBtnActive: {
    backgroundColor: "#AF101A",
    borderColor: "#AF101A",
  },
  transportBtnText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: "#475569",
  },
  transportBtnTextActive: {
    color: "#FFFFFF",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  profileNameText: {
    fontSize: 15.5,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  profileRoleText: {
    fontSize: 11,
    fontFamily: typography.bold,
    color: "#64748B",
    marginTop: 1,
  },
  profileCallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  healthInfoContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  healthInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  healthInfoTitle: {
    fontSize: 12.5,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  healthTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  healthTagPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthTagText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#B91C1C",
  },
  transportModeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 6,
  },
  transportModeTagText: {
    fontSize: 11.5,
    fontFamily: typography.semibold,
    color: "#475569",
  },
});
