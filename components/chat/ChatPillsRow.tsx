import { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface PillItem {
  label: string;
  action: string;
  icon?: React.ComponentType<any>;
}

interface ChatPillsRowProps {
  pills: PillItem[];
  onPillPress: (item: PillItem) => void;
}

export default function ChatPillsRow({ pills, onPillPress }: ChatPillsRowProps) {
  return (
    <View style={styles.pillsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
        keyboardShouldPersistTaps="handled"
      >
        {pills.map((item) => {
          const IconComp = item.icon;
          const isWalk = item.action === "walk_safe";
          const isOk = item.action === "im_okay";
          const isLoc = item.action === "location";

          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => onPillPress(item)}
              style={[
                styles.pillBtn,
                isWalk && styles.pillWalkSafe,
                isOk && styles.pillImOkay,
                isLoc && styles.pillShareLoc,
              ]}
              activeOpacity={0.8}
            >
              {IconComp && (
                <IconComp
                  size={13}
                  color={
                    isWalk
                      ? ResQColors.primaryRedText
                      : isOk
                        ? ResQColors.statusGreen
                        : isLoc
                          ? DESIGN_COLORS.tertiary
                          : ResQColors.textMuted
                  }
                  style={{ marginRight: 5 }}
                />
              )}
              <Text
                style={[
                  styles.pillText,
                  isWalk && styles.pillTextWalkSafe,
                  isOk && styles.pillTextImOkay,
                  isLoc && styles.pillTextShareLoc,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pillsContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  pillsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillWalkSafe: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  pillImOkay: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  pillShareLoc: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  pillText: {
    fontSize: 12.5,
    fontFamily: typography.semibold,
    color: "#334155",
  },
  pillTextWalkSafe: {
    color: ResQColors.primaryRedText,
    fontFamily: typography.bold,
  },
  pillTextImOkay: {
    color: "#166534",
    fontFamily: typography.bold,
  },
  pillTextShareLoc: {
    color: "#0D9488",
    fontFamily: typography.bold,
  },
});
