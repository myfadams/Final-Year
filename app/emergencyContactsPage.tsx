import AddContactModal from "@/components/AddContactModal";
import EmergencyContactCard, {
  EmergencyContact,
} from "@/components/EmergencyContactCard";
import NavHeader from "@/components/NavHeader";
import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { AlertCircle, Plus, Shield, Users } from "lucide-react-native";
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

// Initial default emergency contacts for demonstration
const INITIAL_CONTACTS: EmergencyContact[] = [
  {
    id: "1",
    name: "Eleanor Vance (Mother)",
    phone: "+233 24 999 8888",
    relationship: "Mother",
    isPrimary: true,
  },
  {
    id: "2",
    name: "Marcus Vance (Father)",
    phone: "+233 20 111 2222",
    relationship: "Father",
    isPrimary: false,
  },
  {
    id: "3",
    name: "Kofi Owusu",
    phone: "+233 55 444 3333",
    relationship: "Roommate",
    isPrimary: false,
  },
];

const EmergencyContactsPage = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>(INITIAL_CONTACTS);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const handleAddContact = (newContactData: {
    name: string;
    phone: string;
    relationship: string;
  }) => {
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContactData.name,
      phone: newContactData.phone,
      relationship: newContactData.relationship,
      isPrimary: contacts.length === 0, // First contact becomes primary automatically
    };

    setContacts((prev) => [newContact, ...prev]);
    Alert.alert(
      "Contact Added",
      `${newContact.name} has been added to your emergency contacts.`
    );
  };

  const handleRemoveContact = (id: string) => {
    setContacts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <NavHeader title="Emergency Contacts" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Information Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.bannerIconWrapper}>
            <Shield size={22} color={ResQColors.primaryRed} />
          </View>
          <View style={styles.bannerTextWrapper}>
            <Text style={styles.bannerTitle}>Emergency Contacts Info</Text>
            <Text style={styles.bannerDescription}>
              These contacts will be provided to first responders and emergency
              personnel attending to you in the event of an emergency.
            </Text>
          </View>
        </View>

        {/* Section Header & Add Button */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Users size={18} color="#0F172A" />
            <Text style={styles.sectionTitle}>
              Saved Contacts ({contacts.length})
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAddModalVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Add Emergency Contact"
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Add Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Contacts List or Empty State */}
        {contacts.length > 0 ? (
          contacts.map((item) => (
            <EmergencyContactCard
              key={item.id}
              contact={item}
              onRemove={handleRemoveContact}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <AlertCircle size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Emergency Contacts Saved</Text>
            <Text style={styles.emptyDescription}>
              Add trusted contacts who will be reached by emergency responders
              attending to you in the event of an emergency.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setIsAddModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddButtonText}>
                Add Your First Emergency Contact
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Contact Modal Component */}
      <AddContactModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAddContact={handleAddContact}
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
    marginBottom: 20,
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

export default EmergencyContactsPage;
