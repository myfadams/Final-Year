import { getTrustedContacts, TrustedContactRecord } from "@/backend/contacts";
import { getMedicalInfo, MedicalRecord } from "@/backend/medical";
import HeartBeatWave from "@/components/HeartBeatWave";
import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import {
  Activity,
  AlertCircle,
  Droplet,
  FileText,
  HeartPulse,
  Phone,
  PhoneCall,
  Pill,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface MedicalInfoModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string | null;
  userName?: string | null;
  medicalRecord?: MedicalRecord | null;
  emergencyContacts?: TrustedContactRecord[];
  isLoading?: boolean;
}

export default function MedicalInfoModal({
  visible,
  onClose,
  userId,
  userName,
  medicalRecord: propMedicalRecord,
  emergencyContacts: propEmergencyContacts,
  isLoading: propIsLoading,
}: MedicalInfoModalProps) {
  const [internalMedical, setInternalMedical] = useState<MedicalRecord | null>(null);
  const [internalContacts, setInternalContacts] = useState<TrustedContactRecord[]>([]);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      if (!visible || !userId) return;
      if (propMedicalRecord !== undefined || propEmergencyContacts !== undefined) {
        return;
      }

      setInternalLoading(true);
      try {
        const [medRes, contactsRes] = await Promise.all([
          getMedicalInfo(userId),
          getTrustedContacts(userId),
        ]);
        setInternalMedical(medRes.data || null);
        setInternalContacts(contactsRes.data || []);
      } catch (err) {
        console.error("Error loading data in MedicalInfoModal:", err);
      } finally {
        setInternalLoading(false);
      }
    }

    loadData();
  }, [visible, userId, propMedicalRecord, propEmergencyContacts]);

  const medicalData = propMedicalRecord !== undefined ? propMedicalRecord : internalMedical;
  const contactsList = propEmergencyContacts !== undefined ? propEmergencyContacts : internalContacts;
  const isLoading = propIsLoading !== undefined ? propIsLoading : internalLoading;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlayBg}>
        <View style={styles.medicalIdCard}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.medicalIconBadge}>
                <HeartPulse size={22} color={ResQColors.primaryRedText} />
              </View>
              <View>
                <Text style={styles.modalTitleText}>Emergency Medical ID</Text>
                <Text style={styles.modalSubText}>Critical Health & Emergency Info</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <HeartBeatWave width={180} height={60} color={ResQColors.primaryRed} thickness={14} />
              <Text style={{ marginTop: 12, fontSize: 13, fontFamily: typography.medium, color: "#64748B" }}>
                Loading Medical Record...
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
            >
              {/* Full Name */}
              <View style={styles.medicalDetailBox}>
                <View style={styles.detailBoxHeader}>
                  <User size={14} color={Colors.light.primary} />
                  <Text style={styles.medicalLabel}>Full Name</Text>
                </View>
                <Text style={styles.medicalVal}>{userName || "Not set"}</Text>
              </View>

              {/* Blood Group / Type */}
              <View style={styles.medicalDetailBox}>
                <View style={styles.detailBoxHeader}>
                  <Droplet size={14} color={ResQColors.primaryRed} />
                  <Text style={styles.medicalLabel}>Blood Group / Type</Text>
                </View>
                <Text style={styles.medicalVal}>
                  {medicalData?.blood_group || "Not specified"}
                </Text>
              </View>

              {/* Allergies */}
              <View style={styles.medicalDetailBox}>
                <View style={styles.detailBoxHeader}>
                  <AlertCircle size={14} color={ResQColors.primaryRed} />
                  <Text style={styles.medicalLabel}>Allergies</Text>
                </View>
                <Text style={styles.medicalVal}>
                  {medicalData?.allergies || "None reported"}
                </Text>
              </View>

              {/* Current Medications */}
              <View style={styles.medicalDetailBox}>
                <View style={styles.detailBoxHeader}>
                  <Pill size={14} color={ResQColors.primaryRed} />
                  <Text style={styles.medicalLabel}>Current Medications</Text>
                </View>
                <Text style={styles.medicalVal}>
                  {medicalData?.medications || "None reported"}
                </Text>
              </View>

              {/* Chronic Conditions & Health Notes */}
              <View style={styles.medicalDetailBox}>
                <View style={styles.detailBoxHeader}>
                  <Activity size={14} color={ResQColors.primaryRed} />
                  <Text style={styles.medicalLabel}>Chronic Conditions & Health Notes</Text>
                </View>
                <Text style={styles.medicalVal}>
                  {medicalData?.chronic_conditions || "None reported"}
                </Text>
              </View>

              {/* Emergency Notes for Responders */}
              <View style={styles.medicalDetailBox}>
                <View style={styles.detailBoxHeader}>
                  <FileText size={14} color={ResQColors.primaryRed} />
                  <Text style={styles.medicalLabel}>Emergency Notes for Responders</Text>
                </View>
                <Text style={styles.medicalVal}>
                  {medicalData?.emergency_notes || "None reported"}
                </Text>
              </View>

              {/* Emergency Contacts Section */}
              <View style={styles.emergencyContactsSection}>
                <View style={styles.contactsHeaderRow}>
                  <Phone size={14} color={Colors.light.primary} />
                  <Text style={styles.contactsSectionTitle}>
                    Trusted Emergency Contacts ({contactsList.length})
                  </Text>
                </View>

                {contactsList.length > 0 ? (
                  contactsList.map((contact) => {
                    const initials = contact.contact_name
                      .trim()
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <View key={contact.id} style={styles.contactItemCard}>
                        <View style={styles.contactItemLeft}>
                          <View style={styles.contactInitialsCircle}>
                            <Text style={styles.contactInitialsText}>{initials || "EC"}</Text>
                          </View>
                          <View style={{ gap: 2, flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <Text style={styles.contactCardName}>{contact.contact_name}</Text>
                              {contact.relationship ? (
                                <View style={styles.relationBadge}>
                                  <Text style={styles.relationBadgeText}>{contact.relationship}</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.contactCardPhone}>{contact.contact_phone}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.contactCallBtn}
                          onPress={() => {
                            const phoneUrl = `tel:${contact.contact_phone.replace(/\s+/g, "")}`;
                            Linking.openURL(phoneUrl).catch(() => {});
                          }}
                          activeOpacity={0.8}
                        >
                          <PhoneCall size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyContactsText}>No emergency contacts listed</Text>
                )}
              </View>
            </ScrollView>
          )}

          <TouchableOpacity style={styles.modalPrimaryBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.modalPrimaryBtnText}>Close Medical ID</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  medicalIdCard: {
    backgroundColor: ResQColors.cardSurface,
    padding: 20,
    borderRadius: 24,
    width: "90%",
    maxHeight: "85%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
  modalSubText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  medicalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ResQColors.primaryRedLight,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    padding: 4,
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
});
