import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bell, HelpCircle } from "lucide-react-native";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface HomeTabBarProp {
  activePage?: string;
  userInfo?: {};
  pageTitle: string;
}

const HomeTabBar: React.FC<HomeTabBarProp> = ({
  activePage,
  userInfo,
  pageTitle,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>{pageTitle}</Text>
        <View style={styles.brandDot} />
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={() => router.push("/(resident)/contacts")}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <HelpCircle size={20} color={Colors.light.text} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Bell size={20} color={Colors.light.text} strokeWidth={2} />
          <View style={styles.badge} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/profile")}
          style={styles.avatarButton}
          activeOpacity={0.8}
        >
          <Image
            source={require("../designs/profile.png")}
            style={styles.avatarImage}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  titleText: {
    fontSize: 28,
    color: Colors.light.text,
    fontFamily: typography.bold,
    lineHeight: 34,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
    marginLeft: 3,
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE6DF",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: Colors.light.accent,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});

export default HomeTabBar;
