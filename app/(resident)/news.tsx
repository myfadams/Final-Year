import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import {
  Search,
  SlidersHorizontal
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import CustomInput from "@/components/CustomInput";
import HomeTabBar from "@/components/HomeTabBar";
import NewsCard from "@/components/NewsCard";
import NewsDetailModal from "@/components/NewsDetailModal";
import { Article } from "@/constants/interfaces";
import { articles } from "@/constants/tempData";
// import NewsCard, { Article } from "@/components/NewsCard";
// import NewsDetailModal from "@/components/NewsDetailModal";

export default function NewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "All" | "OFFICIAL" | "ADVISORY" | "COMMUNITY"
  >("All");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Mock news articles matching the mockup design

  // Filtering logic
  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "All" || article.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const featuredArticle = articles.find((a) => a.isFeatured);
  const regularArticles = filteredArticles.filter(
    (a) => !a.isFeatured || activeFilter !== "All",
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header Navigation */}
      <HomeTabBar pageTitle="news" activePage="news" />

      {/* Search and Filters */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBarWrapper}>
          <CustomInput
            placeholder="Search news and updates..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            Icon={<Search size={20} color="#9CA3AF" />}
            // borderColor="#E5E7EB"
          />
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Filter Settings", "Configure your feed preferences.")
          }
          style={styles.filterButton}
          activeOpacity={0.8}
        >
          <SlidersHorizontal size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Categories Horizontal Bar */}
      <View style={{ height: 40, marginBottom: 16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollView}
        >
          {(["All", "OFFICIAL", "ADVISORY", "COMMUNITY"] as const).map(
            (filter) => {
              const isActive = activeFilter === filter;
              const displayName =
                filter === "All"
                  ? "All"
                  : filter.charAt(0) + filter.slice(1).toLowerCase() + "s";
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterPill,
                    isActive && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {displayName}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </ScrollView>
      </View>

      {/* News List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        {/* Featured Story Hero Card - Only show when "All" or ADVISORY is filtered */}
        {activeFilter === "All" && featuredArticle && (
          <NewsCard
            article={featuredArticle}
            variant="featured"
            onPress={() => setSelectedArticle(featuredArticle)}
          />
        )}

        {/* Regular News Items List */}
        {regularArticles.map((article) => (
          <NewsCard
            key={article.id}
            article={article}
            variant="regular"
            onPress={() => setSelectedArticle(article)}
          />
        ))}

        {filteredArticles.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No news found matching your query.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Article Detail Modal View */}
      <NewsDetailModal
        article={selectedArticle}
        visible={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  customHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.light.background,
  },
  headerButton: {
    padding: 6,
    position: "relative",
  },
  headerBellBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
    borderWidth: 1.5,
    borderColor: Colors.light.background,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  headerTitleText: {
    fontSize: 24,
    fontFamily: typography.bold,
    color: "#000000",
  },
  headerTitleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
    marginLeft: 2,
    marginBottom: 6,
  },
  searchFilterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  searchBarWrapper: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6, // alignment adjustment to match CustomInput label gaps
  },
  filterScrollView: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterPillActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  filterPillText: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: Colors.light.textMuted,
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontFamily: typography.medium,
    fontSize: 14,
  },
});
