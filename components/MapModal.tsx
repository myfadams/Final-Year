import { showPopupAlert } from "@/components/popupAlert";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


// =====================================================
// TYPES
// =====================================================
type Tab = "My Contacts" | "University" | "Family";

import { Person } from "@/constants/interfaces";

// =====================================================
// CONFIG
// =====================================================
const URGENCY_COLORS = {
  critical: "#FF3B3B",
  high: "#FF9500",
  medium: "#34C759",
};

const URGENCY_LABELS = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_OPEN = SCREEN_HEIGHT * 0.55;

import { PEOPLE } from "@/constants/tempData";
import PersonCard from "./MapPerson";

const TABS_DATA: Record<Tab, Person[]> = {
  "My Contacts": PEOPLE,
  University: [PEOPLE[1], PEOPLE[2], PEOPLE[3]],
  Family: [PEOPLE[0], PEOPLE[4]],
};

// =====================================================
// BOTTOM SHEET MODAL COMPONENT
// =====================================================
const BottomSheetModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  activeTab: Tab;
  selectedPerson: Person | null;
  onSelectPerson: (p: Person | null) => void;
  activeEmergency: Person | null;
  onAcceptEmergency: (p: Person) => void;
  onCancelEmergency: () => void;
  distance: string;
  duration: string;
}> = ({
  visible,
  onClose,
  activeTab,
  selectedPerson,
  onSelectPerson,
  activeEmergency,
  onAcceptEmergency,
  onCancelEmergency,
  distance,
  duration,
}) => {
  const translateY = useRef(new Animated.Value(MODAL_OPEN)).current;
  const lastY = useRef(MODAL_OPEN);
  const [showModal, setShowModal] = useState(visible);

  const isTooFar = () => {
    if (!distance || distance === "--") return false;
    const cleaned = distance.trim().toLowerCase();
    const value = parseFloat(cleaned);
    if (isNaN(value)) return false;
    if (cleaned.includes("km")) {
      return value > 0.8;
    }
    if (cleaned.includes("m")) {
      return value > 800;
    }
    return false;
  };

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 180,
      }).start();
      lastY.current = 0;
    } else {
      Animated.timing(translateY, {
        toValue: MODAL_OPEN,
        useNativeDriver: true,
        duration: 200,
        easing: Easing.out(Easing.ease),
      }).start(({ finished }) => {
        if (finished) {
          setShowModal(false);
        }
      });
      lastY.current = MODAL_OPEN;
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        translateY.stopAnimation((val) => {
          lastY.current = val;
        });
        translateY.setOffset(lastY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy > 80 || g.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 180,
          }).start();
          lastY.current = 0;
        }
      },
    }),
  ).current;

  if (!showModal) return null;

  const people = TABS_DATA[activeTab];
  const isAccepted = activeEmergency?.id === selectedPerson?.id;

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Dimmed backdrop backdrop */}
      <TouchableOpacity
        style={sheetStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View
        style={[sheetStyles.sheet, { transform: [{ translateY }] }]}
      >
        {selectedPerson ? (
          // =====================================================
          // EMERGENCY DETAILS VIEW
          // =====================================================
          <View style={sheetStyles.detailContainer}>
            {/* Header */}
            <View style={sheetStyles.detailHeader}>
              <TouchableOpacity
                onPress={() => onSelectPerson(null)}
                style={sheetStyles.backBtn}
              >
                <Text style={sheetStyles.backBtnText}>← Back to List</Text>
              </TouchableOpacity>
              <Text style={sheetStyles.sheetTitle}>Emergency Details</Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              style={{ flex: 1 }}
            >
              {/* Victim Details Card */}
              <View style={sheetStyles.detailCard}>
                <View
                  style={[
                    sheetStyles.detailAvatar,
                    {
                      backgroundColor: selectedPerson.avatarColor + "22",
                      borderColor: selectedPerson.avatarColor + "55",
                    },
                  ]}
                >
                  <Text
                    style={[
                      sheetStyles.detailAvatarInitial,
                      { color: selectedPerson.avatarColor },
                    ]}
                  >
                    {selectedPerson.name.charAt(0)}
                  </Text>
                </View>
                <View style={sheetStyles.detailInfo}>
                  <Text style={sheetStyles.detailName}>
                    {selectedPerson.name}
                  </Text>
                  <Text style={sheetStyles.detailAddress}>
                    {selectedPerson.address}
                  </Text>
                </View>
                <View
                  style={[
                    sheetStyles.urgencyBadge,
                    {
                      backgroundColor:
                        URGENCY_COLORS[selectedPerson.urgency] + "22",
                      borderColor:
                        URGENCY_COLORS[selectedPerson.urgency] + "44",
                    },
                  ]}
                >
                  <Text
                    style={[
                      sheetStyles.urgencyText,
                      { color: URGENCY_COLORS[selectedPerson.urgency] },
                    ]}
                  >
                    {URGENCY_LABELS[selectedPerson.urgency]}
                  </Text>
                </View>
              </View>

              {/* Distance / ETA Row (Unconditional) */}
              <View style={sheetStyles.slaRow}>
                <View style={sheetStyles.slaBox}>
                  <Text style={sheetStyles.slaLabel}>DISTANCE FROM YOU</Text>
                  <Text style={sheetStyles.slaValue}>{distance || "--"}</Text>
                </View>
                <View style={sheetStyles.slaDivider} />
                <View style={sheetStyles.slaBox}>
                  <Text style={sheetStyles.slaLabel}>ETA</Text>
                  <Text style={sheetStyles.slaValue}>{duration || "--"}</Text>
                </View>
              </View>

              {/* Emergency Description */}
              {selectedPerson.description && (
                <View style={sheetStyles.descSection}>
                  <Text style={sheetStyles.descTitle}>
                    EMERGENCY DESCRIPTION
                  </Text>
                  <Text style={sheetStyles.descText}>
                    {selectedPerson.description}
                  </Text>
                </View>
              )}

              {/* Scene Images */}
              {selectedPerson.images && selectedPerson.images.length > 0 && (
                <View style={sheetStyles.imageSection}>
                  <Text style={sheetStyles.descTitle}>SCENE IMAGES</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={sheetStyles.imageScroll}
                  >
                    {selectedPerson.images.map((imgUrl, idx) => (
                      <Image
                        key={idx}
                        source={{ uri: imgUrl }}
                        style={sheetStyles.sceneImage}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Description of Person Requesting */}
              {selectedPerson.requesterDesc && (
                <View style={sheetStyles.descSection}>
                  <Text style={sheetStyles.descTitle}>REQUESTER PROFILE</Text>
                  <Text style={sheetStyles.descText}>
                    {selectedPerson.requesterDesc}
                  </Text>
                </View>
              )}

              {/* Known Health Problems Section */}
              {selectedPerson.knownHealthProblems &&
                selectedPerson.knownHealthProblems.length > 0 && (
                  <View style={sheetStyles.healthSection}>
                    <Text style={sheetStyles.healthTitle}>
                      KNOWN HEALTH PROBLEMS
                    </Text>
                    <View style={sheetStyles.healthPillsRow}>
                      {selectedPerson.knownHealthProblems.map(
                        (problem, idx) => (
                          <View
                            key={idx}
                            style={[
                              sheetStyles.healthPill,
                              problem.toLowerCase() !== "none" &&
                                sheetStyles.healthPillActive,
                            ]}
                          >
                            <Text
                              style={[
                                sheetStyles.healthPillText,
                                problem.toLowerCase() !== "none" &&
                                  sheetStyles.healthPillTextActive,
                              ]}
                            >
                              {problem.toLowerCase() !== "none" ? "⚠️ " : ""}
                              {problem}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  </View>
                )}
            </ScrollView>

            {/* Action buttons */}
            <View style={sheetStyles.actionContainer}>
              {selectedPerson.falseAlarm || (selectedPerson as any).isFalseAlarm ? (
                <View style={{ gap: 12 }}>
                  <View style={[sheetStyles.warningBanner, { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" }]}>
                    <Text style={[sheetStyles.warningBannerText, { color: "#C2410C" }]}>
                      ⚠️ The creator flagged this emergency as false information. Responding is disabled.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[sheetStyles.acceptBtn, sheetStyles.disabledBtn]}
                    onPress={() => {
                      showPopupAlert(
                        "False Emergency Alert",
                        "The creator of this emergency flagged it as false information. You cannot respond to it.",
                        undefined,
                        undefined,
                        "warning"
                      );
                    }}
                  >
                    <Text style={sheetStyles.disabledBtnText}>
                      Flagged as False Info
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isAccepted ? (
                <TouchableOpacity
                  style={sheetStyles.cancelBtn}
                  onPress={onCancelEmergency}
                >
                  <Text style={sheetStyles.cancelBtnText}>Cancel Response</Text>
                </TouchableOpacity>
              ) : isTooFar() ? (
                <View style={{ gap: 12 }}>
                  <View style={sheetStyles.warningBanner}>
                    <Text style={sheetStyles.warningBannerText}>
                      ⚠️ You are too far from this incident. Alerts can only be
                      accepted within an 800m response radius.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[sheetStyles.acceptBtn, sheetStyles.disabledBtn]}
                    disabled={true}
                  >
                    <Text style={sheetStyles.disabledBtnText}>
                      Too Far to Respond
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={sheetStyles.acceptBtn}
                  onPress={() => onAcceptEmergency(selectedPerson)}
                >
                  <Text style={sheetStyles.acceptBtnText}>
                    Accept Emergency
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          // =====================================================
          // LIST VIEW
          // =====================================================
          <>
            {/* Drag Handle */}
            <View {...panResponder.panHandlers} style={sheetStyles.handleArea}>
              <View style={sheetStyles.handle} />
              <Text style={sheetStyles.sheetTitle}>Emergency Requests</Text>
              <Text style={sheetStyles.sheetSub}>
                {people.length} active in {activeTab}
              </Text>
            </View>

            {/* Stat Pills */}
            <View style={sheetStyles.statRow}>
              <View
                style={[
                  sheetStyles.statPill,
                  { borderColor: "#FF3B3B44", backgroundColor: "#FF3B3B11" },
                ]}
              >
                <View
                  style={[sheetStyles.statDot, { backgroundColor: "#FF3B3B" }]}
                />
                <Text style={[sheetStyles.statText, { color: "#FF3B3B" }]}>
                  {people.filter((p) => p.urgency === "critical").length}{" "}
                  Critical
                </Text>
              </View>
              <View
                style={[
                  sheetStyles.statPill,
                  { borderColor: "#FF950044", backgroundColor: "#FF950011" },
                ]}
              >
                <View
                  style={[sheetStyles.statDot, { backgroundColor: "#FF9500" }]}
                />
                <Text style={[sheetStyles.statText, { color: "#FF9500" }]}>
                  {people.filter((p) => p.urgency === "high").length} High
                </Text>
              </View>
              <View
                style={[
                  sheetStyles.statPill,
                  { borderColor: "#34C75944", backgroundColor: "#34C75911" },
                ]}
              >
                <View
                  style={[sheetStyles.statDot, { backgroundColor: "#34C759" }]}
                />
                <Text style={[sheetStyles.statText, { color: "#34C759" }]}>
                  {people.filter((p) => p.urgency === "medium").length} Medium
                </Text>
              </View>
            </View>

            {/* Person List */}
            <ScrollView
              style={sheetStyles.list}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 110 }}
            >
              {people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  isSelected={
                    selectedPerson
                      ? (selectedPerson as Person).id === person.id
                      : false
                  }
                  onPress={() => onSelectPerson(person)}
                />
              ))}
            </ScrollView>
          </>
        )}
      </Animated.View>
    </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,15,30,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_OPEN + 20,
    backgroundColor: "#0e1525",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 30,
  },
  handleArea: {
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sheetSub: {
    color: "#4a5568",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Details Styles
  detailContainer: {
    padding: 24,
    flex: 1,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
  },
  backBtnText: {
    color: "#4ECDC4",
    fontSize: 12,
    fontWeight: "700",
  },
  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 12,
    marginBottom: 24,
  },
  detailAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  detailAvatarInitial: {
    fontSize: 20,
    fontWeight: "800",
  },
  detailInfo: {
    flex: 1,
    gap: 4,
  },
  detailName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  detailAddress: {
    color: "#4a6a8a",
    fontSize: 12,
    fontWeight: "500",
  },
  urgencyBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  slaRow: {
    flexDirection: "row",
    backgroundColor: "rgba(10,15,30,0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
    marginBottom: 24,
  },
  slaBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  slaLabel: {
    color: "#4a5568",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  slaValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  slaDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  actionContainer: {
    marginTop: "auto",
    marginBottom: 10,
  },
  acceptBtn: {
    backgroundColor: "#4ECDC4",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  acceptBtnText: {
    color: "#0a0f1e",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cancelBtn: {
    backgroundColor: "#FF3B3B22",
    borderWidth: 1,
    borderColor: "#FF3B3B44",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#FF3B3B",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  descSection: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 20,
  },
  descTitle: {
    color: "#4a5568",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  descText: {
    color: "#e2e8f0",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  imageSection: {
    marginBottom: 20,
  },
  imageScroll: {
    marginTop: 8,
    flexDirection: "row",
  },
  sceneImage: {
    width: 240,
    height: 140,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  healthSection: {
    marginBottom: 20,
  },
  healthTitle: {
    color: "#4a5568",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  healthPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  healthPill: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  healthPillActive: {
    backgroundColor: "rgba(255, 59, 59, 0.08)",
    borderColor: "rgba(255, 59, 59, 0.25)",
  },
  healthPillText: {
    color: "#a0aec0",
    fontSize: 12,
    fontWeight: "600",
  },
  healthPillTextActive: {
    color: "#FF3B3B",
  },
  disabledBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  disabledBtnText: {
    color: "#4a5568",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  warningBanner: {
    backgroundColor: "rgba(255, 149, 0, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 149, 0, 0.25)",
    padding: 12,
  },
  warningBannerText: {
    color: "#FF9500",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    gap: 12,
  },
  cardSelected: {
    backgroundColor: "rgba(78,205,196,0.07)",
    borderColor: "rgba(78,205,196,0.25)",
  },
  urgencyBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  address: {
    color: "#4a6a8a",
    fontSize: 11,
    fontWeight: "500",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  urgencyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  navBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 44,
    alignItems: "center",
  },
});

export default BottomSheetModal;
