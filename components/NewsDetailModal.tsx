import Colors from "@/constants/Colors";
import { Article } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import { Image } from "expo-image";
import { Calendar, Clock, Share2, Shield, X } from "lucide-react-native";
import React from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface NewsDetailModalProps {
  article: Article | null;
  visible: boolean;
  onClose: () => void;
}

export default function NewsDetailModal({
  article,
  visible,
  onClose,
}: NewsDetailModalProps) {
  if (!article) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        title: article.title,
        message: `*${article.category} Update from ResQ*\n\n*${article.title}*\nPublished by ${article.publisher} (${article.time})\n\n${article.content}\n\n_Stay informed with ResQ Emergency Response App._`,
      });
    } catch (error) {
      Alert.alert("Error", "Could not share this article.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Tap outside to close */}
        <TouchableOpacity
          style={styles.backdropPressable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Top Grab Handle Indicator */}
          <View style={styles.grabHandle} />

          {/* Action Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>ResQ Newsfeed</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.actionIconButton}
                activeOpacity={0.7}
              >
                <Share2 size={20} color={Colors.light.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeIconButton}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Main Article Image */}
            <Image
              source={{ uri: article.image }}
              style={styles.articleImage}
              contentFit="cover"
              transition={200}
            />

            {/* Content Area */}
            <View style={styles.articleBodyContainer}>
              {/* Category & Accent */}
              <View style={styles.categoryRow}>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: article.categoryBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: article.categoryColor },
                    ]}
                  >
                    {article.category}
                  </Text>
                </View>
                {article.isFeatured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredText}>FEATURED STORY</Text>
                  </View>
                )}
              </View>

              {/* Title */}
              <Text style={styles.articleTitle}>{article.title}</Text>

              {/* Publisher & Info Bar */}
              <View style={styles.publisherBar}>
                <View style={styles.publisherAvatar}>
                  <Shield size={16} color={article.categoryColor} />
                </View>
                <View style={styles.publisherDetails}>
                  <Text style={styles.publisherName}>{article.publisher}</Text>
                  <View style={styles.metaSubRow}>
                    <Clock
                      size={12}
                      color={Colors.light.textMuted}
                      style={styles.metaIcon}
                    />
                    <Text style={styles.publisherMetaText}>{article.time}</Text>
                    <View style={styles.dotSeparator} />
                    <Calendar
                      size={12}
                      color={Colors.light.textMuted}
                      style={styles.metaIcon}
                    />
                    <Text style={styles.publisherMetaText}>Today</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Main Content Paragraphs */}
              <Text style={styles.articleContentText}>{article.content}</Text>
            </View>
          </ScrollView>

          {/* Bottom CTA Area */}
          <SafeAreaView style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissButtonText}>Done Reading</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)", // Semi-transparent Slate 900 overlay
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "88%",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    overflow: "hidden",
  },
  grabHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: Colors.light.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  articleImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#F3F4F6",
  },
  articleBodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
  featuredBadge: {
    backgroundColor: "#FFF2F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFB3AC",
  },
  featuredText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: Colors.light.primary,
    letterSpacing: 0.5,
  },
  articleTitle: {
    fontSize: 22,
    fontFamily: typography.bold,
    color: Colors.light.text,
    lineHeight: 28,
    marginBottom: 16,
  },
  publisherBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  publisherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginRight: 10,
  },
  publisherDetails: {
    flex: 1,
  },
  publisherName: {
    fontSize: 13.5,
    fontFamily: typography.semibold,
    color: Colors.light.text,
    marginBottom: 2,
  },
  metaSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: 3,
  },
  publisherMetaText: {
    fontSize: 11.5,
    fontFamily: typography.regular,
    color: Colors.light.textMuted,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.light.border,
    marginHorizontal: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  articleContentText: {
    fontSize: 15.5,
    fontFamily: typography.regular,
    color: Colors.light.text,
    lineHeight: 24,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  dismissButton: {
    backgroundColor: Colors.light.primary,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  dismissButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: typography.bold,
  },
});
