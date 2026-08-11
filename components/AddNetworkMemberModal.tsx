import Colors, { ResQColors } from "@/constants/Colors";
import { ContactsProp } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Check, Plus, Search, UserPlus, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface AddNetworkMemberModalProps {
  visible: boolean;
  onClose: () => void;
  allContacts: ContactsProp[];
  onToggleMember: (id: string | number) => void;
}

export const AddNetworkMemberModal: React.FC<AddNetworkMemberModalProps> = ({
  visible,
  onClose,
  allContacts,
  onToggleMember,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const filteredContacts = allContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.relationship.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContent}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconBg}>
                    <UserPlus size={20} color={ResQColors.primaryRed} />
                  </View>
                  <View>
                    <Text style={styles.title}>Add to Safety Circle</Text>
                    <Text style={styles.subtitle}>
                      Select connected contacts from your app directory
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBarContainer}>
                <Search size={18} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search connected contacts..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Contacts List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.contactListScroll}
                contentContainerStyle={styles.contactListContent}
              >
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((item) => {
                    const isAdded = !!item.isTrustedNetwork;
                    const initials =
                      item.initials ||
                      item.name
                        .trim()
                        .split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                    return (
                      <View key={item.id} style={styles.contactListItem}>
                        <View style={styles.contactItemLeft}>
                          <View
                            style={[
                              styles.avatar,
                              {
                                backgroundColor:
                                  item.avatarColor || Colors.light.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.avatarText,
                                { color: item.avatarTextColor || "#FFFFFF" },
                              ]}
                            >
                              {initials}
                            </Text>
                          </View>
                          <View style={styles.contactTextWrapper}>
                            <Text style={styles.contactName}>{item.name}</Text>
                            <Text style={styles.contactSubText}>
                              {item.relationship} •{" "}
                              {item.phone || "+233 24 000 0000"}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            isAdded ? styles.addedBtn : styles.addBtn,
                          ]}
                          onPress={() => onToggleMember(item.id)}
                          activeOpacity={0.8}
                        >
                          {isAdded ? (
                            <View style={styles.btnRow}>
                              <Check size={14} color="#15803D" />
                              <Text style={styles.addedBtnText}>In Network</Text>
                            </View>
                          ) : (
                            <View style={styles.btnRow}>
                              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                              <Text style={styles.addBtnText}>Add</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptySearchContainer}>
                    <Text style={styles.emptySearchText}>
                      No matching contacts found.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.footerContainer}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 44 : 36,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#64748B",
    marginTop: 1,
  },
  closeButton: {
    padding: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 14,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.regular,
    color: "#0F172A",
  },
  contactListScroll: {
    maxHeight: 300,
  },
  contactListContent: {
    paddingVertical: 4,
    gap: 10,
  },
  contactListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  contactItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontFamily: typography.bold,
  },
  contactTextWrapper: {
    flex: 1,
  },
  contactName: {
    fontSize: 14.5,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  contactSubText: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#64748B",
    marginTop: 1,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtn: {
    backgroundColor: ResQColors.primaryRed,
  },
  addedBtn: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addBtnText: {
    fontSize: 12.5,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
  addedBtnText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: "#15803D",
  },
  emptySearchContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptySearchText: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: "#94A3B8",
  },
  footerContainer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 8,
    marginBottom: 6,
  },
  doneButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: ResQColors.primaryRed,
    justifyContent: "center",
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 15,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
});

export default AddNetworkMemberModal;
