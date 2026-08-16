// import EmergencyActionCard from "@/components/EmergencyActionCard";
// import PrimaryModuleCard from "@/components/PrimaryModuleCard";
import { getCachedUserProfile, getCurrentUser, getUserProfile, UserProfile } from "@/backend/auth";
import { getTrustedContacts, TrustedContactRecord } from "@/backend/contacts";
import { FriendContact, getFriends } from "@/backend/friends";
import { getMedicalInfo, MedicalRecord } from "@/backend/medical";
import {
  cancelSosAlert,
  createSosAlert,
  fetchActiveSosForUser,
  parseGeoPoint,
  SosAlert,
  SosResponder,
  subscribeToSosResponders,
  updateSosLocation
} from "@/backend/sos";
import AnotherNavBarHeader from "@/components/AnotherNavBarHeader";
import EmergencyActionCard from "@/components/EmergecnyActionCard";
import HeartBeatWave from "@/components/HeartBeatWave";
import MedicalInfoModal from "@/components/MedicalInfoModal";
import PrimaryModuleCard from "@/components/PrimaryModuleCard";
import ProfileComponent from "@/components/ProfileComponent";
import PulsatingButton from "@/components/PulsatingButton";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { ContactsProp } from "@/constants/interfaces";
import { DEFAULT_CONTACTS } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseMedical,
  Check,
  CheckCircle2,
  Footprints,
  MapPin,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Image,
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

const AVATAR_COLORS = [
  "#FEE2E2",
  "#DBEAFE",
  "#D1FAE5",
  "#FEF3C7",
  "#EDE9FE",
  "#FCE7F3",
  "#CCFBF1",
];

function getAvatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0];
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const Home = () => {
  const router = useRouter();
  const [appContacts, setAppContacts] =
    useState<ContactsProp[]>(DEFAULT_CONTACTS);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    globalState.userProfile
  );

  useEffect(() => {
    async function fetchUserProfileOnHome() {
      try {
        const cached = await getCachedUserProfile();
        if (cached) {
          setUserProfile(cached);
        }

        const { user } = await getCurrentUser();
        if (user) {
          const { profile } = await getUserProfile(user.id);
          if (profile) {
            globalState.userProfile = profile;
            setUserProfile(profile);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user profile in Home:", err);
      }
    }
    fetchUserProfileOnHome();
  }, []);

  // Modal Visibility & Medical ID States
  const [medicalIdVisible, setMedicalIdVisible] = useState(false);
  const [medicalInfo, setMedicalInfo] = useState<MedicalRecord | null>(null);
  const [medicalContacts, setMedicalContacts] = useState<TrustedContactRecord[]>([]);
  const [isLoadingMedicalId, setIsLoadingMedicalId] = useState(false);

  const [checkInVisible, setCheckInVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [locationSharedVisible, setLocationSharedVisible] = useState(false);
  const [addResponderVisible, setAddResponderVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);

  const fetchMedicalIdData = useCallback(async () => {
    if (!userProfile?.id) return;
    setIsLoadingMedicalId(true);
    try {
      const [medRes, contactsRes] = await Promise.all([
        getMedicalInfo(userProfile.id),
        getTrustedContacts(userProfile.id),
      ]);
      if (medRes.data) setMedicalInfo(medRes.data);
      if (contactsRes.data) setMedicalContacts(contactsRes.data);
    } catch (err) {
      console.error("Error fetching medical ID data:", err);
    } finally {
      setIsLoadingMedicalId(false);
    }
  }, [userProfile?.id]);

  // Trusted Network Fetched Data States
  const [trustedFriends, setTrustedFriends] = useState<FriendContact[]>([]);
  const [isLoadingTrusted, setIsLoadingTrusted] = useState<boolean>(true);

  const fetchTrustedNetwork = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingTrusted(true);
    const { data, error } = await getFriends();
    setIsLoadingTrusted(false);
    if (error) {
      console.warn("Error fetching trusted network on Home:", error);
    } else {
      const active = data.filter((f) => f.is_in_trusted_network);
      setTrustedFriends(active);
    }
  }, []);

  useEffect(() => {
    fetchTrustedNetwork(true);
  }, [fetchTrustedNetwork]);

  useFocusEffect(
    useCallback(() => {
      fetchTrustedNetwork(false);
    }, [fetchTrustedNetwork])
  );

  // Active SOS Feature States
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [alertActive, setAlertActive] = useState(false);
  const [activeSos, setActiveSos] = useState<SosAlert | null>(null);
  const [sosResponders, setSosResponders] = useState<SosResponder[]>([]);
  const [isLocationPaused, setIsLocationPaused] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sosBroadcastState, setSosBroadcastState] = useState<
    "locating" | "uploading" | "broadcasting" | "failed"
  >("locating");
  const [sosBroadcastError, setSosBroadcastError] = useState<string | null>(null);

  const countdownInterval = useRef<any>(null);
  const activeLocationWatcher = useRef<Location.LocationSubscription | null>(null);
  const heartbeatRef = useRef<any>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const lastWriteAtRef = useRef<number>(0);

  const MOVEMENT_DISTANCE_M = 12;
  const MIN_WRITE_INTERVAL_MS = 5000;
  const HEARTBEAT_MS = 25000;

  const maybeSendUpdate = useCallback(async (loc: Location.LocationObject) => {
    if (!activeSos?.id) return;
    const now = Date.now();
    lastLocationRef.current = loc;
    
    // Immediate local state update for dynamic UI coordinates display
    setCurrentCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

    if (now - lastWriteAtRef.current < MIN_WRITE_INTERVAL_MS) return;
    lastWriteAtRef.current = now;

    await updateSosLocation(
      activeSos.id,
      loc.coords.latitude,
      loc.coords.longitude,
      new Date(now).toISOString()
    );
  }, [activeSos?.id]);

  // Check if current user already has an active SOS created
  useEffect(() => {
    async function checkExistingSos() {
      const { data } = await fetchActiveSosForUser();
      if (data) {
        setActiveSos(data);
        setAlertActive(true);
        setSosBroadcastState("broadcasting");
        const parsed = parseGeoPoint(data.location);
        if (parsed) {
          setCurrentCoords({ lat: parsed.latitude, lng: parsed.longitude });
        }
      }
    }
    checkExistingSos();
  }, []);

  // Handle active SOS responder subscription & foreground location updates
  useEffect(() => {
    const stopWatcherAndHeartbeat = () => {
      if (activeLocationWatcher.current) {
        console.log("[SOS] Removing active location watcher subscription");
        activeLocationWatcher.current.remove();
        activeLocationWatcher.current = null;
      }
      if (heartbeatRef.current) {
        console.log("[SOS] Removing active heartbeat timer");
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    if (!alertActive || !activeSos) {
      stopWatcherAndHeartbeat();
      return;
    }

    // Subscribe to real-time responder updates
    const unsubscribeResponders = subscribeToSosResponders(
      activeSos.id,
      (responders) => {
        setSosResponders(responders);
      }
    );

    let isSubscribed = true;

    const startWatcher = async () => {
      stopWatcherAndHeartbeat(); // Strictly ensure no duplicate watcher exists
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        console.log("[SOS] Starting single location watcher for session:", activeSos.id);
        activeLocationWatcher.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: MOVEMENT_DISTANCE_M,
            timeInterval: MIN_WRITE_INTERVAL_MS,
          },
          (loc) => {
            if (!isSubscribed) return;
            maybeSendUpdate(loc);
          }
        );

        // independent heartbeat: re-sends the last known fix on a fixed
        // clock. maybeSendUpdate's own floor means this is a no-op whenever
        // a movement update already fired recently, so there's no risk of
        // double-writing near the boundary.
        heartbeatRef.current = setInterval(() => {
          if (lastLocationRef.current && isSubscribed) {
            maybeSendUpdate(lastLocationRef.current);
          }
        }, HEARTBEAT_MS);

      } catch (err) {
        console.warn("[SOS] Location watcher error:", err);
      }
    };

    if (AppState.currentState === "active") {
      setIsLocationPaused(false);
      startWatcher();
    } else {
      setIsLocationPaused(true);
    }

    const appStateSub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          setIsLocationPaused(false);
          startWatcher();
        } else {
          setIsLocationPaused(true);
          stopWatcherAndHeartbeat();
        }
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribeResponders();
      appStateSub.remove();
      stopWatcherAndHeartbeat();
    };
  }, [alertActive, activeSos, maybeSendUpdate]);

  // Non-blocking SOS creation with BestForNavigation + 7s timeout guard + background upload
  const triggerSosAlertCreation = async () => {
    try {
      setSosBroadcastState("locating");
      setSosBroadcastError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setSosBroadcastState("failed");
        setSosBroadcastError("Location permission required to broadcast SOS alert.");
        return;
      }

      // 1. Race BestForNavigation against a 7-second timeout
      const bestFixPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 7000)
      );

      let lat: number | null = null;
      let lng: number | null = null;
      let usedFallback = false;

      const fix = await Promise.race([bestFixPromise, timeoutPromise]);
      if (fix && fix.coords) {
        lat = fix.coords.latitude;
        lng = fix.coords.longitude;
      } else {
        usedFallback = true;
        // Fast fallback to last known or balanced
        const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
        if (lastKnown && lastKnown.coords) {
          lat = lastKnown.coords.latitude;
          lng = lastKnown.coords.longitude;
        } else {
          const quickFix = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null);
          if (quickFix && quickFix.coords) {
            lat = quickFix.coords.latitude;
            lng = quickFix.coords.longitude;
          }
        }
      }

      if (lat === null || lng === null) {
        setSosBroadcastState("failed");
        setSosBroadcastError("Unable to acquire device GPS coordinates. Please ensure location is enabled.");
        return;
      }

      setCurrentCoords({ lat, lng });
      setSosBroadcastState("uploading");

      // Non-blocking upload to Supabase
      const { data, error } = await createSosAlert(lat, lng);
      if (error || !data) {
        setSosBroadcastState("failed");
        setSosBroadcastError(error || "Failed to broadcast SOS alert.");
        return;
      }

      setActiveSos(data);
      setSosBroadcastState("broadcasting");

      // If initial alert used fallback, update with BestForNavigation once resolved
      if (usedFallback) {
        bestFixPromise
          .then(async (accurateFix) => {
            if (accurateFix?.coords && data.id) {
              const accLat = accurateFix.coords.latitude;
              const accLng = accurateFix.coords.longitude;
              setCurrentCoords({ lat: accLat, lng: accLng });
              await updateSosLocation(data.id, accLat, accLng);
            }
          })
          .catch(() => { });
      }
    } catch (err: any) {
      console.error("Failed to trigger SOS alert creation:", err);
      setSosBroadcastState("failed");
      setSosBroadcastError(err?.message || "An error occurred broadcasting SOS.");
    }
  };

  // SOS Countdown Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // SOS button handlers
  const handleSOSPressIn = () => {
    setIsCountingDown(true);
    setCountdown(2);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();

    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current);
          setIsCountingDown(false);
          // Show SOS active overlay synchronously BEFORE location fetch / insert starts!
          setAlertActive(true);
          setSosBroadcastState("locating");
          setSosBroadcastError(null);
          // Run location fetch and insert in parallel behind the rendered overlay
          triggerSosAlertCreation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSOSPressOut = () => {
    if (isCountingDown) {
      clearInterval(countdownInterval.current);
      setIsCountingDown(false);
      setCountdown(2);
      scaleAnim.setValue(1);
    }
  };

  // Biometric-gated cancellation
  const stopSOSBroadcast = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      let authenticated = false;
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to cancel SOS emergency alert",
          fallbackLabel: "Use Passcode",
          cancelLabel: "Cancel",
        });
        authenticated = result.success;
      } else {
        authenticated = true;
      }

      if (authenticated) {
        if (activeSos) {
          await cancelSosAlert(activeSos.id, "Cancelled by user verification");
        }
        setAlertActive(false);
        setActiveSos(null);
        setSosResponders([]);
        scaleAnim.setValue(1);
        setSosBroadcastState("locating");
        setSosBroadcastError(null);
      } else {
        Alert.alert(
          "Authentication Required",
          "Biometric verification or passcode is required to stop an active emergency broadcast."
        );
      }
    } catch (err) {
      console.error("Biometric cancellation error:", err);
    }
  };

  // Derived Trusted Network contacts
  const trustedNetworkContacts = appContacts.filter((c) => c.isTrustedNetwork);

  // Filter connected app contacts by search query for the Add Modal
  const filteredAppContacts = appContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      c.relationship.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(contactSearchQuery)),
  );

  const handleAddToTrustedNetwork = (id: string | number) => {
    setAppContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isTrustedNetwork: true } : c)),
    );
    const target = DEFAULT_CONTACTS.find((c) => c.id === id);
    if (target) target.isTrustedNetwork = true;
  };

  const handleRemoveFromTrustedNetwork = (id: string | number) => {
    setAppContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isTrustedNetwork: false } : c)),
    );
    const target = DEFAULT_CONTACTS.find((c) => c.id === id);
    if (target) target.isTrustedNetwork = false;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* <HomeTabBar pageTitle="ResQ." /> */}
      <AnotherNavBarHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/*  Greeting Header */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTitle}>
            Hi{" "}
            {userProfile?.name?.split(" ")[0] ||
              globalState.userProfile?.name?.split(" ")[0] ||
              "Resident"}
            !
          </Text>
          <Text style={styles.greetingSubtitle}>
            You are protected. Your campus circle is active.
          </Text>
          {/* <CustomButton text="Call 911" isLoading={true} /> */}
        </View>

        {/* Trusted Network Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.networkHeaderRow}>
            <Text style={styles.sectionTitle}>Trusted Network</Text>
            <TouchableOpacity onPress={() => router.push("/safetyCirclesPage")}>
              <Text style={styles.manageLink}>Manage</Text>
            </TouchableOpacity>
          </View>

          {isLoadingTrusted ? (
            <View style={styles.trustedLoadingContainer}>
              <HeartBeatWave
                width={140}
                color={ResQColors.primaryRed}
                thickness={4}
              />
              <Text style={styles.trustedLoadingText}>Loading network...</Text>
            </View>
          ) : trustedFriends.length > 0 ? (
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.contactsScroll}
            >
              {trustedFriends.map((contact) => (
                <ProfileComponent
                  userInfo={{
                    name: contact.name,
                    emergencyContact: true,
                    profileColor: getAvatarColor(contact.name),
                    avatarUrl: contact.profile_img_url ?? undefined,
                    statusColor: ResQColors.statusGreen,
                  }}
                  borderR={true}
                  size={64}
                  key={contact.friendshipId}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.trustedEmptyContainer}>
              <Users size={28} color="#94A3B8" />
              <Text style={styles.trustedEmptyTitle}>No Trusted Contacts</Text>
              <Text style={styles.trustedEmptySubtext}>
                Add connected friends to your trusted safety circle so they get notified during emergencies.
              </Text>
            </View>
          )}
        </View>

        {/* SOS BUTTON PANEL */}
        <View style={styles.sosCard}>
          <PulsatingButton
            onPressIn={handleSOSPressIn}
            onPressOut={handleSOSPressOut}
          />
          <Text style={styles.sosHelpText}>
            Hold SOS to broadcast your location to security and nearby verified
            responders
          </Text>
        </View>

        {/* PRIMARY SAFETY MODULES GRID */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Primary Safety Modules</Text>
          <View style={styles.moduleGrid}>
            <PrimaryModuleCard
              title="Safe Walk"
              subText="Share location temporarily"
              icon={<Footprints size={22} color={DESIGN_COLORS.tertiary} />}
              iconBgColor={DESIGN_COLORS.surfaceContainer}
              onPress={() => setLocationSharedVisible(true)}
            />
            <PrimaryModuleCard
              title="Medical ID"
              subText="Critical health info"
              icon={
                <BriefcaseMedical size={22} color={ResQColors.primaryRedText} />
              }
              iconBgColor={ResQColors.primaryRedLight}
              onPress={() => {
                setMedicalIdVisible(true);
                fetchMedicalIdData();
              }}
            />
            <PrimaryModuleCard
              title="I'm Ok (Check In)"
              subText="Send a quick status update to your network"
              icon={<UserCheck size={22} color={ResQColors.orangeText} />}
              iconBgColor={ResQColors.orangeBg}
              onPress={() => setCheckInVisible(true)}
            />
            <PrimaryModuleCard
              title="Your Emergencies 🚨"
              subText="View all emergencies & people responding"
              icon={<Siren size={22} color={ResQColors.pinkText} />}
              iconBgColor={ResQColors.pinkBg}
              onPress={() => router.push("/yourEmergencies")}
            />
          </View>
        </View>

        {/* EMERGENCY ACTIONS GRID */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Emergency Actions</Text>
          <View style={styles.moduleGrid}>
            <EmergencyActionCard
              title="Share location"
              subText="with contacts"
              icon={<MapPin size={22} color={Colors.light.primary} />}
              iconBgColor={ResQColors.primaryRedLight}
              onPress={() => setLocationSharedVisible(true)}
            />
            <EmergencyActionCard
              title="Call security"
              subText="Campus Security"
              icon={<Phone size={22} color={Colors.light.primary} />}
              iconBgColor={ResQColors.primaryRedLight}
              onPress={() => setCallModalVisible(true)}
            />
            <EmergencyActionCard
              title="Report incident"
              subText="Non-urgent"
              icon={<AlertTriangle size={22} color={Colors.light.primary} />}
              iconBgColor={ResQColors.primaryRedLight}
              onPress={() => router.push("/report")}
            />
            <EmergencyActionCard
              title="Add responder"
              subText="Invite to network"
              icon={<UserPlus size={22} color={Colors.light.primary} />}
              iconBgColor={ResQColors.primaryRedLight}
              onPress={() => router.push("/connect")}
            />
          </View>
        </View>
      </ScrollView>

      {/* SOS COUNTDOWN OVERLAY */}
      <Modal visible={isCountingDown} transparent={true} animationType="fade">
        <View style={styles.overlayBg}>
          <Animated.View
            style={[
              styles.countdownContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Text style={styles.countdownTitle}>HOLDING SOS</Text>
            <Text style={styles.countdownSubtitle}>BROADCAST ACTIVE IN</Text>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
            <Text style={styles.countdownWarning}>
              Release button to cancel
            </Text>
          </Animated.View>
        </View>
      </Modal>

      {/* SOS BROADCASTING OVERLAY */}
      <Modal visible={alertActive} transparent={true} animationType="slide" statusBarTranslucent>
        <View style={styles.senderOverlayBg}>
          <ScrollView
            contentContainerStyle={styles.senderScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.senderContentWrapper}>
              {/* Top Emergency Icon with glowing circular badge */}
              <View style={styles.senderIconWrapper}>
                <Radio
                  size={36}
                  color="#FFFFFF"
                />
              </View>

              {/* Top Header Badge */}
              <View style={styles.senderBadgeContainer}>
                <Radio size={13} color="#FFFFFF" />
                <Text style={styles.senderBadgeText}>
                  EMERGENCY SOS BROADCAST ACTIVE
                </Text>
              </View>

              {/* Main Alert Headline */}
              <Text style={styles.senderModalTitle}>
                🚨 YOUR SOS BEACON IS LIVE
              </Text>

              {/* Rich Caller Profile Card */}
              <View style={styles.senderProfileRow}>
                {userProfile?.profile_image_url ? (
                  <Image
                    source={{ uri: userProfile.profile_image_url }}
                    style={styles.senderProfileAvatar}
                  />
                ) : (
                  <View style={styles.senderProfileAvatarPlaceholder}>
                    <Text style={styles.senderProfileAvatarInitial}>
                      {(userProfile?.name || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.senderProfileTextCol}>
                  <Text style={styles.senderProfileName}>
                    {userProfile?.name || "You (ResQ Resident)"}
                  </Text>
                  <Text style={styles.senderProfileSubtext}>
                    {userProfile?.program_of_study
                      ? `${userProfile.program_of_study} • `
                      : userProfile?.role
                        ? `${userProfile.role.toUpperCase()} • `
                        : ""}
                    Broadcasting Safety Circle & Security
                  </Text>
                </View>
              </View>

              {/* In-Overlay Live Progress Status Pill */}
              <View style={styles.statusIndicatorRow}>
                {sosBroadcastState === "locating" && (
                  <View style={styles.statusPill}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.statusPillText}>Locating precise GPS fix…</Text>
                  </View>
                )}
                {sosBroadcastState === "uploading" && (
                  <View style={styles.statusPill}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.statusPillText}>Transmitting alert to dispatch…</Text>
                  </View>
                )}
                {sosBroadcastState === "broadcasting" && (
                  <View style={[styles.statusPill, styles.statusPillActive]}>
                    <CheckCircle2 size={15} color="#4ADE80" style={{ marginRight: 6 }} />
                    <Text style={styles.statusPillText}>Live continuous GPS stream active</Text>
                  </View>
                )}
                {sosBroadcastState === "failed" && (
                  <View style={[styles.statusPill, styles.statusPillFailed]}>
                    <AlertTriangle size={15} color="#FCA5A5" style={{ marginRight: 6 }} />
                    <Text style={styles.statusPillText}>
                      {sosBroadcastError || "Alert broadcast failed"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Background Location Paused Warning Banner */}
              {isLocationPaused && (
                <View style={styles.pausedBanner}>
                  <AlertTriangle size={18} color="#9A3412" />
                  <Text style={styles.pausedBannerText}>
                    Live location stream paused while app is backgrounded. Reopen app to keep updating location.
                  </Text>
                </View>
              )}

              {/* Live Location / Coordinates Info Box */}
              <View style={styles.senderInfoBox}>
                <View style={styles.senderInfoRow}>
                  <MapPin size={18} color="#FFFFFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.senderInfoRowHeader}>Live GPS Coordinates (Google Maps format)</Text>
                    <Text style={styles.senderCoordinatesText}>
                      {currentCoords
                        ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`
                        : "Acquiring live GPS..."}
                    </Text>
                  </View>
                  <View style={styles.livePulsingDot} />
                </View>

                <View style={styles.senderInfoRow}>
                  <ShieldAlert size={18} color="#FFFFFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.senderInfoRowHeader}>Security Dispatch</Text>
                    <Text style={styles.senderInfoText}>
                      KNUST Campus Security & Safety Circle Notified
                    </Text>
                  </View>
                </View>
              </View>

              {/* Retry Button if broadcast failed */}
              {sosBroadcastState === "failed" && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => triggerSosAlertCreation()}
                >
                  <RefreshCw size={16} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>RETRY BROADCAST</Text>
                </TouchableOpacity>
              )}

              {/* Realtime Responders List */}
              <View style={styles.respondersCard}>
                <Text style={styles.respondersTitle}>
                  Active Responders ({sosResponders.length})
                </Text>
                {sosResponders.length > 0 ? (
                  <ScrollView style={{ maxHeight: 85 }} nestedScrollEnabled>
                    {sosResponders.map((res) => (
                      <View key={res.id} style={styles.responderRow}>
                        <UserCheck size={16} color="#4ADE80" />
                        <Text style={styles.responderName}>{res.name}</Text>
                        <Text style={styles.responderSourceBadge}>
                          {res.responder_source === "trusted_contact"
                            ? "Trusted Network"
                            : "Nearby ResQ User"}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noRespondersText}>
                    Waiting for nearby users or trusted contacts to commit help...
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopSOSBroadcast}
              >
                <ShieldAlert size={20} color={ResQColors.primaryRed} />
                <Text style={styles.stopButtonText}>STOP BROADCAST</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MEDICAL ID MODAL COMPONENT */}
      <MedicalInfoModal
        visible={medicalIdVisible}
        onClose={() => setMedicalIdVisible(false)}
        userId={userProfile?.id}
        userName={userProfile?.name}
        medicalRecord={medicalInfo}
        emergencyContacts={medicalContacts}
        isLoading={isLoadingMedicalId}
      />

      {/* CHECK-IN "I'M OKAY" SUCCESS MODAL */}
      <Modal visible={checkInVisible} transparent={true} animationType="fade">
        <View style={styles.overlayBg}>
          <View style={styles.successCard}>
            <CheckCircle2 size={50} color={ResQColors.statusGreen} />
            <Text style={styles.successHeader}>Status Sent!</Text>
            <Text style={styles.successText}>
              "I'm Okay" status update has been broadcast to your trusted
              network contacts.
            </Text>
            <TouchableOpacity
              style={[
                styles.modalPrimaryBtn,
                { backgroundColor: ResQColors.statusGreen },
              ]}
              onPress={() => setCheckInVisible(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SECURITY CALL MODAL */}
      <Modal visible={callModalVisible} transparent={true} animationType="fade">
        <View style={styles.overlayBg}>
          <View style={styles.callingCard}>
            <Phone size={40} color={Colors.light.textInverse} />
            <Text style={styles.callingHeader}>Calling Security</Text>
            <Text style={styles.callingName}>KNUST Campus Emergency Line</Text>
            <Text style={styles.callingNumber}>+233 50 123 4567</Text>

            <TouchableOpacity
              style={styles.hangupButton}
              onPress={() => setCallModalVisible(false)}
            >
              <X size={24} color={Colors.light.textInverse} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SHARE LOCATION SUCCESS MODAL */}
      <Modal
        visible={locationSharedVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.overlayBg}>
          <View style={styles.successCard}>
            <CheckCircle2 size={50} color={DESIGN_COLORS.tertiary} />
            <Text style={styles.successHeader}>Location Shared</Text>
            <Text style={styles.successText}>
              Your real-time coordinates have been sent to your primary contacts
              and will be active for the next 2 hours.
            </Text>
            <TouchableOpacity
              style={[
                styles.modalPrimaryBtn,
                { backgroundColor: DESIGN_COLORS.tertiary },
              ]}
              onPress={() => setLocationSharedVisible(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD TO TRUSTED NETWORK MODAL */}
      <Modal
        visible={addResponderVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.overlayBg}>
          <View style={styles.contactModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                }}
              >
                <View style={styles.contactModalIconBg}>
                  <UserPlus size={20} color={Colors.light.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitleText}>
                    Add to Trusted Network
                  </Text>
                  <Text style={styles.modalSubText}>
                    Select from your connected app contacts
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAddResponderVisible(false);
                  setContactSearchQuery("");
                }}
                style={styles.closeBtn}
              >
                <X size={20} color={Colors.light.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBarContainer}>
              <Search size={18} color={ResQColors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search connected contacts..."
                placeholderTextColor={ResQColors.textFaint}
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
              />
              {contactSearchQuery ? (
                <TouchableOpacity onPress={() => setContactSearchQuery("")}>
                  <X size={16} color={ResQColors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Connected App Contacts List */}
            <ScrollView
              style={{ maxHeight: 280, marginVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredAppContacts.length > 0 ? (
                filteredAppContacts.map((item) => {
                  const isAdded = !!item.isTrustedNetwork;
                  return (
                    <View key={item.id} style={styles.contactListItem}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          flex: 1,
                        }}
                      >
                        <View
                          style={[
                            styles.contactAvatar,
                            {
                              backgroundColor:
                                item.avatarColor || Colors.light.primary,
                            },
                          ]}
                        >
                          <Text style={styles.contactAvatarText}>
                            {item.initials ||
                              item.name.substring(0, 1).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.contactName}>{item.name}</Text>
                          <Text style={styles.contactPhone}>
                            {item.relationship} •{" "}
                            {item.phone || "Connected Contact"}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.addBtn, isAdded && styles.addedBtn]}
                        disabled={isAdded}
                        onPress={() => handleAddToTrustedNetwork(item.id)}
                      >
                        {isAdded ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Check size={14} color={ResQColors.greenText} />
                            <Text style={styles.addedBtnText}>In Network</Text>
                          </View>
                        ) : (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Plus size={14} color={Colors.light.textInverse} />
                            <Text style={styles.addBtnText}>Add</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ color: ResQColors.textMuted, fontSize: 13 }}>
                    No connected contacts found matching "{contactSearchQuery}"
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.goToContactsLink}
              onPress={() => {
                setAddResponderVisible(false);
                router.push("/(resident)/contacts");
              }}
            >
              <Text style={styles.goToContactsText}>
                View Address Book Contacts
              </Text>
              <ArrowRight size={16} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MANAGE TRUSTED NETWORK MODAL */}
      <Modal
        visible={manageModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.overlayBg}>
          <View style={styles.contactModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                }}
              >
                <View style={styles.contactModalIconBg}>
                  <ShieldAlert size={20} color={Colors.light.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitleText}>
                    Manage Trusted Network
                  </Text>
                  <Text style={styles.modalSubText}>
                    Remove contacts from your quick SOS circle while keeping
                    them in Contacts
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setManageModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={Colors.light.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Trusted Network List */}
            <ScrollView
              style={{ maxHeight: 280, marginVertical: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {trustedNetworkContacts.length > 0 ? (
                trustedNetworkContacts.map((item) => (
                  <View key={item.id} style={styles.contactListItem}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
                      }}
                    >
                      <View
                        style={[
                          styles.contactAvatar,
                          {
                            backgroundColor:
                              item.avatarColor || Colors.light.primary,
                          },
                        ]}
                      >
                        <Text style={styles.contactAvatarText}>
                          {item.initials ||
                            item.name.substring(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        <Text style={styles.contactPhone}>
                          {item.relationship} •{" "}
                          {item.phone || "Connected Contact"}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.removeNetworkBtn}
                      onPress={() => handleRemoveFromTrustedNetwork(item.id)}
                    >
                      <UserMinus size={14} color={Colors.light.primary} />
                      <Text style={styles.removeNetworkBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <Text style={{ color: ResQColors.textMuted, fontSize: 13 }}>
                    No contacts in your trusted network yet.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.goToContactsLink}
              onPress={() => {
                setManageModalVisible(false);
                router.push("/(resident)/contacts");
              }}
            >
              <Text style={styles.goToContactsText}>
                View Address Book Contacts
              </Text>
              <ArrowRight size={16} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  greetingContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  greetingTitle: {
    fontSize: 30,
    color: Colors.light.primary,
    fontFamily: typography.medium,
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: ResQColors.textMuted,
    fontFamily: typography.medium,
    marginTop: 4,
    lineHeight: 20,
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  networkHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.semibold,
    color: DESIGN_COLORS.onSurface,
    letterSpacing: -0.2,
  },
  manageLink: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: Colors.light.primary,
  },
  contactsScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addContactCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: ResQColors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurface,
  },
  addContactText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
  },
  sosCard: {
    backgroundColor: ResQColors.cardSurface,
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: ResQColors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sosHelpText: {
    color: Colors.light.textMuted,
    fontSize: 13,
    fontFamily: typography.regular,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownContainer: {
    backgroundColor: ResQColors.cardSurface,
    padding: 30,
    borderRadius: 24,
    width: "80%",
    alignItems: "center",
    elevation: 10,
  },
  countdownTitle: {
    color: Colors.light.error,
    fontSize: 22,
    fontFamily: typography.bold,
    letterSpacing: 1,
  },
  countdownSubtitle: {
    color: Colors.light.textMuted,
    fontSize: 12,
    fontFamily: typography.medium,
    marginTop: 4,
  },
  countdownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 24,
  },
  countdownNumber: {
    fontSize: 48,
    fontFamily: typography.bold,
    color: Colors.light.primary,
  },
  countdownWarning: {
    color: Colors.light.textMuted,
    fontSize: 13,
    fontFamily: typography.regular,
  },

  callingCard: {
    backgroundColor: Colors.light.primary,
    padding: 30,
    borderRadius: 24,
    width: "85%",
    alignItems: "center",
    gap: 12,
  },
  callingHeader: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: typography.medium,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 10,
  },
  callingName: {
    color: Colors.light.textInverse,
    fontSize: 20,
    fontFamily: typography.bold,
    textAlign: "center",
  },
  callingNumber: {
    color: Colors.light.textInverse,
    fontSize: 16,
    fontFamily: typography.semibold,
  },
  hangupButton: {
    backgroundColor: Colors.light.error,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  successCard: {
    backgroundColor: ResQColors.cardSurface,
    padding: 24,
    borderRadius: 20,
    width: "85%",
    alignItems: "center",
    elevation: 10,
  },
  successHeader: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginTop: 14,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  medicalIdCard: {
    backgroundColor: ResQColors.cardSurface,
    padding: 20,
    borderRadius: 24,
    width: "90%",
    maxHeight: "85%",
    elevation: 10,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitleText: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  medicalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ResQColors.primaryRedLight,
    justifyContent: "center",
    alignItems: "center",
  },
  detailBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  medicalDetailBox: {
    backgroundColor: ResQColors.cardSurfaceSoft,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 2,
  },
  medicalLabel: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#64748B",
  },
  medicalVal: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: "#0F172A",
    marginTop: 2,
  },
  emergencyContactsSection: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    marginTop: 4,
  },
  contactsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactsSectionTitle: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  contactItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contactItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  contactInitialsCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  contactInitialsText: {
    fontSize: 12,
    fontFamily: typography.bold,
    color: ResQColors.primaryRed,
  },
  contactCardName: {
    fontSize: 13.5,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  relationBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  relationBadgeText: {
    fontSize: 10,
    fontFamily: typography.medium,
    color: "#475569",
  },
  contactCardPhone: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#64748B",
  },
  contactCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContactsText: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  modalPrimaryBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  modalPrimaryBtnText: {
    color: Colors.light.textInverse,
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  contactModalCard: {
    backgroundColor: ResQColors.cardSurface,
    padding: 20,
    borderRadius: 24,
    width: "90%",
    elevation: 10,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  contactModalIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ResQColors.primaryRedLight,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: ResQColors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.medium,
    color: Colors.light.text,
    padding: 0,
  },
  contactListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: ResQColors.borderSubtle,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    color: Colors.light.textInverse,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  contactName: {
    fontSize: 14,
    fontFamily: typography.semibold,
    color: Colors.light.text,
  },
  contactPhone: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addedBtn: {
    backgroundColor: ResQColors.greenBg,
  },
  addBtnText: {
    color: Colors.light.textInverse,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  addedBtnText: {
    color: ResQColors.greenText,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  manualEntryLink: {
    paddingVertical: 10,
    alignItems: "center",
  },
  manualEntryText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: Colors.light.primary,
  },
  removeNetworkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ResQColors.primaryRedLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
  },
  removeNetworkBtnText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: Colors.light.primary,
  },
  goToContactsLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: ResQColors.borderSubtle,
  },
  goToContactsText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: Colors.light.primary,
  },
  trustedLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  trustedLoadingText: {
    fontFamily: typography.medium,
    fontSize: 12.5,
    color: Colors.light.textMuted,
    marginTop: 6,
  },
  trustedEmptyContainer: {
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ResQColors.border,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  trustedEmptyTitle: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 2,
  },
  trustedEmptySubtext: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 17,
  },
  pausedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  pausedBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.medium,
    color: "#9A3412",
    lineHeight: 16,
  },
  respondersCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  respondersTitle: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: Colors.light.textInverse,
    marginBottom: 8,
  },
  responderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  responderName: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: Colors.light.textInverse,
    flex: 1,
  },
  responderSourceBadge: {
    fontSize: 10,
    fontFamily: typography.medium,
    color: Colors.light.textInverse,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  noRespondersText: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "rgba(255, 255, 255, 0.8)",
    fontStyle: "italic",
  },
  senderOverlayBg: {
    flex: 1,
    backgroundColor: ResQColors.primaryRed,
  },
  senderScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === "android" ? 36 : 24,
  },
  senderContentWrapper: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    justifyContent: "center",
  },
  senderIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  senderBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  senderBadgeText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontFamily: typography.bold,
    letterSpacing: 0.8,
  },
  senderModalTitle: {
    fontSize: 21,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 14,
  },
  senderProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    padding: 14,
    borderRadius: 16,
    width: "100%",
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  senderProfileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  senderProfileAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  senderProfileAvatarInitial: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  senderProfileTextCol: {
    flex: 1,
  },
  senderProfileName: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  senderProfileSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontFamily: typography.regular,
    marginTop: 2,
  },
  senderInfoBox: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  senderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  senderInfoRowHeader: {
    fontSize: 11,
    fontFamily: typography.bold,
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.4,
  },
  senderCoordinatesText: {
    fontSize: 13.5,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    marginTop: 1,
  },
  senderInfoText: {
    fontSize: 12.5,
    fontFamily: typography.medium,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 1,
  },
  livePulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ADE80",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  statusIndicatorRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  statusPillActive: {
    backgroundColor: "rgba(74, 222, 128, 0.25)",
    borderColor: "#86EFAC",
  },
  statusPillFailed: {
    backgroundColor: "rgba(239, 68, 68, 0.35)",
    borderColor: "#FCA5A5",
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  stopButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginTop: 4,
  },
  stopButtonText: {
    color: ResQColors.primaryRed,
    fontFamily: typography.bold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});

export default Home;
