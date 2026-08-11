import AddNetworkMemberModal from "@/components/AddNetworkMemberModal";
import NavHeader from "@/components/NavHeader";
import SafetyCircleMemberCard from "@/components/SafetyCircleMemberCard";
import Colors, { ResQColors } from "@/constants/Colors";
import { ContactsProp } from "@/constants/interfaces";
import { DEFAULT_CONTACTS } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import {
  AlertCircle,
  Plus,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SafetyCirclesPage = () => {
  const [appContacts, setAppContacts] =
    useState<ContactsProp[]>(DEFAULT_CONTACTS);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Active Safety Circle members derived from app contacts
  const activeCircleMembers = appContacts.filter((c) => c.isTrustedNetwork);

  // Toggle member's trusted network status (adds or removes)
  const handleToggleMember = (id: string | number) => {
    setAppContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isTrustedNetwork: !c.isTrustedNetwork } : c))
    );

    // Sync in global DEFAULT_CONTACTS array
    const target = DEFAULT_CONTACTS.find((c) => c.id === id);
    if (target) {
      target.isTrustedNetwork = !target.isTrustedNetwork;
    }
  };

  // Remove member directly from active list
  const handleRemoveMember = (id: string | number) => {
    setAppContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isTrustedNetwork: false } : c))
    );

    const target = DEFAULT_CONTACTS.find((c) => c.id === id);
    if (target) {
      target.isTrustedNetwork = false;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <NavHeader title="Safety Circles & Network" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Information Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.bannerIconWrapper}>
            <Users size={22} color={ResQColors.primaryRed} />
          </View>
          <View style={styles.bannerTextWrapper}>
            <Text style={styles.bannerTitle}>Trusted Network & Safety Circles</Text>
            <Text style={styles.bannerDescription}>
              People in this network will be notified in case of any emergency,
              and members in these networks share live status updates during
              critical incidents.
            </Text>
          </View>
        </View>

        {/* Protection Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.activeBadge}>
              <View style={styles.activePulseDot} />
              <Text style={styles.activeBadgeText}>ACTIVE NETWORK</Text>
            </View>
            <View style={styles.statusPill}>
              <Radio size={12} color="#16A34A" />
              <Text style={styles.statusPillText}>Live Sync</Text>
            </View>
          </View>

          <Text style={styles.overviewTitle}>
            {activeCircleMembers.length} Active Circle{" "}
            {activeCircleMembers.length === 1 ? "Member" : "Members"}
          </Text>
          <Text style={styles.overviewSubtitle}>
            Your emergency beacon is broadcast live to all members in your
            safety circle when an alert is triggered.
          </Text>
        </View>

        {/* Section Header & Add Button */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <ShieldCheck size={18} color="#0F172A" />
            <Text style={styles.sectionTitle}>
              Network Members ({activeCircleMembers.length})
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAddModalVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Add Network Member"
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Member List or Empty State */}
        {activeCircleMembers.length > 0 ? (
          activeCircleMembers.map((item) => (
            <SafetyCircleMemberCard
              key={item.id}
              member={item}
              onRemove={handleRemoveMember}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <AlertCircle size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>Your Safety Circle is Empty</Text>
            <Text style={styles.emptyDescription}>
              Add trusted roommates, floor reps, or campus peers from your
              connected contacts to receive emergency alerts.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setIsAddModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddButtonText}>
                Add Members from Contacts
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Member Modal Component (Connected Contacts Picker) */}
      <AddNetworkMemberModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        allContacts={appContacts}
        onToggleMember={handleToggleMember}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  bannerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  bannerTextWrapper: {
    flex: 1,
    gap: 3,
  },
  bannerTitle: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: "#991B1B",
  },
  bannerDescription: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: "#7F1D1D",
    lineHeight: 18,
  },
  overviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: typography.bold,
    color: "#15803D",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: "#475569",
  },
  overviewTitle: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: "#0F172A",
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: "#64748B",
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.primaryRed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: ResQColors.primaryRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: "#334155",
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.primaryRed,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  emptyAddButtonText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
});

export default SafetyCirclesPage;
