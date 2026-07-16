import HomeTabBar from "@/components/HomeTabBar";
import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import {
  MessageCircle,
  Phone,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Contact interface
interface Contact {
  id: string;
  initials: string;
  name: string;
  relationship: string;
  status: "Available" | "Away" | "Offline";
  statusColor: string;
  avatarColor: string;
  avatarTextColor: string;
}

export default function ContactsScreen() {
  const router = useRouter();

  // Initial list of trusted contacts
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "1",
      initials: "KC",
      name: "Karen Castillo",
      relationship: "Roommate",
      status: "Available",
      statusColor: "#22C55E",
      avatarColor: "#FF6B6B",
      avatarTextColor: "#FFFFFF",
    },
    {
      id: "2",
      initials: "AT",
      name: "Alex Tan",
      relationship: "RA (Republic Hall)",
      status: "Away",
      statusColor: "#F59E0B",
      avatarColor: "#4ECDC4",
      avatarTextColor: "#0F766E",
    },
    {
      id: "3",
      initials: "CS",
      name: "Campus Security",
      relationship: "Official Safety Dispatch",
      status: "Available",
      statusColor: "#22C55E",
      avatarColor: "#3B7597",
      avatarTextColor: "#FFFFFF",
    },
    {
      id: "4",
      initials: "MS",
      name: "Maria Santos",
      relationship: "Academic Advisor",
      status: "Offline",
      statusColor: "#9CA3AF",
      avatarColor: "#A78BFA",
      avatarTextColor: "#FFFFFF",
    },
  ]);

  // Modal and form states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [newStatus, setNewStatus] = useState<"Available" | "Away" | "Offline">(
    "Available",
  );

  const handleCallPress = (name: string) => {
    Alert.alert(
      "Emergency Call",
      `Initiating direct emergency call to ${name}...`,
    );
  };

  const handleChatPress = (name: string) => {
    Alert.alert(
      "Emergency Chat",
      `Opening rapid secure chat channel with ${name}...`,
    );
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const handleAddContact = () => {
    if (!newName.trim() || !newRelationship.trim()) {
      Alert.alert("Input Required", "Please provide a name and relationship.");
      return;
    }

    const randomColors = [
      { bg: "#F87171", text: "#FFFFFF" },
      { bg: "#60A5FA", text: "#FFFFFF" },
      { bg: "#34D399", text: "#111827" },
      { bg: "#FBBF24", text: "#78350F" },
      { bg: "#C084FC", text: "#FFFFFF" },
      { bg: "#F472B6", text: "#FFFFFF" },
    ];
    const colorPair =
      randomColors[Math.floor(Math.random() * randomColors.length)];

    const statusColors = {
      Available: "#22C55E",
      Away: "#F59E0B",
      Offline: "#9CA3AF",
    };

    const newContact: Contact = {
      id: Date.now().toString(),
      initials: getInitials(newName),
      name: newName,
      relationship: newRelationship,
      status: newStatus,
      statusColor: statusColors[newStatus],
      avatarColor: colorPair.bg,
      avatarTextColor: colorPair.text,
    };

    setContacts((prev) => [...prev, newContact]);
    setNewName("");
    setNewRelationship("");
    setNewStatus("Available");
    setAddModalVisible(false);
    Alert.alert(
      "Success",
      `${newName} has been added to your Trusted Contacts.`,
    );
  };

  const handleDeleteContact = (id: string, name: string) => {
    Alert.alert(
      "Remove Contact",
      `Are you sure you want to remove ${name} from your trusted emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setContacts((prev) => prev.filter((c) => c.id !== id));
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header Navigation */}
      <HomeTabBar pageTitle="Contacts" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoBanner}>
          <UserCheck size={18} color="#1E40AF" />
          <Text style={styles.infoText}>
            These contacts will be notified instantly if you trigger Emergency
            Mode / SOS broadcast.
          </Text>
        </View>

        {/* Contacts List Card */}
        <View style={styles.contactsCard}>
          {contacts.map((contact, idx) => (
            <View key={contact.id}>
              <View style={styles.contactRowItem}>
                {/* Avatar Wrapper */}
                <View style={styles.avatarWrapper}>
                  <View
                    style={[
                      styles.avatarBox,
                      { backgroundColor: contact.avatarColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        { color: contact.avatarTextColor },
                      ]}
                    >
                      {contact.initials}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: contact.statusColor },
                    ]}
                  />
                </View>

                {/* Info Wrapper */}
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelationship}>
                    {contact.relationship}
                  </Text>
                  <Text
                    style={[styles.statusText, { color: contact.statusColor }]}
                  >
                    {contact.status}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => handleChatPress(contact.name)}
                    style={styles.actionCircleButton}
                  >
                    <MessageCircle size={18} color={ResQColors.teal} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleCallPress(contact.name)}
                    style={styles.actionCircleButton}
                  >
                    <Phone size={18} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      handleDeleteContact(contact.id, contact.name)
                    }
                    style={[
                      styles.actionCircleButton,
                      styles.deleteActionButton,
                    ]}
                  >
                    <X size={16} color={ResQColors.red} />
                  </TouchableOpacity>
                </View>
              </View>
              {idx < contacts.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Add Contact Trigger Button */}
        <TouchableOpacity
          onPress={() => setAddModalVisible(true)}
          style={styles.primaryAddButton}
          activeOpacity={0.8}
        >
          <UserPlus size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryAddButtonText}>Add Emergency Contact</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Contact Modal Form */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={22} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                placeholder="e.g. Officer Koomson, Roommate Alex"
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Relationship</Text>
              <TextInput
                placeholder="e.g. Brother, Roommate, Campus Safety"
                value={newRelationship}
                onChangeText={setNewRelationship}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Initial Availability Status</Text>
              <View style={styles.statusOptions}>
                {(["Available", "Away", "Offline"] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOptionButton,
                      newStatus === status && styles.statusOptionButtonSelected,
                    ]}
                    onPress={() => setNewStatus(status)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        newStatus === status && styles.statusOptionTextSelected,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleAddContact}
                style={styles.saveButton}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Add Contact</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 20,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  addButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 110, //note
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12.5,
    fontFamily: typography.medium,
    color: "#1E40AF",
    flex: 1,
    lineHeight: 16,
  },
  contactsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  contactRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: typography.bold,
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 14.5,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  contactRelationship: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  statusText: {
    fontSize: 10.5,
    fontFamily: typography.bold,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  deleteActionButton: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  primaryAddButton: {
    flexDirection: "row",
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryAddButtonText: {
    fontSize: 15,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  modalForm: {
    paddingTop: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: Colors.light.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: typography.regular,
    color: Colors.light.text,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  statusOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 8,
  },
  statusOptionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  statusOptionButtonSelected: {
    borderColor: Colors.light.accent,
    backgroundColor: ResQColors.tealLight,
  },
  statusOptionText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
  },
  statusOptionTextSelected: {
    color: ResQColors.tealDark,
    fontFamily: typography.semibold,
  },
  saveButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
});
