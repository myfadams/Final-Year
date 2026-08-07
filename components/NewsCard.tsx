import Colors from "@/constants/Colors";
import { Article } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { Clock } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface NewsCardProps {
  article: Article;
  variant?: "featured" | "regular";
  onPress: () => void;
}

export default function NewsCard({
  article,
  variant = "regular",
  onPress,
}: NewsCardProps) {
  const isFeatured = variant === "featured";

  if (isFeatured) {
    return (
      <TouchableOpacity
        style={styles.featuredContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: article.image }}
          style={styles.featuredImage}
          contentFit="cover"
          transition={200}
        />
        {/* Shadow Overlay Gradient effect with semi-transparent black */}
        <View style={styles.featuredGradient} />

        <View style={styles.featuredContent}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: article.categoryBg },
            ]}
          >
            <Text
              style={[styles.categoryText, { color: article.categoryColor }]}
            >
              {article.category}
            </Text>
          </View>

          <Text style={styles.featuredTitle} numberOfLines={3}>
            {article.title}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.publisherTextFeatured}>
              {article.publisher}
            </Text>
            <View style={styles.dotSeparatorFeatured} />
            <View style={styles.timeContainer}>
              <Clock size={12} color="#E5E7EB" style={styles.metaIcon} />
              <Text style={styles.timeTextFeatured}>{article.time}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Regular Variant (Horizontal row layout)
  return (
    <TouchableOpacity
      style={styles.regularContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {article.leftAccent && (
        <View
          style={[
            styles.leftAccentBar,
            { backgroundColor: article.leftAccent },
          ]}
        />
      )}

      <View style={styles.regularTextContent}>
        <View style={styles.regularTopRow}>
          <View
            style={[
              styles.categoryBadgeSmall,
              { backgroundColor: article.categoryBg },
            ]}
          >
            <Text
              style={[
                styles.categoryTextSmall,
                { color: article.categoryColor },
              ]}
            >
              {article.category}
            </Text>
          </View>
        </View>

        <Text style={styles.regularTitle} numberOfLines={2}>
          {article.title}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.publisherTextRegular} numberOfLines={1}>
            {article.publisher}
          </Text>
          <View style={styles.dotSeparatorRegular} />
          <View style={styles.timeContainer}>
            <Clock
              size={11}
              color={Colors.light.textMuted}
              style={styles.metaIcon}
            />
            <Text style={styles.timeTextRegular}>{article.time}</Text>
          </View>
        </View>
      </View>

      <Image
        source={{ uri: article.image }}
        style={styles.regularImage}
        contentFit="cover"
        transition={200}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  featuredContainer: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#1F2937",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    position: "relative",
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)", // Modern card darken filter
  },
  featuredContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    justifyContent: "flex-end",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 20,
    fontFamily: typography.bold,
    color: "#FFFFFF",
    lineHeight: 26,
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  publisherTextFeatured: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: "#E5E7EB",
  },
  dotSeparatorFeatured: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 8,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: 4,
  },
  timeTextFeatured: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: "#D1D5DB",
  },

  // Regular Variant Styling
  regularContainer: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  leftAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  regularTextContent: {
    flex: 1,
    paddingRight: 12,
    justifyContent: "space-between",
  },
  regularTopRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  categoryBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryTextSmall: {
    fontSize: 9.5,
    fontFamily: typography.bold,
    letterSpacing: 0.3,
  },
  regularTitle: {
    fontSize: 14.5,
    fontFamily: typography.semibold,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  publisherTextRegular: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: Colors.light.textMuted,
    maxWidth: "60%",
  },
  dotSeparatorRegular: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.light.border,
    marginHorizontal: 6,
  },
  timeTextRegular: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
  },
  regularImage: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
});
