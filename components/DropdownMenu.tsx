import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

import { AlertCircle } from "lucide-react-native";

export interface DropdownOption {
  label: string;
  value: string | number;
  description?: string;
  icon?: string | React.ReactNode; // emoji, single char, or custom element
  disabled?: boolean;
}

export interface DropdownMenuProps {
  options: DropdownOption[];
  placeholder?: string;
  value?: string | number | null;
  onChange?: (option: DropdownOption) => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
  search?: boolean;
  showError?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// const COLORS = {
//   ink: "#0D0D0D",
//   paper: "#F7F3EE",
//   cream: "#EDE8E0",
//   gold: "#C9A84C",
//   goldLight: "#E8C96A",
//   goldDim: "#8A6E2F",
//   smoke: "#6B6560",
//   mist: "#A8A29C",
//   line: "#D4CEC6",
//   white: "#FFFFFF",
//   shadow: "rgba(13, 13, 13, 0.18)",
//   shadowDeep: "rgba(13, 13, 13, 0.32)",
//   overlay: "rgba(13, 13, 13, 0.45)",
// };

// const FONT = {
//   display: Platform.select({ ios: "Georgia", android: "serif" }),
//   body: Platform.select({ ios: "Helvetica Neue", android: "sans-serif" }),
//   mono: Platform.select({ ios: "Courier New", android: "monospace" }),
// };

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Chevron ──────────────────────────────────────────────────────────────────

const Chevron: React.FC<{ open: boolean; anim: Animated.Value }> = ({
  anim,
}) => {
  const rotation = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
      <View style={styles.chevronWrap}>
        <View style={[styles.chevronArm, styles.chevronLeft]} />
        <View style={[styles.chevronArm, styles.chevronRight]} />
      </View>
    </Animated.View>
  );
};

// ─── Dropdown Item ─────────────────────────────────────────────────────────────

