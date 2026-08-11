import CustomButton from "@/components/CustomButton";
import Colors, { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Heart, Phone, User, X } from "lucide-react-native";
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

interface AddContactModalProps {
  visible: boolean;
  onClose: () => void;
  onAddContact: (contact: {
    name: string;
    phone: string;
    relationship: string;
  }) => void;
}

const COMMON_RELATIONS = [
  "Parent",
  "Mother",
  "Father",
  "Sibling",
  "Spouse",
  "Partner",
  "Friend",
  "Guardian",
  "Doctor",
  "Roommate",
];

export const AddContactModal: React.FC<AddContactModalProps> = ({
  visible,
  onClose,
  onAddContact,
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    relationship?: string;
  }>({});

  const handleReset = () => {
    setName("");
    setPhone("");
    setRelationship("");
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const validate = () => {
    const newErrors: { name?: string; phone?: string; relationship?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (phone.trim().length < 7) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!relationship.trim()) {
      newErrors.relationship = "Relation is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onAddContact({
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim(),
      });
      handleClose();
    }
  };

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
                <View>
                  <Text style={styles.title}>Add Emergency Contact</Text>
                  <Text style={styles.subtitle}>
                    Contacts provided to emergency responders attending to you
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
              >
                {/* Full Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Full Name <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.name ? styles.inputError : null,
                    ]}
                  >
                    <User size={18} color="#64748B" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Jane Doe"
                      placeholderTextColor="#94A3B8"
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        if (errors.name)
                          setErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                {/* Phone Number Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Phone Number <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.phone ? styles.inputError : null,
                    ]}
                  >
                    <Phone size={18} color="#64748B" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. +233 24 123 4567"
                      placeholderTextColor="#94A3B8"
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text);
                        if (errors.phone)
                          setErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </View>

                {/* Relationship Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Relation to You <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.relationship ? styles.inputError : null,
                    ]}
                  >
                    <Heart size={18} color="#64748B" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Mother, Brother, Doctor"
                      placeholderTextColor="#94A3B8"
                      value={relationship}
                      onChangeText={(text) => {
                        setRelationship(text);
                        if (errors.relationship)
                          setErrors((prev) => ({
                            ...prev,
                            relationship: undefined,
                          }));
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.relationship && (
                    <Text style={styles.errorText}>{errors.relationship}</Text>
                  )}

                  {/* Relationship Quick Selection Chips */}
                  <View style={styles.chipsContainer}>
                    {COMMON_RELATIONS.map((rel) => (
                      <TouchableOpacity
                        key={rel}
                        style={[
                          styles.chip,
                          relationship === rel ? styles.chipSelected : null,
                        ]}
                        onPress={() => {
                          setRelationship(rel);
                          if (errors.relationship)
                            setErrors((prev) => ({
                              ...prev,
                              relationship: undefined,
                            }));
                        }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            relationship === rel
                              ? styles.chipTextSelected
                              : null,
                          ]}
                        >
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Modal Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>Save Contact</Text>
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
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: typography.regular,
    color: "#64748B",
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
  },
  formContent: {
    paddingVertical: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13.5,
    fontFamily: typography.medium,
    color: "#334155",
  },
  required: {
    color: "#EF4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: typography.regular,
    color: "#0F172A",
  },
  errorText: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#EF4444",
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipSelected: {
    backgroundColor: "#FEE2E2",
    borderColor: ResQColors.primaryRed,
  },
  chipText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: "#475569",
  },
  chipTextSelected: {
    color: ResQColors.primaryRed,
    fontFamily: typography.semibold,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: typography.semibold,
    color: "#475569",
  },
  submitButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: ResQColors.primaryRed,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: typography.semibold,
    color: "#FFFFFF",
  },
});

export default AddContactModal;
