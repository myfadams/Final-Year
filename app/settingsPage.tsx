import { getCurrentUser, getUserProfile, UserProfile } from "@/backend/auth";
import { getMedicalInfo, saveMedicalInfo, MedicalDataState } from "@/backend/medical";
import CustomButton from "@/components/CustomButton";
import MedicalFieldItem from "@/components/MedicalFieldItem";
import NavHeader from "@/components/NavHeader";
import Colors, { ResQColors } from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import {
  Activity,
  AlertCircle,
  Droplet,
  FileText,
  GraduationCap,
  Hash,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Pill,
} from "lucide-react-native";
import { showPopupAlert } from "@/components/popupAlert";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

interface ProfileItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.iconContainer}>{icon}</View>
    <View style={styles.detailTextContainer}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const settingsPage = () => {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    globalState.userProfile
  );
  const [isLoadingMedical, setIsLoadingMedical] = useState<boolean>(true);
  const [isSavingMedical, setIsSavingMedical] = useState<boolean>(false);

  // Medical data initialized to empty strings
  const [medicalData, setMedicalData] = useState<MedicalDataState>({
    bloodGroup: "",
    allergies: "",
    medications: "",
    chronicConditions: "",
    emergencyNotes: "",
  });

  useEffect(() => {
    async function loadData() {
      setIsLoadingMedical(true);
      try {
        let currentUserId = globalState.userProfile?.id;
        if (!currentUserId) {
          const { user } = await getCurrentUser();
          if (user) {
            currentUserId = user.id;
            const { profile } = await getUserProfile(user.id);
            if (profile) {
              globalState.userProfile = profile;
              setUserProfile(profile);
            }
          }
        } else {
          setUserProfile(globalState.userProfile);
        }

        if (currentUserId) {
          const { data, error } = await getMedicalInfo(currentUserId);
          if (error) {
            console.warn("Could not fetch medical info:", error.message || error);
          }
          if (data) {
            setMedicalData({
              bloodGroup: data.blood_group || "",
              allergies: data.allergies || "",
              medications: data.medications || "",
              chronicConditions: data.chronic_conditions || "",
              emergencyNotes: data.emergency_notes || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed loading profile / medical info in settingsPage:", err);
      } finally {
        setIsLoadingMedical(false);
      }
    }
    loadData();
  }, []);

  const handleSaveMedicalInfo = async () => {
    let userId = userProfile?.id || globalState.userProfile?.id;
    if (!userId) {
      const { user } = await getCurrentUser();
      userId = user?.id;
    }

    if (!userId) {
      showPopupAlert("Error", "Unable to identify current user. Please log in again.", undefined, undefined, "error");
      return;
    }

    setIsSavingMedical(true);
    try {
      const { data, error } = await saveMedicalInfo(userId, medicalData);
      if (error) {
        showPopupAlert(
          "Save Failed",
          error.message || "Could not save medical info to database.",
          undefined,
          undefined,
          "error"
        );
      } else {
        showPopupAlert(
          "Saved",
          "Medical information has been saved successfully!",
          undefined,
          undefined,
          "success"
        );
        if (data) {
          setMedicalData({
            bloodGroup: data.blood_group || "",
            allergies: data.allergies || "",
            medications: data.medications || "",
            chronicConditions: data.chronic_conditions || "",
            emergencyNotes: data.emergency_notes || "",
          });
        }
      }
    } catch (err: any) {
      showPopupAlert("Save Failed", err?.message || "An unexpected error occurred.", undefined, undefined, "error");
    } finally {
      setIsSavingMedical(false);
    }
  };

  const isMedicalDisabled = isSavingMedical || isLoadingMedical;

  return (
    <SafeAreaView style={styles.safeArea}>
      <NavHeader title="Personal & Medical Information" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Safety Stats Section */}
          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {userProfile?.is_verified ? "Verified" : "Active"}
              </Text>
              <Text style={styles.statLabel}>Security Status</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>Trusted Contacts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Alerts Sent</Text>
            </View>
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {userProfile?.name ? `${userProfile.name}'s Personal Info` : "Personal Information"}
            </Text>
            <View style={styles.card}>
              <ProfileItem
                icon={<IdCard size={20} color={Colors.light.primary} />}
                label="Student ID"
                value={userProfile?.student_id_number || "Not set"}
              />
              <View style={styles.rowDivider} />
              <ProfileItem
                icon={<Hash size={20} color={Colors.light.primary} />}
                label="Reference Number"
                value={userProfile?.student_reference_number || "Not set"}
              />
              <View style={styles.rowDivider} />
              <ProfileItem
                icon={<GraduationCap size={20} color={Colors.light.primary} />}
                label="Program of Study"
                value={userProfile?.program_of_study || "Not set"}
              />
              <View style={styles.rowDivider} />
              <ProfileItem
                icon={<Mail size={20} color={Colors.light.primary} />}
                label="Email Address"
                value={userProfile?.email || "Not set"}
              />
              <View style={styles.rowDivider} />
              <ProfileItem
                icon={<Phone size={20} color={Colors.light.primary} />}
                label="Phone Number"
                value={userProfile?.phone || "Not set"}
              />
              <View style={styles.rowDivider} />
              <ProfileItem
                icon={<MapPin size={20} color={Colors.light.primary} />}
                label={userProfile?.location_type || "Residential Address"}
                value={userProfile?.address || "Not set"}
              />
            </View>
          </View>

          {/* Medical Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Information</Text>

            <MedicalFieldItem
              label="Blood Group / Type"
              value={medicalData.bloodGroup}
              placeholder={isLoadingMedical ? "Loading..." : "e.g. O+, A-, B+"}
              icon={<Droplet size={16} color={ResQColors.primaryRed} />}
              disabled={isMedicalDisabled}
              onChangeText={(text) =>
                setMedicalData((prev) => ({ ...prev, bloodGroup: text }))
              }
            />

            <MedicalFieldItem
              label="Allergies"
              value={medicalData.allergies}
              placeholder={isLoadingMedical ? "Loading..." : "e.g. Penicillin, Peanuts, Latex"}
              icon={<AlertCircle size={16} color={ResQColors.primaryRed} />}
              disabled={isMedicalDisabled}
              onChangeText={(text) =>
                setMedicalData((prev) => ({ ...prev, allergies: text }))
              }
            />

            <MedicalFieldItem
              label="Current Medications"
              value={medicalData.medications}
              placeholder={isLoadingMedical ? "Loading..." : "e.g. Inhaler, Insulin, Antihistamines"}
              icon={<Pill size={16} color={ResQColors.primaryRed} />}
              disabled={isMedicalDisabled}
              onChangeText={(text) =>
                setMedicalData((prev) => ({ ...prev, medications: text }))
              }
            />

            <MedicalFieldItem
              label="Chronic Conditions & Health Notes"
              value={medicalData.chronicConditions}
              placeholder={isLoadingMedical ? "Loading..." : "e.g. Asthma, Diabetes, Epilepsy"}
              icon={<Activity size={16} color={ResQColors.primaryRed} />}
              disabled={isMedicalDisabled}
              onChangeText={(text) =>
                setMedicalData((prev) => ({ ...prev, chronicConditions: text }))
              }
              multiline={true}
            />

            <MedicalFieldItem
              label="Emergency Notes for Responders"
              value={medicalData.emergencyNotes}
              placeholder={isLoadingMedical ? "Loading..." : "e.g. Special emergency medical instructions"}
              icon={<FileText size={16} color={ResQColors.primaryRed} />}
              disabled={isMedicalDisabled}
              onChangeText={(text) =>
                setMedicalData((prev) => ({ ...prev, emergencyNotes: text }))
              }
              multiline={true}
            />

            {/* Save Medical Info Button */}
            <View style={{ marginTop: 14, marginBottom: 12 }}>
              <CustomButton
                text="Save Medical Info"
                onPress={handleSaveMedicalInfo}
                isLoading={isSavingMedical}
                disabled={isMedicalDisabled}
                color={ResQColors.primaryRed}
                textColor="#FFFFFF"
              />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: ResQColors.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: ResQColors.border,
    alignSelf: "center",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ResQColors.avatarTeal,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: Colors.light.text,
  },
  rowDivider: {
    height: 1,
    backgroundColor: ResQColors.border,
    marginLeft: 48,
  },
});

export default settingsPage;
