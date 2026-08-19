import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useNotificationBadge } from "@/components/notifications/NotificationBadgeContext";
import { NotificationCountBadge } from "@/components/notifications/NotificationCountBadge";
import { useRouter } from "expo-router";
import { ArrowLeft, Bell } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const NavHeader = ({ title }: { title: string }) => {
  const router = useRouter();
  const { unreadCount } = useNotificationBadge();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.headerIconButton}
      >
        <ArrowLeft size={24} color={Colors.light.accent} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {!title.toLowerCase().includes("notification") && <TouchableOpacity
        onPress={() => router.push("/notificationsPage")}
        style={styles.headerIconButton}
      >
        <Bell size={24} color={Colors.light.accent} />
        <NotificationCountBadge count={unreadCount} />
      </TouchableOpacity>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIconButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17.5,
    fontFamily: typography.semibold,
    color: "#0F172A",
  },
  scrollContent: {
    paddingBottom: 110,
  },
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
});
export default NavHeader;
