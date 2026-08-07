import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Bell,
  ChevronRight,
  HelpCircle,
  LifeBuoy,
  LogOut,
  Pen,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const router = useRouter();

  // Default profile avatar matching the mockup photo style
  const [avatar, setAvatar] = useState<string>(
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  );

  const handlePickImage = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to change your avatar image.",
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong while choosing the image.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of ResQ?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          // Navigate back to login flow
          router.replace("/login");
        },
      },
    ]);
  };

  const handleHelpCenter = () => {
    Alert.alert(
      "ResQ Help Center",
      "Need assistance? Reach our 24/7 support line at support@resq-app.org or tap Call Emergency for immediate danger.",
    );
  };

  const handleNotificationsPress = () => {
    Alert.alert(
      "Notification Preferences",
      "Notification settings successfully updated.",
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* App Top Bar Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleHelpCenter}
          style={styles.headerIconButton}
          activeOpacity={0.7}
        >
          <HelpCircle size={24} color={Colors.light.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>ResQ</Text>
          <View style={styles.logoDot} />
        </View>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "System Status",
              "All campus security networks are active.",
            )
          }
          style={styles.headerIconButton}
          activeOpacity={0.7}
        >
          <Bell size={24} color={Colors.light.accent} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Avatar & Info Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarShadow}>
              <Image
                source={{ uri: avatar }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            </View>
            {/* Red Floating Action Button for Edit */}
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.editButton}
              activeOpacity={0.85}
            >
              <Pen size={12} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>George</Text>
          <Text style={styles.profilePhone}>+1 (555) 019-8472</Text>

          {/* Protected Status Badge */}
          <View style={styles.protectedBadge}>
            <View style={styles.badgeCheckCircle}>
              <View style={styles.badgeCheckInner} />
            </View>
            <Text style={styles.protectedText}>PROTECTED</Text>
          </View>
        </View>

        {/* SECURITY & SETTINGS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY & SETTINGS</Text>
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => router.push("/(resident)/contacts")}
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconWrapper, { backgroundColor: "#E6F0FA" }]}
              >
                <Shield size={18} color="#1E50A2" strokeWidth={2.2} />
              </View>
              <Text style={styles.listItemText}>Emergency Contacts</Text>
              <ChevronRight size={18} color="#A0AEC0" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() =>
                Alert.alert(
                  "Personal Information",
                  "George\nPhone: +1 (555) 019-8472\nResident ID: RES-8921\nRoom: Building C, Room 402",
                )
              }
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconWrapper, { backgroundColor: "#E6F0FA" }]}
              >
                <User size={18} color="#1E50A2" strokeWidth={2.2} />
              </View>
              <Text style={styles.listItemText}>Personal Information</Text>
              <ChevronRight size={18} color="#A0AEC0" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() =>
                Alert.alert(
                  "Safety Circles",
                  "You are sharing live emergency coordinates with 3 trusted active Safety Circles.",
                )
              }
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconWrapper, { backgroundColor: "#E6F0FA" }]}
              >
                <Users size={18} color="#1E50A2" strokeWidth={2.2} />
              </View>
              <Text style={styles.listItemText}>Safety Circles</Text>
              <ChevronRight size={18} color="#A0AEC0" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={handleNotificationsPress}
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconWrapper, { backgroundColor: "#E6F0FA" }]}
              >
                <Bell size={18} color="#1E50A2" strokeWidth={2.2} />
              </View>
              <Text style={styles.listItemText}>Notification Preferences</Text>
              <ChevronRight size={18} color="#A0AEC0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ACCOUNT Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => router.push("/settingsPage")}
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconWrapper, { backgroundColor: "#F1F5F9" }]}
              >
                <Settings size={18} color="#475569" strokeWidth={2.2} />
              </View>
              <Text style={styles.listItemText}>App Settings</Text>
              <ChevronRight size={18} color="#A0AEC0" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={handleHelpCenter}
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconWrapper, { backgroundColor: "#F1F5F9" }]}
              >
                <LifeBuoy size={18} color="#475569" strokeWidth={2.2} />
              </View>
              <Text style={styles.listItemText}>Help & Support</Text>
              <ChevronRight size={18} color="#A0AEC0" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconWrapper, { backgroundColor: "#FFF5F5" }]}
              >
                <LogOut size={18} color="#E53E3E" strokeWidth={2.2} />
              </View>
              <Text style={[styles.listItemText, styles.signOutText]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Sleek modern light backdrop
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  headerIconButton: {
    padding: 6,
    borderRadius: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  logoText: {
    fontSize: 24,
    fontFamily: typography.bold,
    color: "#0F172A",
  },
  logoDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.light.accent,
    marginLeft: 1.5,
    marginBottom: 6,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 12,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarShadow: {
    borderRadius: 50,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  editButton: {
    position: "absolute",
    right: 0,
    bottom: 2,
    backgroundColor: Colors.light.accent,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    elevation: 3,
  },
  profileName: {
    fontSize: 24,
    fontFamily: typography.bold,
    color: "#0F172A",
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14.5,
    fontFamily: typography.regular,
    color: "#64748B",
    marginBottom: 12,
  },
  protectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F4EA", // light mint/green bg
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeCheckCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#137333", // deep green checkmark wrapper
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCheckInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  protectedText: {
    fontSize: 11.5,
    fontFamily: typography.bold,
    color: "#137333",
    letterSpacing: 0.6,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: typography.bold,
    color: "#64748B",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  listItemText: {
    fontSize: 15,
    fontFamily: typography.medium,
    color: "#0F172A",
    flex: 1,
  },
  signOutText: {
    color: "#E53E3E",
    fontFamily: typography.bold,
  },
  divider: {
    height: 1,
    backgroundColor: "#EDF2F7",
    marginLeft: 66,
  },
});
