// import EmergencyActionCard from "@/components/EmergencyActionCard";
import HomeTabBar from "@/components/HomeTabBar";
// import PrimaryModuleCard from "@/components/PrimaryModuleCard";
import EmergencyActionCard from "@/components/EmergecnyActionCard";
import PrimaryModuleCard from "@/components/PrimaryModuleCard";
import ProfileComponent from "@/components/ProfileComponent";
import PulsatingButton from "@/components/PulsatingButton";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { ContactsProp } from "@/constants/interfaces";
import { DEFAULT_CONTACTS } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseMedical,
  Check,
  CheckCircle2,
  Footprints,
  HeartPulse,
  MapPin,
  Phone,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  Siren,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const Home = () => {
  const router = useRouter();
  const [appContacts, setAppContacts] =
    useState<ContactsProp[]>(DEFAULT_CONTACTS);

  // SOS Countdown States
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [alertActive, setAlertActive] = useState(false);
  const countdownInterval = useRef<any>(null);

  // Modal States
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [locationSharedVisible, setLocationSharedVisible] = useState(false);
  const [medicalIdVisible, setMedicalIdVisible] = useState(false);
  const [checkInVisible, setCheckInVisible] = useState(false);

  // Trusted Network Modal States
  const [addResponderVisible, setAddResponderVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");

  // SOS Countdown Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // SOS button handlers
  const handleSOSPressIn = () => {
    setIsCountingDown(true);
    setCountdown(3);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 3000,
        useNativeDriver: true,
      }),
    ]).start();

    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current);
          setIsCountingDown(false);
          setAlertActive(true);
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
      setCountdown(3);
      scaleAnim.setValue(1);
    }
  };

  const stopSOSBroadcast = () => {
    setAlertActive(false);
    scaleAnim.setValue(1);
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
      <HomeTabBar pageTitle="ResQ." />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/*  Greeting Header */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTitle}>Hi George!</Text>
          <Text style={styles.greetingSubtitle}>
            You are protected. Your campus circle is active.
          </Text>
        </View>

        {/* Trusted Network Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.networkHeaderRow}>
            <Text style={styles.sectionTitle}>Trusted Network</Text>
            <TouchableOpacity onPress={() => setManageModalVisible(true)}>
              <Text style={styles.manageLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contactsScroll}
          >
            {/* Add Contact Button */}
            <View style={{ alignItems: "center", gap: 6, marginRight: 4 }}>
              <TouchableOpacity
                style={styles.addContactCircle}
                onPress={() => setAddResponderVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={22} color={ResQColors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.addContactText}>Add</Text>
            </View>

            {/* Trusted Contacts List */}
            {trustedNetworkContacts.map((contact) => (
              <ProfileComponent
                userInfo={{
                  name: contact.name,
                  emergencyContact: true,
                  profileColor: contact.avatarColor || Colors.light.primary,
                  avatarUrl: contact.avatarUrl,
                  statusColor: contact.statusColor || ResQColors.statusGreen,
                }}
                borderR={true}
                size={64}
                key={contact.id}
              />
            ))}
          </ScrollView>
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
              onPress={() => setMedicalIdVisible(true)}
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
              onPress={() => router.push("/(resident)/alerts")}
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
      <Modal visible={alertActive} transparent={true} animationType="slide">
        <View
          style={[styles.overlayBg, { backgroundColor: Colors.light.primary }]}
        >
          <View style={styles.broadcastContainer}>
            <Radio
              size={80}
              color={Colors.light.textInverse}
              style={styles.broadcastIcon}
            />
            <Text style={styles.broadcastTitle}>
              EMERGENCY BROADCAST ACTIVE
            </Text>
            <Text style={styles.broadcastSub}>
              Your live location is being monitored in real time by KNUST
              security and verified responders
            </Text>

            <View style={styles.broadcastCard}>
              <Text style={styles.broadcastCardTitle}>Broadcast Details</Text>
              <Text style={styles.broadcastCardText}>
                • Location: Science Block Area
              </Text>
              <Text style={styles.broadcastCardText}>
                • Coords: 6.6751° N, 1.5715° W
              </Text>
              <Text style={styles.broadcastCardText}>
                • Status: Security Dispatched
              </Text>
            </View>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopSOSBroadcast}
            >
              <X size={20} color={Colors.light.primary} />
              <Text style={styles.stopButtonText}>STOP BROADCAST</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MEDICAL ID MODAL */}
      <Modal visible={medicalIdVisible} transparent={true} animationType="fade">
        <View style={styles.overlayBg}>
          <View style={styles.medicalIdCard}>
            <View style={styles.modalHeaderRow}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <HeartPulse size={24} color={Colors.light.primary} />
                <Text style={styles.modalTitleText}>Medical ID</Text>
              </View>
              <TouchableOpacity onPress={() => setMedicalIdVisible(false)}>
                <X size={20} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.medicalDetailBox}>
              <Text style={styles.medicalLabel}>Full Name</Text>
              <Text style={styles.medicalVal}>George Adams</Text>
            </View>
            <View style={styles.medicalDetailBox}>
              <Text style={styles.medicalLabel}>Blood Type</Text>
              <Text style={styles.medicalVal}>O Positive (O+)</Text>
            </View>
            <View style={styles.medicalDetailBox}>
              <Text style={styles.medicalLabel}>
                Known Conditions & Allergies
              </Text>
              <Text style={styles.medicalVal}>Asthma, Penicillin Allergy</Text>
            </View>
            <View style={styles.medicalDetailBox}>
              <Text style={styles.medicalLabel}>Emergency Contact</Text>
              <Text style={styles.medicalVal}>
                Karen Castillo (+44 999 888 777)
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setMedicalIdVisible(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Close Medical ID</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  broadcastContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  broadcastIcon: {
    marginBottom: 20,
  },
  broadcastTitle: {
    color: Colors.light.textInverse,
    fontSize: 24,
    fontFamily: typography.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  broadcastSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: typography.regular,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
  },
  broadcastCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 20,
    borderRadius: 16,
    width: "100%",
    marginBottom: 40,
    gap: 8,
  },
  broadcastCardTitle: {
    color: Colors.light.textInverse,
    fontSize: 16,
    fontFamily: typography.bold,
    marginBottom: 4,
  },
  broadcastCardText: {
    color: Colors.light.textInverse,
    fontSize: 14,
    fontFamily: typography.medium,
  },
  stopButton: {
    backgroundColor: ResQColors.cardSurface,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: "center",
    elevation: 4,
  },
  stopButtonText: {
    color: Colors.light.primary,
    fontFamily: typography.bold,
    fontSize: 16,
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
    borderRadius: 20,
    width: "90%",
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
  medicalDetailBox: {
    backgroundColor: ResQColors.cardSurfaceSoft,
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  medicalLabel: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
  },
  medicalVal: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: Colors.light.text,
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
});

export default Home;
