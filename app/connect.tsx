import ConnectHeader from "@/components/connect/ConnectHeader";
import ConnectSearchBar from "@/components/connect/ConnectSearchBar";
import FriendSearchResultCard from "@/components/connect/FriendSearchResultCard";
import PendingRequestCard from "@/components/connect/PendingRequestCard";
import HeartBeatWave from "@/components/HeartBeatWave";
import { ResQColors } from "@/constants/Colors";
import { FriendSearchResult, PendingRequest } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import {
  acceptFriendRequest,
  getSuggestedUsers,
  removeFriendRequest,
  searchUsers,
  sendFriendRequest,
} from "@/backend/friends";
import { useRouter } from "expo-router";
import { AlertTriangle, SearchX } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ── Debounce delay ────────────────────────────────────────────────────────────
const SEARCH_DEBOUNCE_MS = 350;

export default function ConnectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Used to discard stale responses when the user types quickly
  const searchRequestId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pending requests (still temp data – separate task) ──────────────────────
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  // ── Suggested responders ────────────────────────────────────────────────────
  const [suggestedUsers, setSuggestedUsers] = useState<FriendSearchResult[]>(
    [],
  );

  // Load suggested users on mount
  useEffect(() => {
    (async () => {
      const { data } = await getSuggestedUsers(2);
      setSuggestedUsers(data);
    })();
  }, []);

  // ── Debounced search ────────────────────────────────────────────────────────
  const runSearch = useCallback(async (term: string, requestId: number) => {
    setIsSearchLoading(true);
    setSearchError(null);

    const { data, error } = await searchUsers(term);

    // Discard if a newer request was already fired
    if (searchRequestId.current !== requestId) return;

    setIsSearchLoading(false);

    if (error) {
      setSearchError(error);
      setSearchResults([]);
    } else {
      setSearchResults(data);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);

      // Clear any pending debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      const trimmed = text.trim();

      if (!trimmed) {
        // No search term – reset search state, show normal mode
        searchRequestId.current += 1;
        setSearchResults([]);
        setIsSearchLoading(false);
        setSearchError(null);
        return;
      }

      // Schedule search after debounce window
      debounceTimer.current = setTimeout(() => {
        const id = ++searchRequestId.current;
        runSearch(trimmed, id);
      }, SEARCH_DEBOUNCE_MS);
    },
    [runSearch],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ── Relationship action helpers ─────────────────────────────────────────────

  /**
   * Optimistically update relationship in a results list.
   */
  const updateRelationship = (
    list: FriendSearchResult[],
    userId: string,
    relationship: FriendSearchResult["relationship"],
  ): FriendSearchResult[] =>
    list.map((item) =>
      item.id === userId ? { ...item, relationship } : item,
    );

  const handleAdd = useCallback(
    async (userId: string) => {
      // Optimistic update
      setSearchResults((prev) =>
        updateRelationship(prev, userId, "pending_sent"),
      );
      setSuggestedUsers((prev) =>
        updateRelationship(prev, userId, "pending_sent"),
      );

      const { error } = await sendFriendRequest(userId);
      if (error) {
        // Rollback on failure
        setSearchResults((prev) =>
          updateRelationship(prev, userId, "none"),
        );
        setSuggestedUsers((prev) =>
          updateRelationship(prev, userId, "none"),
        );
        Alert.alert("Error", error);
      }
    },
    [],
  );

  const handleCancel = useCallback(
    async (userId: string) => {
      // Optimistic update
      setSearchResults((prev) =>
        updateRelationship(prev, userId, "none"),
      );
      setSuggestedUsers((prev) =>
        updateRelationship(prev, userId, "none"),
      );

      const { error } = await removeFriendRequest(userId);
      if (error) {
        // Rollback
        setSearchResults((prev) =>
          updateRelationship(prev, userId, "pending_sent"),
        );
        setSuggestedUsers((prev) =>
          updateRelationship(prev, userId, "pending_sent"),
        );
        Alert.alert("Error", error);
      }
    },
    [],
  );

  const handleAcceptSearch = useCallback(
    async (requesterId: string) => {
      // Optimistic update
      setSearchResults((prev) =>
        updateRelationship(prev, requesterId, "accepted"),
      );

      const { error } = await acceptFriendRequest(requesterId);
      if (error) {
        // Rollback
        setSearchResults((prev) =>
          updateRelationship(prev, requesterId, "pending_received"),
        );
        Alert.alert("Error", error);
      }
    },
    [],
  );

  // ── Legacy temp-data handlers ───────────────────────────────────────────────
  const handleAcceptRequest = (id: string) => {
    const accepted = pendingRequests.find((r) => r.id === id);
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    if (accepted) {
      Alert.alert(
        "Request Accepted",
        `You are now connected with ${accepted.name}.`,
      );
    }
  };

  const handleRejectRequest = (id: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const isSearching = searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <ConnectHeader
        onBackPress={() => router.back()}
        onNotificationPress={() =>
          Alert.alert("Notifications", "You have no new notifications.")
        }
      />

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 40 + insets.bottom },
        ]}
      >
        {/* Search Bar */}
        <ConnectSearchBar value={searchQuery} onChangeText={handleSearchChange} />

        {isSearching ? (
          /* ── Search Mode ─────────────────────────────────────────── */
          <View style={styles.section}>
            {isSearchLoading ? (
              /* Loading state – use HeartBeatWave per project convention */
              <View style={styles.loadingContainer}>
                <HeartBeatWave
                  width={180}
                  color={ResQColors.primaryRed}
                  thickness={5}
                />
                <Text style={styles.loadingText}>Searching…</Text>
              </View>
            ) : searchError ? (
              /* Error state */
              <View style={styles.emptyContainer}>
                <AlertTriangle size={44} color={ResQColors.statusAmber} />
                <Text style={styles.emptyTitle}>Something went wrong</Text>
                <Text style={styles.emptySubtext}>{searchError}</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>
                  People ({searchResults.length})
                </Text>
                {searchResults.map((item) => (
                  <FriendSearchResultCard
                    key={item.id}
                    item={item}
                    onAdd={handleAdd}
                    onAccept={handleAcceptSearch}
                    onCancel={handleCancel}
                  />
                ))}
              </>
            ) : (
              /* No results */
              <View style={styles.emptyContainer}>
                <SearchX size={44} color={ResQColors.textMuted} />
                <Text style={styles.emptyTitle}>No search results found</Text>
                <Text style={styles.emptySubtext}>
                  We couldn't find anyone matching "{searchQuery}".
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* ── Default Mode ─────────────────────────────────────────── */
          <>
            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Pending Requests</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {pendingRequests.length} New
                    </Text>
                  </View>
                </View>

                {pendingRequests.map((item) => (
                  <PendingRequestCard
                    key={item.id}
                    item={item}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                  />
                ))}
              </View>
            )}

            {/* Suggested Responders Section */}
            {suggestedUsers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>
                  Suggested Responders
                </Text>

                {suggestedUsers.map((item) => (
                  <FriendSearchResultCard
                    key={item.id}
                    item={item}
                    onAdd={handleAdd}
                    onAccept={handleAcceptSearch}
                    onCancel={handleCancel}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  scrollContent: {
    paddingTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: ResQColors.textPrimary,
  },
  badge: {
    backgroundColor: ResQColors.primaryRedBorder,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: ResQColors.primaryRed,
  },
  // ── Loading ──────────────────────────────────────────────────
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  loadingText: {
    fontFamily: typography.medium,
    fontSize: 14,
    color: ResQColors.textMuted,
    marginTop: 8,
  },
  // ── Empty / Error ─────────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: typography.bold,
    fontSize: 16.5,
    color: ResQColors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: typography.regular,
    fontSize: 14,
    color: ResQColors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
