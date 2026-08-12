import { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { getUserProfile, UserProfile } from "@/backend/auth";
import { Image } from "expo-image";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Hash,
  HeartPulse,
  IdCard,
  Mail,
  Phone,
  ShieldCheck,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const AVATAR_COLORS = [
  { bg: "#FEE2E2", text: "#991B1B" },
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#EDE9FE", text: "#5B21B6" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#CCFBF1", text: "#0F766E" },
];

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const code = (name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export interface ContactDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  contactId?: string;
  name: string;
  relationship: string;
  avatarUrl?: string;
  phone?: string;
  onCallPress?: () => void;
}

export default function ContactDetailsModal({
  visible,
  onClose,
  contactId,
  name,
  relationship,
  avatarUrl,
  phone,
  onCallPress,
}: ContactDetailsModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && contactId) {
      setIsLoading(true);
      getUserProfile(contactId)
        .then(({ profile: fetchedProfile }) => {
          if (fetchedProfile) {
            setProfile(fetchedProfile);
          }
        })
        .catch((err) => console.warn("Failed to load contact profile:", err))
        .finally(() => setIsLoading(false));
    }
  }, [visible, contactId]);

  const displayName = profile?.name || name || "Contact Info";
  const displayAvatar = profile?.profile_image_url || avatarUrl;
  const displayPhone = profile?.phone || phone;
  const displayRole = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : relationship;
  const avatarColor = getAvatarColor(displayName);
  const initials = getInitials(displayName);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Top Bar Indicator */}
          <View style={styles.dragIndicator} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <User size={20} color={ResQColors.primaryRedText} />
              <Text style={styles.headerTitle}>Contact Profile</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Profile Header */}
            <View style={styles.heroSection}>
              {displayAvatar ? (
                <Image
                  source={{ uri: displayAvatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.initialsAvatar, { backgroundColor: avatarColor.bg }]}>
                  <Text style={[styles.initialsText, { color: avatarColor.text }]}>
                    {initials}
                  </Text>
                </View>
              )}

              <Text style={styles.contactName}>{displayName}</Text>
              
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{displayRole}</Text>
                </View>

                {profile?.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={13} color="#047857" />
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Action Button */}
            {onCallPress && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={onCallPress}
                activeOpacity={0.85}
              >
                <Phone size={18} color="#FFFFFF" />
                <Text style={styles.callButtonText}>Call Contact</Text>
              </TouchableOpacity>
            )}

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={ResQColors.primaryRed} />
                <Text style={styles.loadingText}>Fetching details...</Text>
              </View>
            ) : (
              <>
                {/* Academic & Reference Details Section */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <GraduationCap size={18} color={ResQColors.primaryRedText} />
                    <Text style={styles.sectionTitle}>Academic Details</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconWrapper}>
                      <IdCard size={16} color="#64748B" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Student / Index No.</Text>
                      <Text style={styles.infoValue}>
                        {profile?.student_id_number || "Not specified"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconWrapper}>
                      <Hash size={16} color="#64748B" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Reference Number</Text>
                      <Text style={styles.infoValue}>
                        {profile?.student_reference_number || "Not specified"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconWrapper}>
                      <BookOpen size={16} color="#64748B" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Program of Study</Text>
                      <Text style={styles.infoValue}>
                        {profile?.program_of_study || "Not specified"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Personal & Contact Information */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <User size={18} color={ResQColors.primaryRedText} />
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                  </View>

                  {displayPhone && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconWrapper}>
                        <Phone size={16} color="#64748B" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Phone Number</Text>
                        <Text style={styles.infoValue}>{displayPhone}</Text>
                      </View>
                    </View>
                  )}

                  {displayPhone && profile?.email && <View style={styles.divider} />}

                  {profile?.email && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconWrapper}>
                        <Mail size={16} color="#64748B" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Email Address</Text>
                        <Text style={styles.infoValue}>{profile.email}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Health & Emergency Conditions (if present) */}
                {profile?.known_health_problems && profile.known_health_problems.length > 0 && (
                  <View style={[styles.sectionCard, styles.healthCard]}>
                    <View style={styles.sectionHeaderRow}>
                      <HeartPulse size={18} color="#DC2626" />
                      <Text style={[styles.sectionTitle, { color: "#991B1B" }]}>
                        Medical / Health Alerts
                      </Text>
                    </View>
                    <View style={styles.healthTagsRow}>
                      {profile.known_health_problems.map((condition, idx) => (
                        <View key={idx} style={styles.healthTag}>
                          <Text style={styles.healthTagText}>{condition}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  dragIndicator: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 16,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 10,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: "#FEF2F2",
    marginBottom: 12,
  },
  initialsAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  initialsText: {
    fontFamily: typography.bold,
    fontSize: 28,
  },
  contactName: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: "#0F172A",
    textAlign: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  roleBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12.5,
    fontFamily: typography.semibold,
    color: "#475569",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#047857",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ResQColors.primaryRed,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: ResQColors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  callButtonText: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: "#FFFFFF",
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  sectionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  healthCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  infoIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11.5,
    fontFamily: typography.medium,
    color: "#64748B",
  },
  infoValue: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: "#0F172A",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  healthTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  healthTag: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  healthTagText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#991B1B",
  },
});
