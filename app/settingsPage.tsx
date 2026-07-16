import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import {
    ChevronRight,
    GraduationCap,
    Heart,
    IdCard,
    LogOut,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
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
  const [contacts, setContacts] = useState([
    { name: "Meme (Mother)", phone: "+233 24 999 8888", color: "#FF6B6B" },
    { name: "Here (Roommate)", phone: "+233 50 111 2222", color: "#3B7597" },
  ]);

  const handleLogout = () => {
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>GA</Text>
            </View>
            <View style={styles.badge}>
              <ShieldCheck size={16} color="#fff" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={styles.userName}>George Adams</Text>
          <View style={styles.verifiedRow}>
            <Text style={styles.verifiedText}>Verified Resident</Text>
          </View>
        </View>

        {/* Safety Stats Section */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>Active</Text>
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

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.card}>
            <ProfileItem
              icon={<IdCard size={20} color={Colors.light.primary} />}
              label="Student ID"
              value="3364622"
            />
            <View style={styles.rowDivider} />
            <ProfileItem
              icon={<GraduationCap size={20} color={Colors.light.primary} />}
              label="Program of Study"
              value="B.Sc. Computer Science"
            />
            <View style={styles.rowDivider} />
            <ProfileItem
              icon={<Mail size={20} color={Colors.light.primary} />}
              label="University Email"
              value="george.resq@knust.edu.gh"
            />
            <View style={styles.rowDivider} />
            <ProfileItem
              icon={<Phone size={20} color={Colors.light.primary} />}
              label="Phone Number"
              value="+233 24 123 4567"
            />
            <View style={styles.rowDivider} />
            <ProfileItem
              icon={<MapPin size={20} color={Colors.light.primary} />}
              label="Residential Address"
              value="Paradise Regained Hostel, Room 304"
            />
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Trusted Responders</Text>
            <TouchableOpacity
              onPress={() => router.navigate("/(resident)/home")}
            >
              <Text style={styles.sectionLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.contactsContainer}>
            {contacts.map((contact, idx) => (
              <View key={idx} style={styles.contactCard}>
                <View style={styles.contactLeft}>
                  <View
                    style={[
                      styles.contactAvatar,
                      { backgroundColor: contact.color },
                    ]}
                  >
                    <Heart size={16} color="#fff" fill="#fff" />
                  </View>
                  <View>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.light.textMuted} />
              </View>
            ))}
          </View>
        </View>

        {/* Actions / Settings */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
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
  header: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: ResQColors.border,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontFamily: typography.bold,
  },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.success,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 22,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ResQColors.greenBorder,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: ResQColors.greenDark,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -16,
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionLink: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: Colors.light.accent,
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
  contactsContainer: {
    gap: 8,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
  contactLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
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
  },
  actionContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: Colors.light.error,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 2,
    shadowColor: Colors.light.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: typography.semibold,
  },
});

export default settingsPage;
