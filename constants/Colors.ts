const tintColorLight = "#1E40AF";
const tintColorDark = "#4F7DF3";

export default {
  light: {
    // Backgrounds
    background: "#F4F4F4",
    card: "#FFFFFF",
    surface: "#EDEDED",
    border: "#D1D5DB",

    // Brand
    primary: "#018790", // main action color
    primaryDark: "#005461", // headers, emphasis
    accent: "#00B7B5", // highlights / FAB

    // Text
    text: "#005461",
    textMuted: "#6B7280",
    textInverse: "#FFFFFF",

    // Status (balanced to fit teal palette)
    success: "#1BAA83",
    warning: "#F59E0B",
    error: "#DC2626",
    info: "#00B7B5",

    // Tabs / Icons
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#018790",
  },
  URGENCY_COLORS: {
    critical: "#FF3B3B",
    high: "#FF9500",
    medium: "#34C759",
  },
  dark: {
    /* ───────────── Backgrounds & Surfaces ───────────── */
    background: "#030712", // deep blue-black
    card: "#0B1220",
    surface: "#111827",
    border: "#1F2937",

    /* ───────────── Brand / Primary ───────────── */
    primary: "#4F7DF3", // soft electric blue
    primarySoft: "#1E3A8A",
    tint: tintColorDark,

    /* ───────────── Secondary / Positive ───────────── */
    secondary: "#22C55E",
    secondarySoft: "#14532D",

    /* ───────────── Text ───────────── */
    text: "#F9FAFB",
    textMuted: "#9CA3AF",
    textSubtle: "#6B7280",
    textInverse: "#030712",

    /* ───────────── Status / Alerts ───────────── */
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#F87171",
    info: "#38BDF8",

    /* ───────────── Tabs / Icons ───────────── */
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColorDark,
  },
};
