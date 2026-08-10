import { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import {
    Activity,
    AlertCircle,
    FileText,
    Heart,
    Phone,
    Pill,
    ShieldAlert,
    X
} from "lucide-react-native";
import React from "react";
import {
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export interface PatientMedicalProfile {
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  notes: string;
  avatarUrl?: string;
}

interface MedicalInfoModalProps {
  visible: boolean;
  onClose: () => void;
  patientProfile?: PatientMedicalProfile;
}

const DEFAULT_PATIENT: PatientMedicalProfile = {
  name: "Jane Smith",
  age: 28,
  gender: "Female",
  bloodType: "O+",
  conditions: ["Severe Asthma", "Mild Anaphylaxis Risk"],
  allergies: ["Penicillin", "Latex", "Peanuts"],
  medications: ["Albuterol Inhaler (PRN)", "Montelukast 10mg"],
  emergencyContact: {
    name: "Dr. Mark Smith",
    relationship: "Father / Physician",
    phone: "+44 7911 123456",
  },
  notes:
    "Patient carries emergency Epipen in right jacket pocket. History of sudden severe bronchospasm requiring nebulizer treatment.",
  avatarUrl:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
};

export default function MedicalInfoModal({
  visible,
  onClose,
  patientProfile = DEFAULT_PATIENT,
}: MedicalInfoModalProps) {
  const patient = patientProfile;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerBadgeRow}>
                <ShieldAlert size={20} color={ResQColors.primaryRedText} />
                <Text style={styles.headerTitle}>
                  Emergency Medical Profile
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={ResQColors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Patient Basic Card */}
              <View style={styles.patientProfileCard}>
                <Image
                  source={{ uri: patient.avatarUrl }}
                  style={styles.avatar}
                />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientMeta}>
                    {patient.age} yrs • {patient.gender}
                  </Text>
                  <View style={styles.bloodBadge}>
                    <Heart
                      size={12}
                      color={ResQColors.primaryRedText}
                      fill={ResQColors.primaryRedText}
                    />
                    <Text style={styles.bloodBadgeText}>
                      Blood Type: {patient.bloodType}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Critical Alert Warning Box */}
              <View style={styles.alertBox}>
                <AlertCircle
                  size={18}
                  color={ResQColors.primaryRedText}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertBoxTitle}>
                    CRITICAL MEDICAL WARNING
                  </Text>
                  <Text style={styles.alertBoxText}>
                    History of {patient.conditions.join(" & ")}. Ensure airway
                    is clear.
                  </Text>
                </View>
              </View>

              {/* Pre-Existing Conditions */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Activity
                    size={16}
                    color={ResQColors.primaryRedText}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sectionTitle}>
                    Pre-Existing Conditions
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  {patient.conditions.map((cond, idx) => (
                    <View key={idx} style={styles.conditionChip}>
                      <Text style={styles.conditionChipText}>{cond}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Known Allergies */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <AlertCircle
                    size={16}
                    color={ResQColors.orangeText}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sectionTitle}>Allergies</Text>
                </View>
                <View style={styles.chipRow}>
                  {patient.allergies.map((allergy, idx) => (
                    <View key={idx} style={styles.allergyChip}>
                      <Text style={styles.allergyChipText}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Current Medications */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Pill
                    size={16}
                    color={DESIGN_COLORS.tertiary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sectionTitle}>Current Medications</Text>
                </View>
                {patient.medications.map((med, idx) => (
                  <View key={idx} style={styles.medicationRow}>
                    <Text style={styles.medicationBullet}>•</Text>
                    <Text style={styles.medicationText}>{med}</Text>
                  </View>
                ))}
              </View>

              {/* Medical Notes */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <FileText
                    size={16}
                    color={ResQColors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sectionTitle}>
                    Responders Field Notes
                  </Text>
                </View>
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{patient.notes}</Text>
                </View>
              </View>

              {/* Emergency Contact */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Phone
                    size={16}
                    color={ResQColors.statusGreen}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sectionTitle}>Emergency Contact</Text>
                </View>
                <View style={styles.contactCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>
                      {patient.emergencyContact.name}
                    </Text>
                    <Text style={styles.contactRelation}>
                      {patient.emergencyContact.relationship}
                    </Text>
                  </View>
                  <View style={styles.phoneChip}>
                    <Text style={styles.phoneChipText}>
                      {patient.emergencyContact.phone}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.65)",
    justifyContent: "flex-end",
  },
  safeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: ResQColors.cardSurface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: ResQColors.borderSubtle,
  },
  headerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17.5,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ResQColors.cardSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingVertical: 16,
  },
  patientProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 14,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
  },
  patientMeta: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
    marginTop: 2,
  },
  bloodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    backgroundColor: ResQColors.primaryRedLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  bloodBadgeText: {
    fontSize: 12,
    fontFamily: typography.bold,
    color: ResQColors.primaryRedText,
  },
  alertBox: {
    flexDirection: "row",
    backgroundColor: ResQColors.primaryRedLight,
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  alertBoxTitle: {
    fontSize: 11.5,
    fontFamily: typography.bold,
    color: ResQColors.primaryRedText,
    letterSpacing: 0.5,
  },
  alertBoxText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: ResQColors.primaryRed,
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionChip: {
    backgroundColor: ResQColors.primaryRedLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
  },
  conditionChipText: {
    fontSize: 12.5,
    fontFamily: typography.semibold,
    color: ResQColors.primaryRedText,
  },
  allergyChip: {
    backgroundColor: ResQColors.orangeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  allergyChipText: {
    fontSize: 12.5,
    fontFamily: typography.semibold,
    color: ResQColors.orangeText,
  },
  medicationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  medicationBullet: {
    fontSize: 16,
    color: DESIGN_COLORS.tertiary,
    marginRight: 8,
  },
  medicationText: {
    fontSize: 13.5,
    fontFamily: typography.medium,
    color: ResQColors.textSecondary,
  },
  notesBox: {
    backgroundColor: ResQColors.inputSurface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: ResQColors.borderSubtle,
  },
  notesText: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: ResQColors.textSecondary,
    lineHeight: 19,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurfaceSoft,
    borderRadius: 16,
    padding: 12,
  },
  contactName: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
  },
  contactRelation: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
    marginTop: 2,
  },
  phoneChip: {
    backgroundColor: ResQColors.greenBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  phoneChipText: {
    fontSize: 12,
    fontFamily: typography.bold,
    color: ResQColors.greenText,
  },
});
