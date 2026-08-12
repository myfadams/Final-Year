/**
 * ContactActionModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Bottom-sheet modal that appears when a contact card is long-pressed.
 * Offers:
 *   • Relationship label editor with quick-select chips
 *   • Remove contact (delete friendship)
 */
import { FriendContact } from "@/backend/friends";
import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { Trash2, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// ── Suggestion chips ──────────────────────────────────────────────────────────
const RELATIONSHIP_SUGGESTIONS = [
  "Friend",
  "Family",
  "Classmate",
  "Roommate",
  "Colleague",
];

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "#FEE2E2", text: "#991B1B" },
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#EDE9FE", text: "#5B21B6" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#CCFBF1", text: "#0F766E" },
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarColor(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ContactActionModalProps {
  contact: FriendContact | null;
  visible: boolean;
  onClose: () => void;
  onSaveRelationship: (friendshipId: string, relationship: string) => void;
  onRemove: (friendshipId: string, name: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
const ContactActionModal: React.FC<ContactActionModalProps> = ({
  contact,
  visible,
  onClose,
  onSaveRelationship,
  onRemove,
}) => {
  const [relInput, setRelInput] = useState("");

  // Sync input when a different contact is selected
  useEffect(() => {
    if (contact) {
      setRelInput(contact.relationship ?? "Friend");
    }
  }, [contact?.friendshipId]);

  if (!contact) return null;

  const avatarColor = getAvatarColor(contact.name);
  const initials = getInitials(contact.name);

  const handleSave = () => {
    const trimmed = relInput.trim();
    if (!trimmed) return;
    onSaveRelationship(contact.friendshipId, trimmed);
    onClose();
  };

  const handleRemove = () => {
    onRemove(contact.friendshipId, contact.name);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.sheetWrapper}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header row */}
            <View style={styles.headerRow}>
              {/* Avatar */}
              {contact.profile_img_url ? (
                <Image
                  source={{ uri: contact.profile_img_url }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.initialsAvatar,
                    { backgroundColor: avatarColor.bg },
                  ]}
                >
                  <Text style={[styles.initialsText, { color: avatarColor.text }]}>
                    {initials}
                  </Text>
                </View>
              )}

              <View style={styles.headerInfo}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {contact.name}
                </Text>
                {contact.program_of_study ? (
                  <Text style={styles.contactSub} numberOfLines={1}>
                    {contact.program_of_study}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={ResQColors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Relationship editor */}
            <Text style={styles.sectionLabel}>Relationship</Text>

            <TextInput
              style={styles.relInput}
              value={relInput}
              onChangeText={setRelInput}
              placeholder="e.g. Best friend, Lab partner…"
              placeholderTextColor={ResQColors.textFaint}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            {/* Quick-select chips */}
            <View style={styles.chipsRow}>
              {RELATIONSHIP_SUGGESTIONS.map((s) => {
                const selected =
                  relInput.trim().toLowerCase() === s.toLowerCase();
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setRelInput(s)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>

            {/* Remove button */}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={handleRemove}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color={ResQColors.primaryRed} strokeWidth={2} />
              <Text style={styles.removeBtnText}>Remove Contact</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ContactActionModal;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: ResQColors.cardSurface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: ResQColors.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  // ── Header ────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ResQColors.border,
  },
  initialsAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontFamily: typography.bold,
    fontSize: 18,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  contactName: {
    fontFamily: typography.bold,
    fontSize: 17,
    color: ResQColors.textPrimary,
  },
  contactSub: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: ResQColors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  divider: {
    height: 1,
    backgroundColor: ResQColors.borderSubtle,
    marginBottom: 20,
  },
  // ── Relationship editor ───────────────────────────────────────────
  sectionLabel: {
    fontFamily: typography.semibold,
    fontSize: 13.5,
    color: ResQColors.textSecondary,
    marginBottom: 10,
  },
  relInput: {
    borderWidth: 1,
    borderColor: ResQColors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: typography.regular,
    color: ResQColors.textPrimary,
    backgroundColor: "#F9FAFB",
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 22,
  },
  chip: {
    borderWidth: 1,
    borderColor: ResQColors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: ResQColors.cardSurface,
  },
  chipSelected: {
    borderColor: ResQColors.primaryRed,
    backgroundColor: ResQColors.primaryRedLight,
  },
  chipText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: ResQColors.textMuted,
  },
  chipTextSelected: {
    fontFamily: typography.bold,
    color: ResQColors.primaryRed,
  },
  // ── Actions ───────────────────────────────────────────────────────
  saveBtn: {
    backgroundColor: ResQColors.primaryRed,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: ResQColors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontFamily: typography.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
    backgroundColor: ResQColors.primaryRedLight,
  },
  removeBtnText: {
    fontFamily: typography.semibold,
    fontSize: 15,
    color: ResQColors.primaryRed,
  },
});
