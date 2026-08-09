import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Search } from "lucide-react-native";
import React from "react";
import { StyleSheet, TextInput, View } from "react-native";

interface ConnectSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearchPress?: () => void;
}

export const ConnectSearchBar: React.FC<ConnectSearchBarProps> = ({
  value,
  onChangeText,
  onSearchPress,
}) => {
  return (
    <View style={styles.container}>
      <Search size={18} color={ResQColors.textFaint} style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        placeholder="Search by name, ID, or location..."
        placeholderTextColor={ResQColors.textFaint}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        onSubmitEditing={onSearchPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurface,
    borderWidth: 1,
    borderColor: ResQColors.border,
    borderRadius: 26,
    paddingHorizontal: 16,
    height: 50,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: typography.regular,
    color: ResQColors.textPrimary,
    paddingVertical: 8,
  },
});

export default ConnectSearchBar;
