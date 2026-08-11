import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Check, Pencil } from "lucide-react-native";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface MedicalFieldItemProps {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  icon?: React.ReactNode;
  multiline?: boolean;
}

export const MedicalFieldItem: React.FC<MedicalFieldItemProps> = ({
  label,
  value,
  placeholder = "Tap edit to enter details",
  onChangeText,
  icon,
  multiline = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleEdit = () => {
    setIsEditing((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      {/* Field Header: Icon, Title Label & Toggle Edit Button */}
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={styles.labelText}>{label}</Text>
        </View>
        <TouchableOpacity
          onPress={handleToggleEdit}
          style={styles.editButton}
          activeOpacity={0.7}
          accessibilityLabel={`Edit ${label}`}
        >
          {isEditing ? (
            <View style={styles.doneBadge}>
              <Check size={14} color="#15803D" strokeWidth={2.5} />
              <Text style={styles.doneText}>Done</Text>
            </View>
          ) : (
            <View style={styles.editBadge}>
              <Pencil size={13} color={ResQColors.primaryRed} strokeWidth={2.2} />
              <Text style={styles.editText}>Edit</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Input Field when Active, or Display Touch Text View when Inactive */}
      {isEditing ? (
        <View style={styles.inputWrapper}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={ResQColors.textFaint}
            multiline={multiline}
            autoFocus={true}
            onBlur={() => setIsEditing(false)}
            style={[styles.input, multiline && styles.multilineInput]}
          />
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setIsEditing(true)}
          style={styles.displayWrapper}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.displayText,
              !value || !value.trim() ? styles.placeholderText : null,
            ]}
          >
            {value && value.trim() ? value : placeholder}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ResQColors.border,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  labelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ResQColors.primaryRedLight,
    justifyContent: "center",
    alignItems: "center",
  },
  labelText: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
    letterSpacing: 0.2,
  },
  editButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  editBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ResQColors.primaryRedLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
  },
  editText: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: ResQColors.primaryRed,
  },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  doneText: {
    fontSize: 12,
    fontFamily: typography.bold,
    color: "#15803D",
  },
  displayWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  displayText: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: "#1E293B",
  },
  placeholderText: {
    color: "#94A3B8",
    fontStyle: "italic",
  },
  inputWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ResQColors.primaryRed,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: "#0F172A",
    padding: 0,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
});

export default MedicalFieldItem;
