import Contacts from "@/components/Contacts";
import HomeTabBar from "@/components/HomeTabBar";
import Colors, {
  randomColors,
  ResQColors,
  statusColors,
} from "@/constants/Colors";
import { ContactsProp } from "@/constants/interfaces";
import { contactsData } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import { Info, UserPlus, X } from "lucide-react-native";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Initial list of trusted contacts matching the mockup design
  const [contacts, setContacts] = useState<ContactsProp[]>(contactsData);

  // Modal and form states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [newStatus, setNewStatus] = useState<"Available" | "Away" | "Offline">(
    "Available",
  );
  const [newCategory, setNewCategory] = useState<
    "Family & Friends" | "Campus & Professional"
  >("Family & Friends");

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

    const colorPair =
      randomColors[Math.floor(Math.random() * randomColors.length)];

    const newContact: ContactsProp = {
      id: Date.now().toString(),
      initials: getInitials(newName),
      name: newName,
      relationship: newRelationship,
      status: newStatus,
      statusColor: statusColors[newStatus],
      avatarColor: colorPair.bg,
      avatarTextColor: colorPair.text,
      category: newCategory,
      verified: newCategory === "Campus & Professional", // default to verified if campus/pro
      hasMessage: true,
      hasLeftAccent: false,
    };

    setContacts((prev) => [...prev, newContact]);
    setNewName("");
    setNewRelationship("");
    setNewStatus("Available");
    setNewCategory("Family & Friends");
    setAddModalVisible(false);
    Alert.alert(
      "Success",
      `${newName} has been added to your Trusted Contacts.`,
    );
  };

  const handleDeleteContact = (id: string | number, name: string) => {
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

  const familyContacts = contacts.filter(
    (c) => !c.category || c.category === "Family & Friends",
  );
  const professionalContacts = contacts.filter(
    (c) => c.category === "Campus & Professional",
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header Navigation */}
      <HomeTabBar pageTitle="Contacts" activePage="Contacts" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 150 + insets.bottom },
        ]}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconCircle}>
            <Info size={13} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.infoText}>
            These contacts will be notified instantly if you trigger Emergency
            Mode / SOS broadcast.
          </Text>
        </View>

        {/* Family & Friends Section */}
        {familyContacts.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Family & Friends</Text>
            {familyContacts.map((contact, idx) => (
              <Contacts
                id={contact.id}
                avatarColor={contact.avatarColor}
                idx={idx}
                name={contact.name}
                initials={contact.initials}
                status={contact.status}
                avatarTextColor={contact.avatarTextColor}
                relationship={contact.relationship}
                statusColor={contact.statusColor}
                category={contact.category}
                verified={contact.verified}
                hasLeftAccent={contact.hasLeftAccent}
                hasMessage={contact.hasMessage}
                handleCallPress={handleCallPress}
                handleChatPress={handleChatPress}
                handleDeleteContact={handleDeleteContact}
                key={contact.id}
              />
            ))}
          </View>
        )}

        {/* Campus & Professional Section */}
        {professionalContacts.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 12 }]}>
            <Text style={styles.sectionHeader}>Campus & Professional</Text>
            {professionalContacts.map((contact, idx) => (
              <Contacts
                id={contact.id}
                avatarColor={contact.avatarColor}
                idx={idx}
                name={contact.name}
                initials={contact.initials}
                status={contact.status}
                avatarTextColor={contact.avatarTextColor}
                relationship={contact.relationship}
                statusColor={contact.statusColor}
                category={contact.category}
                verified={contact.verified}
                hasLeftAccent={contact.hasLeftAccent}
                hasMessage={contact.hasMessage}
                handleCallPress={handleCallPress}
                handleChatPress={handleChatPress}
                handleDeleteContact={handleDeleteContact}
                key={contact.id}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Contact Button (Circular FAB with only UserPlus icon) */}
      <TouchableOpacity
        onPress={() => setAddModalVisible(true)}
        style={[styles.floatingAddButton, { bottom: 72 + insets.bottom + 20 }]}
        activeOpacity={0.8}
      >
        <UserPlus size={24} color="#FFFFFF" />
      </TouchableOpacity>

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

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.statusOptions}>
                {(["Family & Friends", "Campus & Professional"] as const).map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.statusOptionButton,
                        newCategory === cat &&
                          styles.statusOptionButtonSelected,
                      ]}
                      onPress={() => setNewCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          newCategory === cat &&
                            styles.statusOptionTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

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
    backgroundColor: Colors.light.background,
  },
  customHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.light.background,
  },
  headerButton: {
    padding: 6,
    position: "relative",
  },
  headerBellBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
    borderWidth: 1.5,
    borderColor: Colors.light.background,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  headerTitleText: {
    fontSize: 24,
    fontFamily: typography.bold,
    color: "#000000",
  },
  headerTitleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
    marginLeft: 2,
    marginBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 170,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#EEF1FC",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  infoIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.light.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: "#4B5563",
    flex: 1,
    lineHeight: 18,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12.5,
    fontFamily: typography.bold,
    color: "#78716C",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  floatingAddButton: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "85%",
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
    fontSize: 18,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  modalForm: {
    paddingTop: 20,
  },
  inputLabel: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    fontFamily: typography.regular,
    color: Colors.light.text,
    marginBottom: 20,
    backgroundColor: "#F9FAFB",
  },
  statusOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  statusOptionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
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
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
});
