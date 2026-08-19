import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useNotificationBadge } from "@/components/notifications/NotificationBadgeContext";
import { NotificationCountBadge } from "@/components/notifications/NotificationCountBadge";
import { ArrowLeft, Bell } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ConnectHeaderProps {
  onBackPress?: () => void;
  onNotificationPress?: () => void;
}

export const ConnectHeader: React.FC<ConnectHeaderProps> = ({
  onBackPress,
  onNotificationPress,
}) => {
  const { unreadCount } = useNotificationBadge();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBackPress}
        style={styles.backButton}
        activeOpacity={0.7}
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={20} color={ResQColors.primaryRed} strokeWidth={2.5} />
      </TouchableOpacity>

      <Text style={styles.title}>Add Contact</Text>

      <TouchableOpacity
        onPress={onNotificationPress}
        style={styles.bellButton}
        activeOpacity={0.7}
        accessibilityLabel="Notifications"
      >
        <View style={styles.bellContainer}>
          <Bell size={20} color={ResQColors.primaryRed} strokeWidth={2.2} />
          <NotificationCountBadge count={unreadCount} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: ResQColors.pageBg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ResQColors.cardSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 20,
    color: ResQColors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ResQColors.primaryRedLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
  },
  bellContainer: {
    position: "relative",
  },
});

export default ConnectHeader;
