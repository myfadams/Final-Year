import {
  FriendContact,
  getFriends,
  removeFriend,
  updateFriendRelationship,
} from "@/backend/friends";
import { createSafeRealtimeChannel, supabase } from "@/backend/supabaseConfig";

import AnotherNavBarHeader from "@/components/AnotherNavBarHeader";
import ContactActionModal from "@/components/ContactActionModal";
import Contacts from "@/components/Contacts";
import HeartBeatWave from "@/components/HeartBeatWave";
import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useFocusEffect, useRouter } from "expo-router";
import {
  GraduationCap,
  Search,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react-native";
import { showPopupAlert } from "@/components/popupAlert";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// Map a FriendContact to the shape the Contacts component & community helpers expect
function toContactsProp(fc: FriendContact) {
  const ac = getAvatarColor(fc.name);
  return {
    id: fc.friendshipId,          // use friendshipId so we can delete/update
    userId: fc.userId,
    initials: getInitials(fc.name),
    name: fc.name,
    phone: fc.phone ?? "",
    avatarUrl: fc.profile_img_url ?? undefined,
    relationship: fc.relationship,
    badgeType: fc.relationship,
    status: "",
    statusColor: ResQColors.statusGreen,
    avatarColor: ac.bg,
    avatarTextColor: ac.text,
    verified: false,
    program_of_study: fc.program_of_study,
    // keep original FriendContact ref for the modal
    _raw: fc,
  };
}

export default function ContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Real friends from Supabase
  const [friends, setFriends] = useState<FriendContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Contact-action modal
  const [modalContact, setModalContact] = useState<FriendContact | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Load friends ─────────────────────────────────────────────────────────────
  const loadFriends = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    const { data, error } = await getFriends();
    setIsLoading(false);
    if (error) {
      console.warn("loadFriends error:", error);
    } else {
      setFriends(data);
    }
  }, []);

  // 1. Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFriends(false);
    }, [loadFriends])
  );

  // 2. Initial load and Realtime listener for immediate updates on friends changes
  useEffect(() => {
    loadFriends(true);

    let channel: any = null;
    try {
      channel = createSafeRealtimeChannel("friends-contacts", (ch) =>
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "friends" },
          () => {
            loadFriends(false);
          }
        )
      );
    } catch (err) {
      console.warn("Realtime contacts setup warning:", err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [loadFriends]);


  // ── Action handlers ─────────────────────────────────────────────────────────
  const handleCallPress = (name: string) => {
    showPopupAlert("Emergency Call", `Initiating direct call to ${name}...`, undefined, undefined, "info");
  };

  const handleChatPress = (name: string, contactObj?: any) => {
    router.push({
      pathname: "/contactChat",
      params: {
        mode: "contact",
        contactId: contactObj?.userId || contactObj?.id || "1",
        name: contactObj?.name || name,
        relationship: contactObj?.relationship || "Contact",
        phone: contactObj?.phone || "",
        avatarUrl: contactObj?.avatarUrl,
      },
    });
  };

  // Long-press → open modal
  const handleLongPress = (friendshipId: string | number) => {
    const fc = friends.find((f) => f.friendshipId === String(friendshipId));
    if (fc) {
      setModalContact(fc);
      setModalVisible(true);
    }
  };

  // Save relationship label
  const handleSaveRelationship = useCallback(
    async (friendshipId: string, relationship: string) => {
      // Optimistic update
      setFriends((prev) =>
        prev.map((f) =>
          f.friendshipId === friendshipId ? { ...f, relationship } : f,
        ),
      );
      const { error } = await updateFriendRelationship(friendshipId, relationship);
      if (error) {
        showPopupAlert("Error", error, undefined, undefined, "error");
        loadFriends(); // restore on failure
      }
    },
    [loadFriends],
  );

  // Remove friend
  const handleRemove = useCallback(
    (friendshipId: string, name: string) => {
      setModalVisible(false);
      showPopupAlert(
        "Remove Contact",
        `Remove ${name} from your contacts?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              // Optimistic
              setFriends((prev) =>
                prev.filter((f) => f.friendshipId !== friendshipId),
              );
              const { error } = await removeFriend(friendshipId);
              if (error) {
                showPopupAlert("Error", error, undefined, undefined, "error");
                loadFriends();
              }
            },
          },
        ],
        undefined,
        "confirm"
      );
    },
    [loadFriends],
  );

  // ── Derived lists ───────────────────────────────────────────────────────────
  const familyFriends = friends.filter((f) =>
    f.relationship.toLowerCase().includes("family"),
  );

  const classmatesFriends = friends.filter((f) =>
    ["classmate", "colleague", "roommate"].some((kw) =>
      f.relationship.toLowerCase().includes(kw),
    ),
  );

  const mapped = friends.map(toContactsProp);

  const filteredContacts = mapped.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.relationship.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q));

    const matchesCategory =
      selectedCategory === "All" ||
      c.relationship.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // ── Mini avatar stack helper ────────────────────────────────────────────────
  const renderAvatarStack = (subset: FriendContact[]) => {
    const total = subset.length;
    const visible = subset.slice(0, 2);
    const overflow = total > 2 ? total - 2 : 0;

    if (total === 0) {
      return (
        <View style={styles.avatarStackRow}>
          <View style={styles.miniAvatarBadge}>
            <Text style={styles.miniBadgeText}>0</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.avatarStackRow}>
        {visible.map((f, i) => {
          const ac = getAvatarColor(f.name);
          return (
            <React.Fragment key={f.friendshipId}>
              {f.profile_img_url ? (
                <Image
                  source={{ uri: f.profile_img_url }}
                  style={[styles.miniAvatarImage, i > 0 && { marginLeft: -8 }]}
                />
              ) : (
                <View
                  style={[
                    styles.miniAvatarBox,
                    { backgroundColor: ac.bg },
                    i > 0 && { marginLeft: -8 },
                  ]}
                >
                  <Text style={[styles.miniAvatarText, { color: ac.text }]}>
                    {getInitials(f.name)}
                  </Text>
                </View>
              )}
            </React.Fragment>
          );
        })}
        {overflow > 0 && (
          <View style={[styles.miniAvatarBadge, { marginLeft: -8 }]}>
            <Text style={styles.miniBadgeText}>+{overflow}</Text>
          </View>
        )}
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AnotherNavBarHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
      >
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.subTitleText}>Address Book</Text>
          <Text style={styles.mainTitleText}>Contacts</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Search size={20} color={ResQColors.textFaint} />
          <TextInput
            placeholder="Search contacts..."
            placeholderTextColor={ResQColors.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* MY COMMUNITIES */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>MY COMMUNITIES</Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory("All");
              setSearchQuery("");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.communitiesRow}>
          {/* Family */}
          <TouchableOpacity
            style={[
              styles.communityCard,
              {
                borderColor:
                  selectedCategory === "Family"
                    ? ResQColors.pinkText
                    : ResQColors.pinkBg,
              },
              selectedCategory === "Family" && styles.communityCardActive,
            ]}
            activeOpacity={0.8}
            onPress={() =>
              setSelectedCategory((prev) =>
                prev === "Family" ? "All" : "Family",
              )
            }
          >
            <View
              style={[
                styles.communityIconBadge,
                { backgroundColor: ResQColors.pinkBg },
              ]}
            >
              <Users size={22} color={ResQColors.pinkText} />
            </View>
            <Text style={styles.communityCardTitle}>Family</Text>
            <Text style={styles.communityCountSubtext}>
              {familyFriends.length}{" "}
              {familyFriends.length === 1 ? "contact" : "contacts"}
            </Text>
            {renderAvatarStack(familyFriends)}
          </TouchableOpacity>

          {/* Classmates (was "Office Staff") */}
          <TouchableOpacity
            style={[
              styles.communityCard,
              {
                borderColor:
                  selectedCategory === "Classmate"
                    ? ResQColors.orangeText
                    : ResQColors.orangeBg,
              },
              selectedCategory === "Classmate" && styles.communityCardActive,
            ]}
            activeOpacity={0.8}
            onPress={() =>
              setSelectedCategory((prev) =>
                prev === "Classmate" ? "All" : "Classmate",
              )
            }
          >
            <View
              style={[
                styles.communityIconBadge,
                { backgroundColor: ResQColors.orangeBg },
              ]}
            >
              <GraduationCap size={22} color={ResQColors.orangeText} />
            </View>
            <Text style={styles.communityCardTitle}>Classmates</Text>
            <Text style={styles.communityCountSubtext}>
              {classmatesFriends.length}{" "}
              {classmatesFriends.length === 1 ? "contact" : "contacts"}
            </Text>
            {renderAvatarStack(classmatesFriends)}
          </TouchableOpacity>
        </View>

        {/* ALL CONTACTS */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitleText}>ALL CONTACTS</Text>
          <Text style={styles.contactCountText}>
            {filteredContacts.length} contacts
          </Text>
        </View>

        <View style={styles.contactsListContainer}>
          {isLoading ? (
            /* ── Loading state ── */
            <View style={styles.centerState}>
              <HeartBeatWave
                width={180}
                color={ResQColors.primaryRed}
                thickness={5}
              />
              <Text style={styles.loadingText}>Loading contacts…</Text>
            </View>
          ) : filteredContacts.length === 0 ? (
            /* ── Empty state ── */
            <View style={styles.centerState}>
              <View style={styles.emptyIconWrap}>
                <UsersRound size={38} color={ResQColors.textFaint} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery.trim()
                  ? "No contacts match your search"
                  : "No contacts yet"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim()
                  ? `We couldn't find anyone matching "${searchQuery}".`
                  : "People you connect with will appear here. Tap the + button to find friends."}
              </Text>
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <Contacts
                key={contact.id}
                id={contact.id}
                idx={0}
                name={contact.name}
                initials={contact.initials}
                phone={contact.phone}
                avatarUrl={contact.avatarUrl}
                badgeType={contact.badgeType}
                relationship={contact.relationship}
                status={contact.status}
                statusColor={contact.statusColor}
                avatarColor={contact.avatarColor}
                avatarTextColor={contact.avatarTextColor}
                verified={contact.verified}
                handleCallPress={handleCallPress}
                handleChatPress={(name, obj) =>
                  handleChatPress(name, { ...obj, userId: contact.userId })
                }
                onLongPress={handleLongPress}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/connect")}
        style={[styles.fabButton, { bottom: 90 + insets.bottom }]}
        activeOpacity={0.85}
      >
        <UserPlus size={26} color="#FFFFFF" strokeWidth={2.3} />
      </TouchableOpacity>

      {/* Contact Action Modal */}
      <ContactActionModal
        contact={modalContact}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaveRelationship={handleSaveRelationship}
        onRemove={handleRemove}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleSection: {
    marginBottom: 20,
  },
  subTitleText: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
    marginBottom: 4,
  },
  mainTitleText: {
    fontSize: 32,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
    letterSpacing: -0.5,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: ResQColors.border,
    paddingHorizontal: 18,
    height: 52,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: typography.regular,
    color: ResQColors.textPrimary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleText: {
    fontSize: 12.5,
    fontFamily: typography.bold,
    color: ResQColors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  viewAllText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: ResQColors.primaryRed,
  },
  contactCountText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
  },
  communitiesRow: {
    flexDirection: "row",
    gap: 12,
  },
  communityCard: {
    flex: 1,
    backgroundColor: ResQColors.cardSurface,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  communityCardActive: {
    borderWidth: 2,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  communityIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  communityCardTitle: {
    fontSize: 16.5,
    fontFamily: typography.bold,
    color: ResQColors.textPrimary,
    marginBottom: 4,
  },
  communityCountSubtext: {
    fontSize: 12.5,
    fontFamily: typography.medium,
    color: ResQColors.textMuted,
    marginBottom: 12,
  },
  avatarStackRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  miniAvatarText: {
    fontSize: 10.5,
    fontFamily: typography.bold,
  },
  miniAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: ResQColors.border,
  },
  miniAvatarBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ResQColors.cardSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  miniBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.bold,
    color: ResQColors.badgeGrayText,
  },
  contactsListContainer: {
    gap: 2,
  },
  // ── Loading / Empty ───────────────────────────────────────────────
  centerState: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontFamily: typography.medium,
    fontSize: 14,
    color: ResQColors.textMuted,
    marginTop: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ResQColors.cardSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontFamily: typography.bold,
    fontSize: 17,
    color: ResQColors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: typography.regular,
    fontSize: 14,
    color: ResQColors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  // ── FAB ───────────────────────────────────────────────────────────
  fabButton: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ResQColors.primaryRed,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: ResQColors.primaryRed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 20,
  },
});
