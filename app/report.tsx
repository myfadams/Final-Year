import ImageUpload from "@/components/ImageUpload";
import Colors from "@/constants/Colors";
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
  Flame,
  Locate,
  MapPin,
  Mic,
  Pause,
  Play,
  Send,
  Shield,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
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

  // State
  const [selectedType, setSelectedType] = useState<IncidentType>("Medical");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Set default placeholder items matching image and video types
  const [photos, setPhotos] = useState<
    { uri: string; type: "image" | "video" }[]
  >([
    // {
    //   uri: "https://images.unsplash.com/photo-1626908013351-800ddd734b8a?w=400&auto=format&fit=crop&q=80",
    //   type: "image",
    // },
    // {
    //   uri: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80",
    //   type: "video",
    // },
  ]);
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

  // States for the active upload progress bar component
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingUri, setUploadingUri] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<"image" | "video">(
    "image",
  );

  // Monitor when the upload simulation finishes to add it to the list
  React.useEffect(() => {
    if (!isUploading && uploadingUri) {
      setPhotos((prev) => [
        ...prev,
        { uri: uploadingUri, type: uploadingType },
      ]);
      setUploadingUri(null);
    }
  }, [isUploading, uploadingUri]);

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

  // Incident types mapping icons & colors
  const incidentTypes = [
    {
      id: "Medical" as IncidentType,
      label: "Medical",
      icon: BriefcaseMedical,
      color: "#10B981",
      bg: "#E6F4EA",
    },
    {
      id: "Fire" as IncidentType,
      label: "Fire",
      icon: Flame,
      color: "#EF4444",
      bg: "#FEE2E2",
    },
    {
      id: "Security" as IncidentType,
      label: "Security",
      icon: Shield,
      color: "#3B82F6",
      bg: "#DBEAFE",
    },
    {
      id: "Accident" as IncidentType,
      label: "Accident",
      icon: Car,
      color: "#F59E0B",
      bg: "#FEF3C7",
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

  // Upload Photo from camera roll (allowing images and videos)
  const handleAddPhoto = async () => {
    if (isUploading) {
      Alert.alert(
        "Upload in progress",
        "Please wait until the current media upload is complete.",
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Permission to access media library is required to upload images.",
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

        // Start simulated upload inside the parent screen
        setUploadingType(isVideo ? "video" : "image");
        setUploadingUri(asset.uri);
        setIsUploading(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image.");
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

  // Submit Incident Report
  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please provide a title for the incident report.");
      return;
    }
    if (!description.trim()) {
      Alert.alert(
        "Error",
        "Please provide details in the incident description.",
      );
      return;
    }

    // Create a new incident matching caseProp
    const newIncident = {
      id: (emergencyAlerts.length + 1).toString(),
      title: title.trim(),
      description: description,
      location: `${address.line1}, ${address.line2}`,
      distance: 120, // meters away
      time: 0, // 0 mins ago
      responseTime: 240, // 4 mins
      severity: severity,
      responders: 0,
      isResolved: false,
      action: "Details" as const,
      creatorID: "George",
      falseAlarm: false,
    };

    // Add to global temporary data list
    emergencyAlerts.unshift(newIncident);

    Alert.alert(
      "Report Submitted",
      "Thank you. Your incident report has been dispatched to campus security and emergency teams. You can track this in the Alerts tab.",
      [
        {
          text: "Done",
          onPress: () => {
            // Navigate back to the home screen
            router.back();
          },
        },
      ],
    );
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
          >
            <ArrowLeft size={24} color={Colors.light.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Incident</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Emergency Broadcasts",
                "No active emergency alerts in your immediate radius.",
              )
            }
            style={styles.headerIconButton}
          >
            <Bell size={24} color={Colors.light.accent} />
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
                    <View style={styles.iconContainer}>
                      <IconComponent
                        size={28}
                        color={isSelected ? themeColor : "#475569"}
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
                            color="#FFFFFF"
                            strokeWidth={3}
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.gridItemLabel,
                        isSelected && {
                          color: themeColor,
                          fontFamily: typography.bold,
                        },
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
                      isSelected && {
                        backgroundColor: colors.bg,
                        borderColor: colors.color,
                        borderWidth: 1.5,
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

            <View style={styles.mapCard}>
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
                          color="#FFFFFF"
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
                <MapPin size={18} color="#64748B" style={{ marginRight: 8 }} />
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
            <View style={styles.titleInputContainer}>
              <TextInput
                style={styles.titleInput}
                placeholder="Brief title (e.g. Fire in Chemistry Lab, Sprained Ankle...)"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
                maxLength={60}
              />
            </View>
          </View>

          {/* Incident Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incident Description</Text>
            <View style={styles.inputContainer}>
              {isRecording ? (
                <View style={styles.recordingOverlayContainer}>
                  <View style={styles.recordingRedDot} />
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
                  placeholderTextColor="#94A3B8"
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
                      backgroundColor: Colors.light.accent,
                      shadowOpacity: 0.15,
                    },
                  ]}
                >
                  <Mic size={18} color={isRecording ? "#FFFFFF" : "#64748B"} />
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
                          <Pause size={14} color="#FFFFFF" fill="#FFFFFF" />
                        ) : (
                          <Play
                            size={14}
                            color="#FFFFFF"
                            fill="#FFFFFF"
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
                        <X size={16} color="#E53E3E" strokeWidth={2.5} />
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
                <Camera
                  size={22}
                  color={themeColor}
                  style={{ marginBottom: 6 }}
                />
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
                          color="#0F172A"
                          fill="#0F172A"
                          style={{ marginLeft: 2 }}
                        />
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => handleRemovePhoto(index)}
                    style={styles.deletePhotoBadge}
                  >
                    <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {/* Display simulating upload bar for the active upload */}
            {uploadingUri && (
              <View style={styles.activeUploadWrapper}>
                <Text style={styles.uploadingLabelText}>
                  Uploading media assets...
                </Text>
                <ImageUpload imageUri={uploadingUri} setDone={setIsUploading} />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom CTA Submit Area */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: themeColor },
              isUploading && { backgroundColor: "#CBD5E1", shadowOpacity: 0 },
            ]}
            onPress={handleSubmit}
            disabled={isUploading}
            activeOpacity={0.85}
          >
            <Send
              size={16}
              color={isUploading ? "#64748B" : "#FFFFFF"}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.submitButtonText,
                isUploading && { color: "#64748B" },
              ]}
            >
              {isUploading ? "Uploading Attachments..." : "Submit Report"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    fontSize: 20,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontFamily: typography.bold,
    color: "#0F172A",
    marginBottom: 8,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  gridItem: {
    width: "48%",
    height: 86,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconContainer: {
    position: "relative",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  accidentBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#F59E0B",
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  gridItemLabel: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: "#475569",
    marginTop: 2,
  },
  updateLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#FFF5F5",
  },
  updateLocationText: {
    fontSize: 12.5,
    fontFamily: typography.bold,
    color: Colors.light.accent,
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
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
  mapContainer: {
    width: "100%",
    height: 140,
    backgroundColor: "#F1F5F9",
  },
  addressBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  addressLine1: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: "#0F172A",
  },
  addressLine2: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#64748B",
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    height: 120,
    position: "relative",
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
  textInput: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: typography.regular,
    color: "#0F172A",
  },
  voiceButtonContainer: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  mediaContainer: {
    flexDirection: "row",
    gap: 12,
  },
  addPhotoCard: {
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#FFB3AC",
    backgroundColor: "#FFF8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoText: {
    fontSize: 11.5,
    fontFamily: typography.semibold,
    color: Colors.light.accent,
  },
  photoWrapper: {
    position: "relative",
    width: 90,
    height: 90,
  },
  uploadedPhoto: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  deletePhotoBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#E53E3E",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
  playButtonCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  activeUploadWrapper: {
    marginTop: 16,
    width: "100%",
  },
  uploadingLabelText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: "#64748B",
    marginBottom: 8,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: Colors.light.accent,
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  submitButtonText: {
    color: "#FFFFFF",
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
    borderColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    marginTop: -1, // overlap slightly to join cleanly
  },
  severityContainer: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  severityPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
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
    color: "#475569",
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
    color: "#0F172A",
    marginBottom: 4,
  },
  recordingCancelHelp: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: "#64748B",
  },
  voiceNotesListContainer: {
    gap: 8,
  },
  voiceNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
    color: "#0F172A",
  },
  voiceNoteMeta: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: "#64748B",
    marginTop: 2,
  },
  deleteVoiceBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFF5F5",
  },
  titleInputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
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
  titleInput: {
    fontSize: 14.5,
    fontFamily: typography.semibold,
    color: "#0F172A",
  },
});
