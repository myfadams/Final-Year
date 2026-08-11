import { getCurrentUser } from "@/backend/auth";
import {
  addTrustedContact,
  deleteTrustedContact,
  getTrustedContacts,
} from "@/backend/contacts";
import AddContactModal from "@/components/AddContactModal";
import EmergencyContactCard, {
  EmergencyContact,
} from "@/components/EmergencyContactCard";
import HeartBeatWave from "@/components/HeartBeatWave";
import NavHeader from "@/components/NavHeader";
import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { AlertCircle, Plus, Shield, Users } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EmergencyContactsPage = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const { user } = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        const { data, error } = await getTrustedContacts(user.id);
        if (error) {
          console.warn("Could not fetch trusted contacts:", error.message || error);
        }
        if (data) {
          const mapped: EmergencyContact[] = data.map((rec, index) => ({
            id: rec.id,
            name: rec.contact_name,
            phone: rec.contact_phone,
            relationship: rec.relationship || "Contact",
            isPrimary: index === 0,
          }));
          setContacts(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to fetch trusted contacts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async (newContactData: {
    name: string;
    phone: string;
    relationship: string;
  }): Promise<boolean> => {
    let currentUserId = userId;
    if (!currentUserId) {
      const { user } = await getCurrentUser();
      currentUserId = user?.id || null;
    }

    if (!currentUserId) {
      Alert.alert("Error", "User account not identified. Please try logging in again.");
      return false;
    }

    const { data, error } = await addTrustedContact(currentUserId, newContactData);
    if (error) {
      Alert.alert("Add Failed", error.message || "Could not save contact to database.");
      return false;
    }

    if (data) {
      const newContact: EmergencyContact = {
        id: data.id,
        name: data.contact_name,
        phone: data.contact_phone,
        relationship: data.relationship || "Contact",
        isPrimary: contacts.length === 0,
      };

      setContacts((prev) => [newContact, ...prev]);
      Alert.alert(
        "Contact Added",
        `${newContact.name} has been added to your emergency contacts.`
      );
      return true;
    }
    return false;
  };

  const handleRemoveContact = async (id: string) => {
    const target = contacts.find((c) => c.id === id);
    const { error } = await deleteTrustedContact(id);
    if (error) {
      Alert.alert("Delete Failed", error.message || "Failed to remove contact.");
      return;
    }

    setContacts((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      Alert.alert("Contact Removed", `${target.name} has been removed.`);
    }
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

        {/* Loading Indicator or Contacts List or Empty State */}
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <HeartBeatWave width={180} height={60} color={ResQColors.primaryRed} thickness={14} />
            <Text
              style={{
                marginTop: 12,
                fontSize: 14,
                fontFamily: typography.medium,
                color: "#64748B",
              }}
            >
              Loading emergency contacts...
            </Text>
          </View>
        ) : contacts.length > 0 ? (
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
