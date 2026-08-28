import { getCachedUserProfile, UserProfile } from "@/backend/auth";
import Colors, { ResQColors } from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { typography } from "@/constants/typograyph";
import { useNotificationBadge } from "@/components/notifications/NotificationBadgeContext";
import { NotificationCountBadge } from "@/components/notifications/NotificationCountBadge";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bell, HelpCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface HomeTabBarProp {
  activePage?: string;
  userInfo?: {
    name?: string;
    avatarUrl?: string;
    profile_img_url?: string;
  };
  pageTitle: string;
  avatarUrl?: string;
  name?: string;
  userProfile?: UserProfile | null;
}

const getInitials = (fullName?: string) => {
  if (!fullName || !fullName.trim()) return "R";
  const parts = fullName.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
};

const HomeTabBar: React.FC<HomeTabBarProp> = ({
  activePage,
  userInfo,
  pageTitle,
  avatarUrl,
  name,
  userProfile,
}) => {
  const router = useRouter();
  const { unreadCount } = useNotificationBadge();
  const [profile, setProfile] = useState<UserProfile | null>(
    userProfile || globalState.userProfile
  );
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      if (userProfile) {
        setProfile(userProfile);
        return;
      }
      const cached = await getCachedUserProfile();
      if (cached && isMounted) {
        setProfile(cached);
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [userProfile]);

  const effectiveAvatarUrl =
    avatarUrl ||
    userProfile?.profile_img_url ||
    profile?.profile_img_url ||
    userInfo?.avatarUrl ||
    userInfo?.profile_img_url ||
    null;

  const effectiveName =
    name ||
    userProfile?.name ||
    profile?.name ||
    userInfo?.name ||
    "Resident";

  const renderAvatar = () => {
    if (effectiveAvatarUrl && effectiveAvatarUrl.trim().length > 0 && !imageError) {
      return (
        <Image
          source={{ uri: effectiveAvatarUrl }}
          style={styles.avatarImage}
          contentFit="cover"
          onError={() => setImageError(true)}
        />
      );
    }

    return (
      <View style={styles.initialsContainer}>
        <Text style={styles.initialsText}>{getInitials(effectiveName)}</Text>
      </View>
    );
  };

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

        <TouchableOpacity
          onPress={() => router.push("/notificationsPage")}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Bell size={20} color={Colors.light.text} strokeWidth={2} />
          <NotificationCountBadge count={unreadCount} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/profile")}
          style={styles.avatarButton}
          activeOpacity={0.8}
        >
          {renderAvatar()}
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
    backgroundColor: ResQColors.primaryRedLight,
    borderWidth: 2,
    borderColor: Colors.light.accent,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
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
  initialsContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: ResQColors.primaryRed,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
});

export default HomeTabBar;
