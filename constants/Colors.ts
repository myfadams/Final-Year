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
  URGENCY_BACKGROUND: {
    critical: "#DECACA",
    high: "#FAEEDA",
    medium: "#E1F5EE",
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
export const ResQColors = {
  // Surfaces
  pageBg: "#F5F5F3",
  cardSurface: "#FFFFFF",
  inputSurface: "#F5F5F3",
  border: "#E8E6E0",
  borderStrong: "#D3D1C7",

  // Text
  textPrimary: "#1A1A1A",
  textSecondary: "#5F5E5A",
  textMuted: "#888780",
  textFaint: "#B4B2A9",

  // Brand
  teal: "#1D9E75",
  tealDark: "#0F6E56",
  tealDeep: "#085041",
  tealLight: "#E1F5EE",

  // Critical / danger
  red: "#E24B4A",
  redDark: "#A32D2D",
  redDeeper: "#791F1F",
  redLight: "#FCEBEB",
  redBorder: "#F09595",

  // Moderate / warning
  amber: "#EF9F27",
  amberDark: "#854F0B",
  amberDeeper: "#633806",
  amberLight: "#FAEEDA",
  amberBorder: "#FAC775",

  // Low / resolved
  green: "#639922",
  greenDark: "#3B6D11",
  greenDeeper: "#27500A",
  greenLight: "#EAF3DE",
  greenBorder: "#C0DD97",

  // Avatar tints
  avatarTeal: "#E1F5EE",
  avatarBlue: "#E6F1FB",
  avatarAmber: "#FAEEDA",
  avatarGray: "#F1EFE8",

  // Avatar text (on their tints)
  avatarTealText: "#085041",
  avatarBlueText: "#0C447C",
  avatarAmberText: "#633806",
  avatarGrayText: "#444441",
} as const;

export type ResQColor = (typeof ResQColors)[keyof typeof ResQColors];
