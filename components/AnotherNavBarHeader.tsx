import { getCachedUserProfile, UserProfile } from "@/backend/auth";
import { ResQColors } from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AnotherNavBarHeaderProps {
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  title?: string;
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

export const AnotherNavBarHeader: React.FC<AnotherNavBarHeaderProps> = ({
  onProfilePress,
  onNotificationPress,
  title = "ResQ",
  avatarUrl,
  name,
  userProfile,
}) => {
  const router = useRouter();
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
    userProfile?.profile_image_url ||
    profile?.profile_image_url ||
    null;

  const effectiveName =
    name ||
    userProfile?.name ||
    profile?.name ||
    "Resident";

  const handleProfile = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      router.push("/profile");
    }
  };

  const handleNotification = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      Alert.alert("Notifications", "No new notifications.");
    }
  };

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
    <View style={styles.header}>
      <TouchableOpacity
        onPress={handleProfile}
        style={styles.avatarButton}
        activeOpacity={0.75}
        accessibilityLabel="Profile"
      >
        {renderAvatar()}
      </TouchableOpacity>

      <View style={styles.brandTitleContainer}>
        <Text style={styles.brandTitleText}>{title}</Text>
        <Text style={styles.brandDot}>.</Text>
      </View>

      <TouchableOpacity
        onPress={handleNotification}
        style={styles.headerIconButton}
        activeOpacity={0.7}
        accessibilityLabel="Notifications"
      >
        <Bell size={22} color={ResQColors.primaryRed} strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: ResQColors.pageBg,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ResQColors.primaryRedLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: ResQColors.primaryRedBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ResQColors.primaryRedLight,
    borderWidth: 1.5,
    borderColor: ResQColors.primaryRedBorder,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#9E001C",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
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
    borderRadius: 21,
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
    fontSize: 15,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
  brandTitleContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  brandTitleText: {
    fontSize: 24,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
    letterSpacing: -0.5,
  },
  brandDot: {
    fontSize: 26,
    fontFamily: typography.bold,
    color: ResQColors.primaryRed,
  },
});

export default AnotherNavBarHeader;
