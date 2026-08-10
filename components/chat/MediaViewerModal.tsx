import { Image } from "expo-image";
import { X } from "lucide-react-native";
import React from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";

interface MediaViewerModalProps {
  visible: boolean;
  activeMedia: { uri: string; type: "image" | "video" } | null;
  onClose: () => void;
}

export default function MediaViewerModal({
  visible,
  activeMedia,
  onClose,
}: MediaViewerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.lightboxBackdrop}>
        <TouchableOpacity style={styles.lightboxCloseBtn} onPress={onClose}>
          <X size={22} color="#FFFFFF" />
        </TouchableOpacity>
        {activeMedia && (
          <Image
            source={{ uri: activeMedia.uri }}
            style={styles.fullScreenImg}
            contentFit="contain"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImg: {
    width: "100%",
    height: "80%",
  },
});
