import { getCurrentUser, getUserProfile, UserProfile } from "@/backend/auth";
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
import React, { useEffect, useState } from "react";
import {
  Alert,
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

interface MedicalData {
  bloodGroup: string;
  allergies: string;
  medications: string;
  chronicConditions: string;
  emergencyNotes: string;
}

const settingsPage = () => {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    globalState.userProfile
  );
  const [isSavingMedical, setIsSavingMedical] = useState(false);

  // Medical data stored as an object
  const [medicalData, setMedicalData] = useState<MedicalData>({
    bloodGroup: "O+",
    allergies: "Penicillin, Peanuts",
    medications: "Asthma Inhaler (Ventolin)",
    chronicConditions: "Mild Asthma",
    emergencyNotes: "Primary Emergency Contact: Mother (+233 24 999 8888)",
  });

  useEffect(() => {
    async function loadUserProfile() {
      if (globalState.userProfile) {
        setUserProfile(globalState.userProfile);
      } else {
        try {
          const { user } = await getCurrentUser();
          if (user) {
            const { profile } = await getUserProfile(user.id);
            if (profile) {
              globalState.userProfile = profile;
              setUserProfile(profile);
            }
          }
        } catch (err) {
          console.error("Failed to load user profile in settingsPage:", err);
        }
      }
    }
    loadUserProfile();
  }, []);

  const handleSaveMedicalInfo = () => {
    setIsSavingMedical(true);
    setTimeout(() => {
      setIsSavingMedical(false);
      Alert.alert(
        "Saved",
        "Medical information has been saved successfully!"
      );
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <NavHeader title="Personal & Medical Information" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            placeholder="e.g. O+, A-, B+"
            icon={<Droplet size={16} color={ResQColors.primaryRed} />}
            onChangeText={(text) =>
              setMedicalData((prev) => ({ ...prev, bloodGroup: text }))
            }
          />

          <MedicalFieldItem
            label="Allergies"
            value={medicalData.allergies}
            placeholder="e.g. Penicillin, Peanuts, Latex"
            icon={<AlertCircle size={16} color={ResQColors.primaryRed} />}
            onChangeText={(text) =>
              setMedicalData((prev) => ({ ...prev, allergies: text }))
            }
          />

          <MedicalFieldItem
            label="Current Medications"
            value={medicalData.medications}
            placeholder="e.g. Inhaler, Insulin, Antihistamines"
            icon={<Pill size={16} color={ResQColors.primaryRed} />}
            onChangeText={(text) =>
              setMedicalData((prev) => ({ ...prev, medications: text }))
            }
          />

          <MedicalFieldItem
            label="Chronic Conditions & Health Notes"
            value={medicalData.chronicConditions}
            placeholder="e.g. Asthma, Diabetes, Epilepsy"
            icon={<Activity size={16} color={ResQColors.primaryRed} />}
            onChangeText={(text) =>
              setMedicalData((prev) => ({ ...prev, chronicConditions: text }))
            }
            multiline={true}
          />

          <MedicalFieldItem
            label="Emergency Notes for Responders"
            value={medicalData.emergencyNotes}
            placeholder="e.g. Special emergency medical instructions"
            icon={<FileText size={16} color={ResQColors.primaryRed} />}
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
              color={ResQColors.primaryRed}
              textColor="#FFFFFF"
            />
          </View>
        </View>

      </ScrollView>
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
