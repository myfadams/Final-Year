import { showPopupAlert } from "@/components/popupAlert";
import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import { useRouter } from "expo-router";
import {
  Newspaper,
  Search,
  SearchX,
  SlidersHorizontal
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { fetchKnustUpdates } from "@/backend/externalNews";
import { fetchPublishedNews } from "@/backend/news";
import AnotherNavBarHeader from "@/components/AnotherNavBarHeader";
import CustomInput from "@/components/CustomInput";
import HeartBeatWave from "@/components/HeartBeatWave";
import NewsCard from "@/components/NewsCard";
import NewsDetailModal from "@/components/NewsDetailModal";
import { Article } from "@/constants/interfaces";

const FILTERS = ["All", "Campus Safety Alert", "Security Notice", "Emergency Update", "General Safety News"];

export default function NewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const [newsList, setNewsList] = useState<Article[]>([]);
  const [knustUpdates, setKnustUpdates] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      try {
        const [data, externalData] = await Promise.all([
          fetchPublishedNews(),
          fetchKnustUpdates()
        ]);

        setKnustUpdates(externalData);
        const mapped: Article[] = data.map((item) => {
          let catColor = "#3B82F6"; // Default Blue
          let catBg = "#DBEAFE";

          if (item.category === "Campus Safety Alert") {
            catColor = "#EF4444";
            catBg = "#FEE2E2";
          } else if (item.category === "Security Notice") {
            catColor = "#F59E0B";
            catBg = "#FEF3C7";
          } else if (item.category === "Emergency Update") {
            catColor = "#B91C1C";
            catBg = "#FECACA";
          } else if (item.category === "Road Closure") {
            catColor = "#6B7280";
            catBg = "#F3F4F6";
          }

          return {
            id: item.id,
            title: item.title,
            category: item.category,
            categoryColor: catColor,
            categoryBg: catBg,
            publisher: item.users?.name ? item.users.name : "System Admin",
            time: item.published_at ? new Date(item.published_at).toLocaleDateString() : "Just now",
            image: item.image_url || "https://images.unsplash.com/photo-1541888075782-b7e3e9d8995a",
            content: item.content,
            isFeatured: item.category === "Emergency Update" || item.category === "Campus Safety Alert"
          };
        });
        setNewsList(mapped);
      } catch (err) {
        console.error("Failed to load news", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadNews();
  }, []);

  // Filtering logic
  const filteredArticles = newsList.filter((article) => {
    const matchesSearch = article.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "All" || article.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const hotspots = newsList.filter((a) => a.isFeatured).slice(0, 5); // top 5 hotspots
  const regularArticles = filteredArticles.filter(
    (a) => !a.isFeatured || activeFilter !== "All",
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AnotherNavBarHeader />

      {/* Search and Filters */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBarWrapper}>
          <CustomInput
            placeholder="Search news and updates..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            Icon={<Search size={20} color="#9CA3AF" />}
          />
        </View>
        <TouchableOpacity
          onPress={() =>
            showPopupAlert("Filter Settings", "Configure your feed preferences.", undefined, undefined, "info")
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
          {FILTERS.map(
            (filter) => {
              const isActive = activeFilter === filter;
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
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </ScrollView>
      </View>

      {/* News List */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          {/* <ActivityIndicator size="large" color={Colors.light.accent} /> */}
          <HeartBeatWave
            width={220}
            color={Colors.light.primary}
            thickness={7}
            style={{ marginBottom: 8 }}
          />
          <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading news...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + insets.bottom },
          ]}
        >
          {/* Hotspots Section */}
          {activeFilter === "All" && hotspots.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={styles.hotspotsTitle}>Hotspots</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                {hotspots.map((article) => (
                  <View key={article.id} style={{ width: 300, marginRight: 16 }}>
                    <NewsCard
                      article={article}
                      variant="featured"
                      onPress={() => setSelectedArticle(article)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* KNUST Updates Section */}
          {activeFilter === "All" && knustUpdates.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={styles.hotspotsTitle}>KNUST Updates</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                {knustUpdates.map((article) => (
                  <View key={article.id} style={{ width: 300, marginRight: 16 }}>
                    <NewsCard
                      article={article}
                      variant="featured"
                      onPress={() => setSelectedArticle(article)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
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
              {newsList.length === 0 ? (
                <>
                  <View style={styles.emptyIconContainer}>
                    <Newspaper size={32} color={Colors.light.accent} />
                  </View>
                  <Text style={[styles.emptyText, { fontSize: 16, color: Colors.light.text, fontFamily: typography.semibold }]}>
                    You're all caught up!
                  </Text>
                  <Text style={[styles.emptyText, { marginTop: 6, textAlign: 'center', lineHeight: 20 }]}>
                    There are no recent safety alerts or news items at the moment.
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.emptyIconContainer, { backgroundColor: '#F3F4F6' }]}>
                    <SearchX size={32} color="#6B7280" />
                  </View>
                  <Text style={[styles.emptyText, { fontSize: 16, color: Colors.light.text, fontFamily: typography.semibold }]}>
                    No matches found
                  </Text>
                  <Text style={[styles.emptyText, { marginTop: 6, textAlign: 'center', lineHeight: 20 }]}>
                    We couldn't find any news matching your search or active filter.
                  </Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}

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
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  hotspotsTitle: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: Colors.light.text,
    marginBottom: 12,
  },
});
