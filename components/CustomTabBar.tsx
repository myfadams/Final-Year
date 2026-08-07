import Colors from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import {
  House,
  MapPin,
  Megaphone,
  Newspaper,
  Users,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

interface TabButtonProps {
  routeName: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  getIcon: (color: string, focused: boolean) => React.ReactNode;
  tintColor: string;
}

const TabButton: React.FC<TabButtonProps> = ({
  routeName,
  label,
  isFocused,
  onPress,
  getIcon,
  tintColor,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.15 : 1.0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
      Animated.spring(translate, {
        toValue: isFocused ? -3 : 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 4,
      }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ scale }, { translateY: translate }] },
        ]}
      >
        {getIcon(tintColor, isFocused)}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: tintColor,
            fontFamily: isFocused ? typography.semibold : typography.medium,
            fontSize: isFocused ? 10.5 : 10,
          },
        ]}
      >
        {label}
      </Text>
      {isFocused && (
        <View style={[styles.activeDot, { backgroundColor: tintColor }]} />
      )}
    </TouchableOpacity>
  );
};

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  // Bottom-anchored tab bar dimensions
  const TAB_BAR_HEIGHT = 72;
  const w = width;
  const h = TAB_BAR_HEIGHT + insets.bottom;
  const r = 24; // top corner radius
  const cp = w / 2;
  const cutWidth = 50;
  const cutDepth = 25;

  // Custom SVG path drawing a bottom-anchored card:
  // - Starts at top-left corner
  // - Curves to top edge
  // - Bezier cutout in the middle
  // - Line to top-right
  // - Curves to right edge
  // - Line to bottom-right (sharp corner at bottom of screen)
  // - Line to bottom-left (sharp corner at bottom of screen)
  // - Line back to start
  const path = `
    M 0 ${r}
    Q 0 0 ${r} 0
    L ${cp - cutWidth} 0
    C ${cp - cutWidth + 16} 0, ${cp - 20} ${cutDepth}, ${cp} ${cutDepth}
    C ${cp + 20} ${cutDepth}, ${cp + cutWidth - 16} 0, ${cp + cutWidth} 0
    L ${w - r} 0
    Q ${w} 0 ${w} ${r}
    L ${w} ${h}
    L 0 ${h}
    Z
  `;

  const renderTab = (routeName: string, label: string, index: number) => {
    const route = state.routes.find((r: any) => r.name === routeName);
    if (!route) return null;

    const isFocused = state.index === state.routes.indexOf(route);

    const handlePress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const getIcon = (color: string, focused: boolean) => {
      const size = 22;
      const strokeWidth = focused ? 2.5 : 2;
      switch (routeName) {
        case "home":
          return <House size={size} color={color} strokeWidth={strokeWidth} />;
        case "alerts":
          return (
            <Megaphone size={size} color={color} strokeWidth={strokeWidth} />
          );
        case "contacts":
          return <Users size={size} color={color} strokeWidth={strokeWidth} />;
        case "news":
          return (
            <Newspaper size={size} color={color} strokeWidth={strokeWidth} />
          );
        default:
          return <House size={size} color={color} strokeWidth={strokeWidth} />;
      }
    };

    const activeColor = Colors.light.primary; // #af101a (primary branding red)
    const inactiveColor = "#8A9A9D";
    const tintColor = isFocused ? activeColor : inactiveColor;

    return (
      <TabButton
        key={route.key}
        routeName={routeName}
        label={label}
        isFocused={isFocused}
        onPress={handlePress}
        getIcon={getIcon}
        tintColor={tintColor}
      />
    );
  };

  const lastMapPress = useRef<number>(0);
  const mapRoute = state.routes.find((r: any) => r.name === "map");
  const isMapFocused = mapRoute
    ? state.index === state.routes.indexOf(mapRoute)
    : false;

  const handleMapPress = () => {
    if (mapRoute) {
      const now = Date.now();
      const doublePress = now - lastMapPress.current < 400;
      lastMapPress.current = now;

      const event = navigation.emit({
        type: "tabPress",
        target: mapRoute.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        if (doublePress) {
          // Double press detected - force recenter
          navigation.navigate(mapRoute.name, { recenter: now.toString() });
        } else if (!isMapFocused) {
          navigation.navigate(mapRoute.name);
        }
      }
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: h,
          width: w,
        },
      ]}
    >
      {/* Curved SVG Background with Vertical Linear Gradient and subtle border */}
      <Svg width={w} height={h} style={styles.svg}>
        <Defs>
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#F9FAFB" />
          </LinearGradient>
        </Defs>
        <Path d={path} fill="url(#bgGrad)" stroke="#E2E8F0" strokeWidth={1} />
      </Svg>

      {/* Floating Center Button */}
      <TouchableOpacity
        onPress={handleMapPress}
        activeOpacity={0.85}
        style={[
          styles.mapFab,
          { left: cp - 28 }, // center it (diameter is 56)
        ]}
      >
        {/* FAB Circular Linear Gradient */}
        <Svg width={56} height={56} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="fabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FF8E8E" />
              <Stop offset="100%" stopColor="#FF5252" />
            </LinearGradient>
            <LinearGradient
              id="fabGradActive"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#FF8E8E" />
              <Stop offset="100%" stopColor="#af101a" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={28}
            cy={28}
            r={28}
            fill={isMapFocused ? "url(#fabGradActive)" : "url(#fabGrad)"}
          />
        </Svg>
        <View style={styles.mapFabContent}>
          <MapPin size={22} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.mapFabText}>Map</Text>
        </View>
      </TouchableOpacity>

      {/* Symmetrical Action Tabs */}
      <View style={styles.tabContentContainer}>
        {renderTab("home", "Home", 0)}
        {renderTab("alerts", "Alerts", 1)}

        {/* Spacer for center Map FAB */}
        <View style={styles.centerSpacer} />

        {renderTab("contacts", "Contacts", 3)}
        {renderTab("news", "News", 4)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  svg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabContentContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 72,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 4,
  },
  iconContainer: {
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: typography.medium,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  centerSpacer: {
    width: 64,
    height: "100%",
  },
  mapFab: {
    position: "absolute",
    top: -18,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FF6B6B",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  mapFabContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  mapFabText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: typography.bold,
    marginTop: 1,
  },
  avatarWrapper: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1,
    borderColor: "#E8E6E0",
    overflow: "hidden",
  },
  activeAvatarWrapper: {
    borderColor: Colors.light.primary,
    borderWidth: 1.5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
});
