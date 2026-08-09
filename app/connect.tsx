import ConnectHeader from "@/components/connect/ConnectHeader";
import ConnectSearchBar from "@/components/connect/ConnectSearchBar";
import PendingRequestCard from "@/components/connect/PendingRequestCard";
import SuggestedResponderCard from "@/components/connect/SuggestedResponderCard";
import { ResQColors } from "@/constants/Colors";
import { PendingRequest, SuggestedResponder } from "@/constants/interfaces";
import {
    DEFAULT_PENDING_REQUESTS,
    DEFAULT_SUGGESTED_RESPONDERS,
} from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ConnectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pending requests state initialized from tempData
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(
    DEFAULT_PENDING_REQUESTS,
  );

  // Suggested responders state initialized from tempData
  const [suggestedResponders, setSuggestedResponders] = useState<
    SuggestedResponder[]
  >(DEFAULT_SUGGESTED_RESPONDERS);

  // Handlers
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

  const handleToggleConnect = (id: string) => {
    setSuggestedResponders((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.isRequested;
          if (nextState) {
            Alert.alert(
              "Connection Requested",
              `Request sent to ${item.name}.`,
            );
          }
          return { ...item, isRequested: nextState };
        }
        return item;
      }),
    );
  };

  // Search filtering
  const queryLower = searchQuery.trim().toLowerCase();
  const filteredPending = pendingRequests.filter(
    (item) =>
      item.name.toLowerCase().includes(queryLower) ||
      item.role.toLowerCase().includes(queryLower) ||
      item.distance.toLowerCase().includes(queryLower),
  );

  const filteredSuggested = suggestedResponders.filter(
    (item) =>
      item.name.toLowerCase().includes(queryLower) ||
      item.role.toLowerCase().includes(queryLower) ||
      item.distance.toLowerCase().includes(queryLower),
  );

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
        <ConnectSearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {/* Pending Requests Section */}
        {filteredPending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {filteredPending.length} New
                </Text>
              </View>
            </View>

            {filteredPending.map((item) => (
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>
            Suggested Responders
          </Text>

          {filteredSuggested.map((item) => (
            <SuggestedResponderCard
              key={item.id}
              item={item}
              onToggleConnect={handleToggleConnect}
            />
          ))}
        </View>
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
});
