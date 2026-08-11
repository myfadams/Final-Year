import AnotherNavBarHeader from "@/components/AnotherNavBarHeader";
import Contacts from "@/components/Contacts";
import { ResQColors } from "@/constants/Colors";
import { ContactsProp } from "@/constants/interfaces";
import { DEFAULT_CONTACTS } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import {
  Building2,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Image,
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

  // Category and Search filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Contacts list initialized from centralized tempData
  const [contacts, setContacts] = useState<ContactsProp[]>(DEFAULT_CONTACTS);

  // Add Contact Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCategory, setNewCategory] = useState<
    "Family" | "Office" | "Friend" | "Campus"
  >("Family");

  const handleCallPress = (name: string) => {
    Alert.alert("Emergency Call", `Initiating direct call to ${name}...`);
  };

  const handleChatPress = (name: string, contactObj?: any) => {
    router.push({
      pathname: "/contactChat",
      params: {
        mode: "contact",
        contactId: contactObj?.id || "1",
        name: contactObj?.name || name,
        relationship: contactObj?.relationship || "Contact",
        phone: contactObj?.phone || "+44 999 999 999",
        avatarUrl: contactObj?.avatarUrl,
      },
    });
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const handleAddContact = () => {
    if (!newName.trim()) {
      Alert.alert("Input Required", "Please enter a contact name.");
      return;
    }

    const newContact: ContactsProp = {
      id: Date.now().toString(),
      initials: getInitials(newName),
      name: newName,
      phone: newPhone.trim() || "+44 999 999 999",
      relationship: newCategory,
      badgeType: newCategory,
      status: "Available",
      statusColor: ResQColors.statusGreen,
      avatarColor: ResQColors.primaryRed,
      avatarTextColor: "#FFFFFF",
      category:
        newCategory === "Office" || newCategory === "Campus"
          ? "Campus & Professional"
          : "Family & Friends",
    };

    setContacts((prev) => [...prev, newContact]);
    setNewName("");
    setNewPhone("");
    setNewCategory("Family");
    setAddModalVisible(false);
    Alert.alert("Success", `${newName} has been added to your contacts.`);
  };

  const handleDeleteContact = (id: string | number, name: string) => {
    Alert.alert("Remove Contact", `Are you sure you want to remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setContacts((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  // Derive category specific lists dynamically from contacts state
  const familyContacts = contacts.filter(
    (c) =>
      (c.badgeType && c.badgeType.toLowerCase() === "family") ||
      (c.relationship && c.relationship.toLowerCase().includes("family")),
  );

  const officeContacts = contacts.filter(
    (c) =>
      (c.badgeType &&
        (c.badgeType.toLowerCase() === "office" ||
          c.badgeType.toLowerCase() === "work")) ||
      (c.relationship &&
        (c.relationship.toLowerCase().includes("office") ||
          c.relationship.toLowerCase().includes("work") ||
          c.relationship.toLowerCase().includes("academic") ||
          c.relationship.toLowerCase().includes("ra"))),
  );

  // Filter contacts by selected category and search query
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.relationship.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery));

    const matchesCategory =
      selectedCategory === "All" ||
      (c.badgeType &&
        c.badgeType.toLowerCase() === selectedCategory.toLowerCase()) ||
      (c.relationship &&
        c.relationship.toLowerCase().includes(selectedCategory.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  // Helper to render dynamic mini avatar stack for a community section
  const renderAvatarStack = (categoryContacts: ContactsProp[]) => {
    const totalCount = categoryContacts.length;
    const maxVisible = 2;
    const visibleContacts = categoryContacts.slice(0, maxVisible);
    const overflowCount = totalCount > maxVisible ? totalCount - maxVisible : 0;

    if (totalCount === 0) {
      return (
        <View style={styles.avatarStackRow}>
          <View style={styles.miniAvatarBadge}>
            <Text style={styles.miniBadgeText}>0</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.avatarStackRow}>
        {visibleContacts.map((contact, i) => (
          <React.Fragment key={contact.id}>
            {contact.avatarUrl ? (
              <Image
                source={{ uri: contact.avatarUrl }}
                style={[styles.miniAvatarImage, i > 0 && { marginLeft: -8 }]}
              />
            ) : (
              <View
                style={[
                  styles.miniAvatarBox,
                  { backgroundColor: contact.avatarColor || ResQColors.pinkBg },
                  i > 0 && { marginLeft: -8 },
                ]}
              >
                <Text
                  style={[
                    styles.miniAvatarText,
                    { color: contact.avatarTextColor || ResQColors.pinkText },
                  ]}
                >
                  {contact.initials}
                </Text>
              </View>
            )}
          </React.Fragment>
        ))}

        {overflowCount > 0 && (
          <View style={[styles.miniAvatarBadge, { marginLeft: -8 }]}>
            <Text style={styles.miniBadgeText}>+{overflowCount}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header Navigation */}
      <AnotherNavBarHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
      >
        {/* Page Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.subTitleText}>Address Book</Text>
          <Text style={styles.mainTitleText}>Contacts</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Search size={20} color={ResQColors.textFaint} />
          <TextInput
            placeholder="Search contacts..."
            placeholderTextColor={ResQColors.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* My Communities Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>MY COMMUNITIES</Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory("All");
              setSearchQuery("");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.communitiesRow}>
          {/* Family Card */}
          <TouchableOpacity
            style={[
              styles.communityCard,
              {
                borderColor:
                  selectedCategory === "Family"
                    ? ResQColors.pinkText
                    : ResQColors.pinkBg,
              },
              selectedCategory === "Family" && styles.communityCardActive,
            ]}
            activeOpacity={0.8}
            onPress={() =>
              setSelectedCategory((prev) =>
                prev === "Family" ? "All" : "Family",
              )
            }
          >
            <View
              style={[
                styles.communityIconBadge,
                { backgroundColor: ResQColors.pinkBg },
              ]}
            >
              <Users size={22} color={ResQColors.pinkText} />
            </View>
            <Text style={styles.communityCardTitle}>Family</Text>
            <Text style={styles.communityCountSubtext}>
              {familyContacts.length}{" "}
              {familyContacts.length === 1 ? "contact" : "contacts"}
            </Text>

            {/* Dynamic Avatar Stack */}
            {renderAvatarStack(familyContacts)}
          </TouchableOpacity>

          {/* Office Staff Card */}
          <TouchableOpacity
            style={[
              styles.communityCard,
              {
                borderColor:
                  selectedCategory === "Office"
                    ? ResQColors.orangeText
                    : ResQColors.orangeBg,
              },
              selectedCategory === "Office" && styles.communityCardActive,
            ]}
            activeOpacity={0.8}
            onPress={() =>
              setSelectedCategory((prev) =>
                prev === "Office" ? "All" : "Office",
              )
            }
          >
            <View
              style={[
                styles.communityIconBadge,
                { backgroundColor: ResQColors.orangeBg },
              ]}
            >
              <Building2 size={22} color={ResQColors.orangeText} />
            </View>
            <Text style={styles.communityCardTitle}>Office Staff</Text>
            <Text style={styles.communityCountSubtext}>
              {officeContacts.length}{" "}
              {officeContacts.length === 1 ? "contact" : "contacts"}
            </Text>

            {/* Dynamic Avatar Stack */}
            {renderAvatarStack(officeContacts)}
          </TouchableOpacity>
        </View>

        {/* All Contacts Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitleText}>ALL CONTACTS</Text>
          <Text style={styles.contactCountText}>
            {filteredContacts.length} contacts
          </Text>
        </View>

        <View style={styles.contactsListContainer}>
          {filteredContacts.map((contact, idx) => (
            <Contacts
              key={contact.id}
              id={contact.id}
              idx={idx}
              name={contact.name}
              initials={contact.initials}
              phone={contact.phone}
              avatarUrl={contact.avatarUrl}
              badgeType={contact.badgeType}
              relationship={contact.relationship}
              status={contact.status}
              statusColor={contact.statusColor}
              avatarColor={contact.avatarColor}
              avatarTextColor={contact.avatarTextColor}
              verified={contact.verified}
              handleCallPress={handleCallPress}
              handleChatPress={handleChatPress}
              handleDeleteContact={handleDeleteContact}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Add Contact Button (Navigates to Connect screen) */}
      <TouchableOpacity
        onPress={() => router.push("/connect")}
        style={[styles.fabButton, { bottom: 90 + insets.bottom }]}
        activeOpacity={0.85}
      >
        <UserPlus size={26} color="#FFFFFF" strokeWidth={2.3} />
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
              <Text style={styles.modalTitle}>Add Contact</Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={{ padding: 4 }}
              >
                <X size={22} color={ResQColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                placeholder="e.g. Austin Arthur, Lawrence"
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
                placeholderTextColor={ResQColors.textFaint}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                placeholder="e.g. +44 999 999 999"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                style={styles.input}
                placeholderTextColor={ResQColors.textFaint}
              />

              <Text style={styles.inputLabel}>Category / Badge</Text>
              <View style={styles.categoryPickerRow}>
                {(["Family", "Office", "Friend", "Campus"] as const).map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOptionButton,
                        newCategory === cat &&
                          styles.categoryOptionButtonSelected,
                      ]}
                      onPress={() => setNewCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          newCategory === cat &&
                            styles.categoryOptionTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              <TouchableOpacity
                onPress={handleAddContact}
                style={styles.saveButton}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleSection: {
    marginBottom: 20,
  },
  subTitleText: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
    marginBottom: 4,
  },
  mainTitleText: {
    fontSize: 32,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
    letterSpacing: -0.5,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: ResQColors.border,
    paddingHorizontal: 18,
    height: 52,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: typography.regular,
    color: ResQColors.textPrimary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleText: {
    fontSize: 12.5,
    fontFamily: typography.bold,
    color: ResQColors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  viewAllText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: ResQColors.primaryRed,
  },
  contactCountText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
  },
  communitiesRow: {
    flexDirection: "row",
    gap: 12,
  },
  communityCard: {
    flex: 1,
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  communityCardActive: {
    borderWidth: 2,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  communityIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  communityCardTitle: {
    fontSize: 16.5,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
    marginBottom: 4,
  },
  communityCountSubtext: {
    fontSize: 12.5,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
    marginBottom: 12,
  },
  avatarStackRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  miniAvatarText: {
    fontSize: 10.5,
    fontFamily: typography.bold,
    color: "#991B1B",
  },
  miniAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: ResQColors.border,
  },
  miniAvatarBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ResQColors.cardSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  miniBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.bold,
    color: ResQColors.badgeGrayText,
  },
  contactsListContainer: {
    gap: 2,
  },
  fabButton: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ResQColors.primaryRed,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: ResQColors.primaryRed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: ResQColors.cardSurface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: ResQColors.borderSubtle,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
  },
  modalForm: {
    paddingTop: 20,
  },
  inputLabel: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: ResQColors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: ResQColors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: typography.regular,
    color: ResQColors.textPrimary,
    marginBottom: 18,
    backgroundColor: "#F9FAFB",
  },
  categoryPickerRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  categoryOptionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: ResQColors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: ResQColors.cardSurface,
  },
  categoryOptionButtonSelected: {
    borderColor: ResQColors.primaryRed,
    backgroundColor: ResQColors.primaryRedLight,
  },
  categoryOptionText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
  },
  categoryOptionTextSelected: {
    color: ResQColors.primaryRed,
    fontFamily: typography.bold,
  },
  saveButton: {
    backgroundColor: ResQColors.primaryRed,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ResQColors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
});
