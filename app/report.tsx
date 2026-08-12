import {
  createEmergencyReport,
  EmergencyRecord,
} from "@/backend/emergencies";
import CustomButton from "@/components/CustomButton";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { emergencyAlerts } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BriefcaseMedical,
  Camera,
  Car,
  CheckCircle2,
  Flame,
  Locate,
  MapPin,
  Mic,
  Pause,
  Play,
  Shield,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

type IncidentType = "Medical" | "Fire" | "Security" | "Accident";

export default function ReportScreen() {
  const router = useRouter();

  // Submission & Modal States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedEmergency, setSubmittedEmergency] =
    useState<EmergencyRecord | null>(null);

  // State
  const [selectedType, setSelectedType] = useState<IncidentType>("Medical");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [landmark, setLandmark] = useState("");

  // Set default placeholder items matching image and video types
  const [photos, setPhotos] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);
  const [isRecording, setIsRecording] = useState(false);
  const [severity, setSeverity] = useState<"Critical" | "Moderate" | "Low">(
    "Moderate",
  );
  const voiceScale = React.useRef(new Animated.Value(1)).current;

  // Audio Recording & Playback States
  const [voiceNotes, setVoiceNotes] = useState<
    { id: string; uri: string; duration: number }[]
  >([]);
  const [recordDuration, setRecordDuration] = useState(0);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);

  const recordingRef = React.useRef<Audio.Recording | null>(null);
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const recordingIntervalRef = React.useRef<any>(null);

  // Clean up sounds and intervals on unmount
  React.useEffect(() => {
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


  // Default coordinate (KNUST Science block area, matches mock data coordinates)
  const [locationCoords, setLocationCoords] = useState({
    latitude: 6.6751,
    longitude: -1.5715,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [address, setAddress] = useState({
    line1: "123 Emergency Way",
    line2: "New York, NY 10001",
  });

  // Incident types mapping icons & colors using system theme tokens
  const incidentTypes = [
    {
      id: "Medical" as IncidentType,
      label: "Medical",
      icon: BriefcaseMedical,
      color: DESIGN_COLORS.successGreen,
      bg: ResQColors.greenBg,
    },
    {
      id: "Fire" as IncidentType,
      label: "Fire",
      icon: Flame,
      color: DESIGN_COLORS.emergencyRed,
      bg: ResQColors.primaryRedLight,
    },
    {
      id: "Security" as IncidentType,
      label: "Security",
      icon: Shield,
      color: DESIGN_COLORS.safetyBlue,
      bg: DESIGN_COLORS.tertiaryFixed,
    },
    {
      id: "Accident" as IncidentType,
      label: "Accident",
      icon: Car,
      color: ResQColors.statusAmber,
      bg: ResQColors.badgeAmberBg,
    },
  ];

  // Request location and update map
  const handleUpdateLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Permission to access location was denied. Keeping default coordinates.",
      );
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      setLocationCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      });

      // Update addresses dynamically based on GPS coordinates
      setAddress({
        line1: `GPS Coordinates (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)})`,
        line2: "KNUST Campus, Kumasi",
      });

      Alert.alert(
        "Location Updated",
        "The incident coordinates have been set to your current GPS location.",
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Could not fetch current coordinates. Defaulting to mock location.",
      );
    }
  };

  // Auto-request current GPS location on screen mount
  React.useEffect(() => {
    async function autoFetchLocation() {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let location = await Location.getCurrentPositionAsync({});
          setLocationCoords({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.004,
            longitudeDelta: 0.004,
          });
          setAddress({
            line1: `GPS (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)})`,
            line2: "KNUST Campus, Kumasi",
          });
        }
      } catch (e) {
        console.warn("Could not auto-fetch position on mount:", e);
      }
    }
    autoFetchLocation();
  }, []);

  // Select photo/video and queue locally — uploads happen on submit
  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Permission to access media library is required to add images.",
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVideo =
          asset.type === "video" ||
          asset.uri.toLowerCase().endsWith(".mp4") ||
          asset.uri.toLowerCase().endsWith(".mov");

        setPhotos((prev) => [...prev, { uri: asset.uri, type: isVideo ? "video" : "image" }]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select media.");
    }
  };

  // Remove uploaded photo
  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos(photos.filter((_, index) => index !== indexToRemove));
  };

  // Start Audio Recording on Hold Press In
  const handleVoicePressIn = async () => {
    // Expand button smoothly to 1.35x scale
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

      // Reset recording duration
      setRecordDuration(0);
      setIsRecording(true);

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;

      // Start duration clock
      recordingIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      setIsRecording(false);
      Alert.alert("Error", "Could not start audio recording.");
    }
  };

  // Stop Audio Recording on Hold Release
  const handleVoicePressOut = async () => {
    // Shrink button back to original scale
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
      recordingRef.current = null;

      if (uri) {
        // Only add if it's at least 1 second long
        if (recordDuration >= 1) {
          setVoiceNotes((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              uri: uri,
              duration: recordDuration,
            },
          ]);
        } else {
          Alert.alert(
            "Recording Too Short",
            "Hold the mic button longer to record a voice note.",
          );
        }
      }
      setRecordDuration(0);
    } catch (err) {
      console.error("Failed to stop recording", err);
      setIsRecording(false);
      setRecordDuration(0);
    }
  };

  // Handle Play/Pause of a recorded Voice Note
  const handlePlayVoiceNote = async (note: { id: string; uri: string }) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    if (playingNoteId === note.id) {
      setPlayingNoteId(null);
      return;
    }

    try {
      setPlayingNoteId(note.id);
      const { sound } = await Audio.Sound.createAsync(
        { uri: note.uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
            setPlayingNoteId(null);
          }
        },
      );
      soundRef.current = sound;
    } catch (err) {
      console.error("Failed to play audio", err);
      setPlayingNoteId(null);
    }
  };

  // Handle Deleting a recorded Voice Note
  const handleDeleteVoiceNote = (idToRemove: string) => {
    if (playingNoteId === idToRemove && soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      setPlayingNoteId(null);
    }
    setVoiceNotes(voiceNotes.filter((note) => note.id !== idToRemove));
  };

  // Submit Incident Report to Supabase
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!title.trim()) {
      Alert.alert("Validation Error", "Please provide a title for the incident report.");
      return;
    }
    if (!description.trim()) {
      Alert.alert(
        "Validation Error",
        "Please provide details in the incident description.",
      );
      return;
    }
    if (!landmark.trim()) {
      Alert.alert(
        "Validation Error",
        "Please provide the nearest landmark to help responders locate the incident.",
      );
      return;
    }
    if (
      !locationCoords ||
      typeof locationCoords.latitude !== "number" ||
      typeof locationCoords.longitude !== "number" ||
      isNaN(locationCoords.latitude) ||
      isNaN(locationCoords.longitude)
    ) {
      Alert.alert(
        "Validation Error",
        "Valid location coordinates are required. Please use the Update button to capture your GPS location.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const locationText = `${address.line1}, ${address.line2}`;
      const voiceNoteUris = voiceNotes.map((v) => v.uri);

      const { data, error } = await createEmergencyReport({
        title: title.trim(),
        description: description.trim(),
        location_text: locationText,
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
        severity,
        nearest_landmark: landmark.trim(),
        voiceNotesUris: voiceNoteUris,
        visualMediaFiles: photos,
      });

      if (error || !data) {
        Alert.alert(
          "Submission Failed",
          error?.message || "Could not record emergency report. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      // Map returned database record to local caseProp & unshift for immediate UI responsiveness
      const newIncident: any = {
        id: data.id,
        title: data.title,
        description: data.description || "",
        location: data.location_text,
        distance: 120,
        time: 0,
        responseTime: 240,
        severity: (data.severity as any) || severity,
        responders: data.responders_count || 0,
        isResolved: data.is_resolved || false,
        action: "Details" as const,
        creatorID: data.creator_id || "You",
        falseAlarm: data.false_alarm || false,
        photos: photos,
      };

      emergencyAlerts.unshift(newIncident);
      setSubmittedEmergency(data);
      setIsSubmitting(false);
      setSuccessModalVisible(true);
    } catch (err: any) {
      console.error("Failed to submit emergency report:", err);
      Alert.alert(
        "Submission Error",
        err?.message || "An unexpected error occurred during submission.",
      );
      setIsSubmitting(false);
    }
  };

  const getSeverityColors = (level: "Critical" | "Moderate" | "Low") => {
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

  const activeSeverityColors = getSeverityColors(severity);
  const themeColor = activeSeverityColors.color;
  const themeBgColor = activeSeverityColors.bg;

  const activeTypeInfo =
    incidentTypes.find((t) => t.id === selectedType) || incidentTypes[0];
  const MarkerIcon = activeTypeInfo.icon;
  const markerColor = themeColor; // map pin color matches selected severity color

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Navigation Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerIconButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={DESIGN_COLORS.slate900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Incident</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Emergency Broadcasts",
                "No active emergency alerts in your immediate radius.",
              )
            }
            style={[styles.headerIconButton, { backgroundColor: themeBgColor }]}
            activeOpacity={0.7}
          >
            <Bell size={20} color={themeColor} />
            <View
              style={[styles.notificationDot, { backgroundColor: themeColor }]}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Incident Type Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incident Type</Text>
            <View style={styles.gridContainer}>
              {incidentTypes.map((type) => {
                const isSelected = selectedType === type.id;
                const IconComponent = type.icon;
                return (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={[
                      styles.gridItem,
                      isSelected && {
                        borderColor: themeColor,
                        backgroundColor: themeBgColor,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.iconCircleContainer,
                        isSelected && {
                          backgroundColor: ResQColors.cardSurface,
                        },
                      ]}
                    >
                      <IconComponent
                        size={22}
                        color={isSelected ? themeColor : DESIGN_COLORS.slate900}
                      />
                      {type.id === "Accident" && (
                        <View
                          style={[
                            styles.accidentBadge,
                            { backgroundColor: themeColor },
                          ]}
                        >
                          <AlertTriangle
                            size={10}
                            color={ResQColors.cardSurface}
                            strokeWidth={3}
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.gridItemLabel,
                        isSelected && { color: themeColor },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Severity Level Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severity Level</Text>
            <View style={styles.severityContainer}>
              {(["Critical", "Moderate", "Low"] as const).map((level) => {
                const isSelected = severity === level;
                const colors = getSeverityColors(level);
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSeverity(level)}
                    style={[
                      styles.severityPill,
                      isSelected
                        ? {
                            backgroundColor: colors.bg,
                            borderColor: colors.color,
                            borderWidth: 1.5,
                          }
                        : {
                            borderColor: ResQColors.badgeGrayBg,
                          },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.severityDot,
                        { backgroundColor: colors.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.severityText,
                        isSelected && {
                          color: colors.color,
                          fontFamily: typography.bold,
                        },
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Location Area */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Location</Text>
              <TouchableOpacity
                onPress={handleUpdateLocation}
                style={[
                  styles.updateLocationButton,
                  { backgroundColor: themeBgColor },
                ]}
                activeOpacity={0.7}
              >
                <Locate
                  size={14}
                  color={themeColor}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[styles.updateLocationText, { color: themeColor }]}
                >
                  Update
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.mapCard, { borderColor: themeBgColor }]}>
              <View style={styles.mapContainer}>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  region={locationCoords}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker coordinate={locationCoords}>
                    <View style={styles.customMarkerContainer}>
                      <View
                        style={[
                          styles.customMarkerCircle,
                          { backgroundColor: markerColor },
                        ]}
                      >
                        <MarkerIcon
                          size={16}
                          color={ResQColors.cardSurface}
                          strokeWidth={2.5}
                        />
                      </View>
                      <View
                        style={[
                          styles.customMarkerArrow,
                          { borderTopColor: markerColor },
                        ]}
                      />
                    </View>
                  </Marker>
                </MapView>
              </View>
              <View style={styles.addressBar}>
                <View style={styles.addressIconCircle}>
                  <MapPin size={18} color={ResQColors.textSubtle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLine1} numberOfLines={1}>
                    {address.line1}
                  </Text>
                  <Text style={styles.addressLine2} numberOfLines={1}>
                    {address.line2}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Incident Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incident Title</Text>
            <View
              style={[
                styles.titleInputContainer,
                { borderColor: themeBgColor },
              ]}
            >
              <TextInput
                style={styles.titleInput}
                placeholder="Brief title (e.g. Fire in Chemistry Lab, Sprained...)"
                placeholderTextColor={ResQColors.textFaint}
                value={title}
                onChangeText={setTitle}
                maxLength={60}
              />
            </View>
          </View>

          {/* Nearest Landmark */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nearest Landmark</Text>
            <View
              style={[
                styles.titleInputContainer,
                { borderColor: themeBgColor },
              ]}
            >
              <TextInput
                style={styles.titleInput}
                placeholder="e.g. Near the Science Block gate, Opposite ATM..."
                placeholderTextColor={ResQColors.textFaint}
                value={landmark}
                onChangeText={setLandmark}
                maxLength={80}
              />
            </View>
          </View>

          {/* Incident Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incident Description</Text>
            <View
              style={[styles.inputContainer, { borderColor: themeBgColor }]}
            >
              {isRecording ? (
                <View style={styles.recordingOverlayContainer}>
                  <View
                    style={[
                      styles.recordingRedDot,
                      { backgroundColor: themeColor },
                    ]}
                  />
                  <Text style={styles.recordingTimerText}>
                    Recording voice note: 0:
                    {recordDuration < 10
                      ? `0${recordDuration}`
                      : recordDuration}
                  </Text>
                  <Text style={styles.recordingCancelHelp}>
                    Release to attach
                  </Text>
                </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  placeholder="What is happening? Please provide details to help responders..."
                  placeholderTextColor={ResQColors.textFaint}
                  multiline={true}
                  value={description}
                  onChangeText={setDescription}
                  textAlignVertical="top"
                />
              )}
              <TouchableOpacity
                onPressIn={handleVoicePressIn}
                onPressOut={handleVoicePressOut}
                style={styles.voiceButtonContainer}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.voiceButton,
                    { transform: [{ scale: voiceScale }] },
                    isRecording && {
                      backgroundColor: themeColor,
                      shadowOpacity: 0.15,
                    },
                  ]}
                >
                  <Mic
                    size={18}
                    color={
                      isRecording
                        ? ResQColors.cardSurface
                        : ResQColors.textSubtle
                    }
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recorded Voice Notes List */}
          {voiceNotes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Voice Notes ({voiceNotes.length})
              </Text>
              <View style={styles.voiceNotesListContainer}>
                {voiceNotes.map((note) => {
                  const isPlaying = playingNoteId === note.id;
                  return (
                    <View key={note.id} style={styles.voiceNoteCard}>
                      <TouchableOpacity
                        onPress={() => handlePlayVoiceNote(note)}
                        style={[
                          styles.playPauseBtn,
                          { backgroundColor: themeColor },
                        ]}
                        activeOpacity={0.8}
                      >
                        {isPlaying ? (
                          <Pause
                            size={14}
                            color={ResQColors.cardSurface}
                            fill={ResQColors.cardSurface}
                          />
                        ) : (
                          <Play
                            size={14}
                            color={ResQColors.cardSurface}
                            fill={ResQColors.cardSurface}
                            style={{ marginLeft: 2 }}
                          />
                        )}
                      </TouchableOpacity>

                      <View style={styles.voiceTrackDetails}>
                        <Text style={styles.voiceNoteTitle}>
                          Voice Note Attachment
                        </Text>
                        <Text style={styles.voiceNoteMeta}>
                          Duration: 0:
                          {note.duration < 10
                            ? `0${note.duration}`
                            : note.duration}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteVoiceNote(note.id)}
                        style={styles.deleteVoiceBtn}
                        activeOpacity={0.7}
                      >
                        <X
                          size={16}
                          color={ResQColors.primaryRedText}
                          strokeWidth={2.5}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Upload Media */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Media</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaContainer}
            >
              {/* Add Photo Button */}
              <TouchableOpacity
                style={[
                  styles.addPhotoCard,
                  { borderColor: themeColor, backgroundColor: themeBgColor },
                ]}
                onPress={handleAddPhoto}
                activeOpacity={0.7}
              >
                <View style={styles.addPhotoCircle}>
                  <Camera size={18} color={themeColor} />
                </View>
                <Text style={[styles.addPhotoText, { color: themeColor }]}>
                  Add Photo
                </Text>
              </TouchableOpacity>

              {/* Uploaded Images/Videos List (with placeholder support) */}
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.uploadedPhoto}
                  />

                  {photo.type === "video" && (
                    <View style={styles.videoOverlay}>
                      <View style={styles.playButtonCircle}>
                        <Play
                          size={12}
                          color={DESIGN_COLORS.slate900}
                          fill={DESIGN_COLORS.slate900}
                          style={{ marginLeft: 2 }}
                        />
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => handleRemovePhoto(index)}
                    style={styles.deletePhotoBadge}
                  >
                    <X
                      size={12}
                      color={ResQColors.cardSurface}
                      strokeWidth={2.5}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Bottom CTA Submit Area */}
        <View style={styles.bottomBar}>
          <CustomButton
            text={isSubmitting ? "Submitting Report..." : "Submit Report"}
            onPress={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            color={themeColor}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Success Pop-up Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSuccessModalVisible(false);
          router.back();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconCircle,
                { backgroundColor: activeSeverityColors.bg },
              ]}
            >
              <CheckCircle2 size={38} color={activeSeverityColors.color} />
            </View>

            <Text style={styles.modalTitle}>Report Submitted Successfully</Text>

            <Text style={styles.modalSubtitle}>
              Your emergency report has been recorded and dispatched to campus
              security and emergency response teams.
            </Text>

            <View style={styles.modalInfoContainer}>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Incident Title:</Text>
                <Text style={styles.modalInfoValue} numberOfLines={1}>
                  {submittedEmergency?.title || title}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Severity:</Text>
                <Text
                  style={[
                    styles.modalInfoValue,
                    {
                      color: activeSeverityColors.color,
                      fontFamily: typography.bold,
                    },
                  ]}
                >
                  {submittedEmergency?.severity || severity}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Location:</Text>
                <Text style={styles.modalInfoValue} numberOfLines={1}>
                  {submittedEmergency?.location_text ||
                    `${address.line1}, ${address.line2}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.modalDoneButton,
                { backgroundColor: activeSeverityColors.color },
              ]}
              activeOpacity={0.85}
              onPress={() => {
                setSuccessModalVisible(false);
                router.back();
              }}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: ResQColors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: ResQColors.borderSubtle,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ResQColors.cardSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: ResQColors.cardSurface,
  },
  headerTitle: {
    fontSize: 19,
    fontFamily: typography.bold,
    color: DESIGN_COLORS.slate900,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: DESIGN_COLORS.slate900,
    marginBottom: 10,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  gridItem: {
    width: "48%",
    height: 115,
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: ResQColors.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: DESIGN_COLORS.slate900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconCircleContainer: {
    position: "relative",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: DESIGN_COLORS.slate50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  accidentBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: ResQColors.statusAmber,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: ResQColors.cardSurface,
  },
  gridItemLabel: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: DESIGN_COLORS.slate900,
  },
  severityContainer: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  severityPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 21,
    backgroundColor: ResQColors.cardSurface,
    borderWidth: 1.5,
    borderColor: ResQColors.badgeGrayBg,
    ...Platform.select({
      ios: {
        shadowColor: DESIGN_COLORS.slate900,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  severityText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: ResQColors.badgeGrayText,
  },
  updateLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: ResQColors.primaryRedLight,
  },
  updateLocationText: {
    fontSize: 12.5,
    fontFamily: typography.bold,
    color: Colors.light.accent,
  },
  mapCard: {
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: ResQColors.borderSubtle,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: DESIGN_COLORS.slate900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  mapContainer: {
    width: "100%",
    height: 140,
    backgroundColor: ResQColors.cardSurfaceSoft,
  },
  addressBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: ResQColors.cardSurface,
    borderTopWidth: 1,
    borderTopColor: ResQColors.borderSubtle,
  },
  addressIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ResQColors.cardSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  addressLine1: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: DESIGN_COLORS.slate900,
  },
  addressLine2: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    marginTop: 2,
  },
  titleInputContainer: {
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: ResQColors.borderSubtle,
    paddingHorizontal: 18,
    height: 50,
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: DESIGN_COLORS.slate900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  titleInput: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: DESIGN_COLORS.slate900,
  },
  inputContainer: {
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: ResQColors.borderSubtle,
    padding: 16,
    minHeight: 130,
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: DESIGN_COLORS.slate900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.regular,
    color: DESIGN_COLORS.slate900,
  },
  voiceButtonContainer: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ResQColors.cardSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  recordingOverlayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  recordingRedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.accent,
    marginBottom: 8,
  },
  recordingTimerText: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: DESIGN_COLORS.slate900,
    marginBottom: 4,
  },
  recordingCancelHelp: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
  },
  voiceNotesListContainer: {
    gap: 8,
  },
  voiceNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ResQColors.borderSubtle,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: DESIGN_COLORS.slate900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  playPauseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  voiceTrackDetails: {
    flex: 1,
  },
  voiceNoteTitle: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: DESIGN_COLORS.slate900,
  },
  voiceNoteMeta: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    marginTop: 2,
  },
  deleteVoiceBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: ResQColors.primaryRedLight,
  },
  mediaContainer: {
    flexDirection: "row",
    gap: 12,
  },
  addPhotoCard: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: ResQColors.primaryRedBorder,
    backgroundColor: ResQColors.primaryRedLight,
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ResQColors.cardSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  addPhotoText: {
    fontSize: 11.5,
    fontFamily: typography.bold,
    color: Colors.light.accent,
  },
  photoWrapper: {
    position: "relative",
    width: 100,
    height: 100,
  },
  uploadedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: ResQColors.cardSurfaceSoft,
  },
  deletePhotoBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: ResQColors.primaryRedText,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: ResQColors.cardSurface,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  playButtonCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ResQColors.cardSurface,
    justifyContent: "center",
    alignItems: "center",
  },
  activeUploadWrapper: {
    marginTop: 16,
    width: "100%",
  },
  uploadingLabelText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: ResQColors.textSubtle,
    marginBottom: 8,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: ResQColors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: ResQColors.cardSurface,
  },
  submitButton: {
    backgroundColor: Colors.light.accent,
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  submitButtonText: {
    color: ResQColors.cardSurface,
    fontSize: 16,
    fontFamily: typography.bold,
  },
  customMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  customMarkerCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: ResQColors.cardSurface,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  customMarkerArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    alignSelf: "center",
    marginTop: -1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: DESIGN_COLORS.slate900,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13.5,
    fontFamily: typography.regular,
    color: ResQColors.textSubtle,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInfoContainer: {
    width: "100%",
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 16,
    padding: 14,
    marginBottom: 22,
    gap: 8,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalInfoLabel: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: ResQColors.textSubtle,
  },
  modalInfoValue: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: DESIGN_COLORS.slate900,
    maxWidth: "60%",
    textAlign: "right",
  },
  modalDoneButton: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDoneButtonText: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: ResQColors.cardSurface,
  },
});