const DropdownItem: React.FC<{
  option: DropdownOption;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}> = ({ option, isSelected, onSelect, index }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={option.disabled}
        activeOpacity={1}
        style={[
          styles.item,
          isSelected && styles.itemSelected,
          option.disabled && styles.itemDisabled,
          index === 0 && { borderTopWidth: 0 },
        ]}
      >
        {isSelected && <View style={styles.itemAccent} />}

        {option.icon ? (
          <View style={styles.itemIconWrap}>
            {typeof option.icon === "string" ? (
              <Text style={styles.itemIcon}>{option.icon}</Text>
            ) : (
              option.icon
            )}
          </View>
        ) : (
          <View style={styles.itemDot}>
            {isSelected && <View style={styles.itemDotInner} />}
          </View>
        )}

        <View style={styles.itemTextBlock}>
          <Text
            style={[
              styles.itemLabel,
              isSelected && styles.itemLabelSelected,
              option.disabled && styles.itemLabelDisabled,
            ]}
          >
            {option.label}
          </Text>
          {option.description ? (
            <Text style={styles.itemDescription}>{option.description}</Text>
          ) : null}
        </View>

        {isSelected && (
          <View style={styles.checkWrap}>
            <Text style={styles.checkMark}>✦</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  options,
  placeholder = "Select an option",
  value = null,
  onChange,
  label,
  disabled = false,
  style,
  search = false,
  showError,
}) => {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [anchorY, setAnchorY] = useState(0);
  const [anchorX, setAnchorX] = useState(0);
  const [anchorW, setAnchorW] = useState(SCREEN_W - 48);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const triggerRef = useRef<View>(null);
  const openAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const selected = options.find((o) => o.value === value) ?? null;

  const filteredOptions = search
    ? options.filter(
      (o) =>
        o.label.toLowerCase().includes(searchText.toLowerCase()) ||
        o.description?.toLowerCase().includes(searchText.toLowerCase()),
    )
    : options;

  const measureAndOpen = useCallback(() => {
    if (disabled) return;
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      const statusH =
        Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
      setAnchorX(x);
      setAnchorY(y + h - statusH + 6);
      setAnchorW(w);
      setOpen(true);
      Animated.parallel([
        Animated.spring(openAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [disabled, openAnim, fadeAnim]);

  const closeDropdown = useCallback(() => {
    Animated.parallel([
      Animated.spring(openAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 280,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setOpen(false);
      setSearchText("");
    });
  }, [openAnim, fadeAnim]);

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled) return;
    onChange?.(option);
    closeDropdown();
  };

  const translateY = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  const scaleY = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  const statusH = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const PANEL_DEFAULT_HEIGHT = 380;
  const availableBottom =
    keyboardHeight > 0 ? SCREEN_H - keyboardHeight - 16 : SCREEN_H - 16;

  let panelTop = anchorY;
  if (anchorY + PANEL_DEFAULT_HEIGHT > availableBottom) {
    panelTop = Math.max(statusH + 16, availableBottom - PANEL_DEFAULT_HEIGHT);
  }

  const maxListHeight = Math.max(120, availableBottom - panelTop - 110);

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        ref={triggerRef}
        onPress={measureAndOpen}
        disabled={disabled}
        activeOpacity={0.85}
        style={[
          styles.trigger,
          open && styles.triggerOpen,
          disabled && styles.triggerDisabled,
          !!showError && { borderColor: Colors.light.error, borderWidth: 1.5 },
        ]}
      >
        <View
          style={[styles.triggerStripe, open && styles.triggerStripeOpen]}
        />

        <View style={styles.triggerContent}>
          {selected?.icon ? (
            typeof selected.icon === "string" ? (
              <Text style={styles.triggerIcon}>{selected.icon}</Text>
            ) : (
              <View style={styles.triggerIconWrap}>{selected.icon}</View>
            )
          ) : null}
          <Text
            style={[styles.triggerText, !selected && styles.triggerPlaceholder]}
            numberOfLines={1}
          >
            {selected ? selected.label : placeholder}
          </Text>
        </View>

        <Chevron open={open} anim={openAnim} />
      </TouchableOpacity>
      {showError ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 3,
            paddingLeft: 4,
            gap: 5,
          }}
        >
          <AlertCircle size={14} color={Colors.light.error} />
          <Text
            style={{
              fontSize: 12,
              color: Colors.light.error,
              fontFamily: typography.medium,
            }}
          >
            {showError}
          </Text>
        </View>
      ) : null}

      <Modal
        transparent
        visible={open}
        animationType="none"
        onRequestClose={closeDropdown}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={closeDropdown}
              activeOpacity={1}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.panel,
              {
                top: panelTop,
                left: anchorX,
                width: anchorW,
                opacity: fadeAnim,
                transform: [{ translateY }, { scaleY }],
              },
            ]}
          >
            <View style={styles.panelHeader}>
              <View style={styles.panelRule} />
              <Text style={styles.panelCount}>
                {filteredOptions.length}{" "}
                {filteredOptions.length === 1 ? "option" : "options"}
              </Text>
              <View style={styles.panelRule} />
            </View>

            {search && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="#A8A29C"
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>
            )}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item, index }) => (
                <DropdownItem
                  option={item}
                  isSelected={item.value === value}
                  onSelect={() => handleSelect(item)}
                  index={index}
                />
              )}
              bounces={false}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: maxListHeight }}
              keyboardShouldPersistTaps="handled"
            />

            <View style={styles.panelFooter}>
              <View style={styles.panelFooterDot} />
              <View style={styles.panelFooterLine} />
              <View style={styles.panelFooterDot} />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },

  label: {
    // fontFamily: FONT.body,
    // fontSize: 11,
    fontWeight: "600",
    // letterSpacing: 2.2,
    // textTransform: "uppercase",
    // color: Colors.,
    fontSize: 14,
    color: Colors.light.text,
    fontFamily: typography.regular,
    marginBottom: 8,
    paddingLeft: 2,
  } as TextStyle,

  trigger: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: 12,
    minHeight: 56,
    paddingRight: 16,
    overflow: "hidden",
    // shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,

  triggerOpen: {
    borderColor: Colors.light.accent,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  } as ViewStyle,

  triggerDisabled: {
    opacity: 0.45,
  } as ViewStyle,

  triggerStripe: {
    width: 3,
    alignSelf: "stretch",
    // backgroundColor: COLORS.line,
    marginRight: 14,
  } as ViewStyle,

  triggerStripeOpen: {
    backgroundColor: Colors.light.accent,
  } as ViewStyle,

  triggerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  } as ViewStyle,

  triggerIcon: {
    fontSize: 20,
    lineHeight: 24,
  } as TextStyle,

  triggerText: {
    // fontFamily: FONT.display,
    fontSize: 16,
    // color: COLORS.ink,
    letterSpacing: 0.2,
    flex: 1,
  } as TextStyle,

  triggerPlaceholder: {
    // color: COLORS.mist,
    // fontFamily: FONT.body,
    fontStyle: "italic",
    fontSize: 14,

    color: Colors.light.text,
    fontFamily: typography.regular,
  } as TextStyle,

  chevronWrap: {
    width: 14,
    height: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  chevronArm: {
    position: "absolute",
    width: 9,
    height: 1.8,
    backgroundColor: Colors.light.accent,
    borderRadius: 2,
  } as ViewStyle,

  chevronLeft: {
    transform: [{ rotate: "45deg" }, { translateX: -3 }],
  } as ViewStyle,

  chevronRight: {
    transform: [{ rotate: "-45deg" }, { translateX: 3 }],
  } as ViewStyle,

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: COLORS.overlay,
  } as ViewStyle,

  panel: {
    position: "absolute",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    // shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
    overflow: "hidden",
  } as ViewStyle,

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  } as ViewStyle,

  panelRule: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.background,
  } as ViewStyle,

  panelCount: {
    // fontFamily: FONT.mono,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    // color: COLORS.mist,
  } as TextStyle,

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 18,
    paddingLeft: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.accent,
    backgroundColor: "transparent",
    minHeight: 58,
    gap: 12,
  } as ViewStyle,

  itemSelected: {
    backgroundColor: Colors.light.accent,
  } as ViewStyle,

  itemDisabled: {
    opacity: 0.38,
  } as ViewStyle,

  itemAccent: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: Colors.light.background,
    borderRadius: 2,
  } as ViewStyle,

  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    // borderColor: COLORS.line,
  } as ViewStyle,

  itemIcon: {
    fontSize: 16,
    lineHeight: 20,
  } as TextStyle,

  itemDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  } as ViewStyle,

  itemDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    // backgroundColor: COLORS.gold,
  } as ViewStyle,

  itemTextBlock: {
    flex: 1,
    gap: 2,
  } as ViewStyle,

  itemLabel: {
    // fontFamily: FONT.display,
    fontSize: 15,
    // color: COLORS.ink,
    letterSpacing: 0.1,
  } as TextStyle,

  itemLabelSelected: {
    // color: COLORS.goldDim,
    fontWeight: "600",
  } as TextStyle,

  itemLabelDisabled: {
    // color: COLORS.mist,
  } as TextStyle,

  itemDescription: {
    // fontFamily: FONT.body,
    fontSize: 11.5,
    // color: COLORS.smoke,
    letterSpacing: 0.1,
    marginTop: 1,
  } as TextStyle,

  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    // backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  checkMark: {
    fontSize: 10,
    // color: COLORS.white,
    lineHeight: 14,
  } as TextStyle,

  panelFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 6,
  } as ViewStyle,

  panelFooterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    // backgroundColor: COLORS.gold,
    opacity: 0.6,
  } as ViewStyle,

  panelFooterLine: {
    flex: 1,
    height: 1,
    // backgroundColor: COLORS.line,
  } as ViewStyle,

  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  } as ViewStyle,

  searchInput: {
    height: 40,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderColor: Colors.light.accent,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: Colors.light.text,
    fontFamily: typography.regular,
  } as TextStyle,

  triggerIconWrap: {
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
});

export default DropdownMenu;

// ─── Usage Example ────────────────────────────────────────────────────────────
//
// import DropdownMenu, { DropdownOption } from "./DropdownMenu";
//
// const OPTIONS: DropdownOption[] = [
//   { label: "Japanese",          value: "jp", icon: "🍱", description: "Sushi, ramen, tempura"     },
//   { label: "Italian",           value: "it", icon: "🍝", description: "Pasta, risotto, pizza"     },
//   { label: "Mexican",           value: "mx", icon: "🌮", description: "Tacos, enchiladas, mole"   },
//   { label: "Indian",            value: "in", icon: "🍛", description: "Curry, biryani, dosa"      },
//   { label: "French",            value: "fr", icon: "🥐", description: "Croissants, cassoulet"     },
//   { label: "Ethiopian",         value: "et", icon: "🫓", description: "Injera, doro wat, kitfo"   },
//   { label: "Fusion (Disabled)", value: "fuse",           disabled: true                           },
// ];
//
// const [cuisine, setCuisine] = useState<string | null>(null);
//
// <DropdownMenu
//   label="Cuisine"
//   options={OPTIONS}
//   value={cuisine}
//   placeholder="Choose a cuisine…"
//   onChange={(opt) => setCuisine(String(opt.value))}
// />
