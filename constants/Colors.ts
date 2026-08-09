const tintColorLight = "#af101a"; // Primary Brand color (Emergency Red style)
const tintColorDark = "#ffb3ac"; // Inverse Primary Brand color

export const DESIGN_COLORS = {
  surface: "#f9f9ff",
  surfaceDim: "#cfdaf2",
  surfaceBright: "#f9f9ff",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f0f3ff",
  surfaceContainer: "#e7eeff",
  surfaceContainerHigh: "#dee8ff",
  surfaceContainerHighest: "#d8e3fb",
  onSurface: "#111c2d",
  onSurfaceVariant: "#5b403d",
  inverseSurface: "#263143",
  inverseOnSurface: "#ecf1ff",
  outline: "#8f6f6c",
  outlineVariant: "#e4beba",
  surfaceTint: "#ba1a20",
  primary: "#af101a",
  onPrimary: "#ffffff",
  primaryContainer: "#d32f2f",
  onPrimaryContainer: "#fff2f0",
  inversePrimary: "#ffb3ac",
  secondary: "#964900",
  onSecondary: "#ffffff",
  secondaryContainer: "#fc820c",
  onSecondaryContainer: "#5e2c00",
  tertiary: "#0058a2",
  onTertiary: "#ffffff",
  tertiaryContainer: "#0770cc",
  onTertiaryContainer: "#f0f4ff",
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",
  primaryFixed: "#ffdad6",
  primaryFixedDim: "#ffb3ac",
  onPrimaryFixed: "#410003",
  onPrimaryFixedVariant: "#930010",
  secondaryFixed: "#ffdcc6",
  secondaryFixedDim: "#ffb786",
  onSecondaryFixed: "#311300",
  onSecondaryFixedVariant: "#723600",
  tertiaryFixed: "#d4e3ff",
  tertiaryFixedDim: "#a5c8ff",
  onTertiaryFixed: "#001c3a",
  onTertiaryFixedVariant: "#004786",
  background: "#f9f9ff",
  onBackground: "#111c2d",
  surfaceVariant: "#d8e3fb",
  emergencyRed: "#D32F2F",
  warningAmber: "#F57C00",
  safetyBlue: "#1976D2",
  slate900: "#0F172A",
  slate50: "#F8FAFC",
  successGreen: "#2E7D32",
} as const;

export default {
  light: {
    // Backgrounds
    background: DESIGN_COLORS.background,
    card: DESIGN_COLORS.surfaceContainerLowest,
    surface: DESIGN_COLORS.surface,
    border: DESIGN_COLORS.outlineVariant,

    // Brand
    primary: DESIGN_COLORS.primary,
    primaryDark: DESIGN_COLORS.surfaceTint,
    accent: DESIGN_COLORS.emergencyRed,

    // Text
    text: DESIGN_COLORS.onSurface,
    textMuted: DESIGN_COLORS.outline,
    textInverse: DESIGN_COLORS.onPrimary,

    // Status
    success: DESIGN_COLORS.successGreen,
    warning: DESIGN_COLORS.warningAmber,
    error: DESIGN_COLORS.error,
    info: DESIGN_COLORS.safetyBlue,

    // Tabs / Icons
    tabIconDefault: DESIGN_COLORS.outline,
    tabIconSelected: DESIGN_COLORS.primary,
  },
  URGENCY_COLORS: {
    critical: DESIGN_COLORS.emergencyRed,
    high: DESIGN_COLORS.warningAmber,
    medium: DESIGN_COLORS.safetyBlue,
  },
  URGENCY_BACKGROUND: {
    critical: DESIGN_COLORS.errorContainer,
    high: DESIGN_COLORS.secondaryFixed,
    medium: DESIGN_COLORS.tertiaryFixed,
  },
  dark: {
    /* ───────────── Backgrounds & Surfaces ───────────── */
    background: DESIGN_COLORS.slate900,
    card: DESIGN_COLORS.inverseSurface,
    surface: DESIGN_COLORS.inverseSurface,
    border: DESIGN_COLORS.outline,

    /* ───────────── Brand / Primary ───────────── */
    primary: DESIGN_COLORS.inversePrimary,
    primarySoft: DESIGN_COLORS.onPrimaryFixedVariant,
    tint: tintColorDark,

    /* ───────────── Secondary / Positive ───────────── */
    secondary: DESIGN_COLORS.secondaryFixedDim,
    secondarySoft: DESIGN_COLORS.onSecondaryFixedVariant,

    /* ───────────── Text ───────────── */
    text: DESIGN_COLORS.surfaceBright,
    textMuted: DESIGN_COLORS.surfaceDim,
    textSubtle: DESIGN_COLORS.outline,
    textInverse: DESIGN_COLORS.onSurface,

    /* ───────────── Status / Alerts ───────────── */
    success: DESIGN_COLORS.successGreen,
    warning: DESIGN_COLORS.warningAmber,
    error: DESIGN_COLORS.error,
    info: DESIGN_COLORS.safetyBlue,

    /* ───────────── Tabs / Icons ───────────── */
    tabIconDefault: DESIGN_COLORS.surfaceDim,
    tabIconSelected: tintColorDark,
  },
};

export const ResQColors = {
  // Surfaces & Backgrounds
  pageBg: "#F8F9FA",
  cardSurface: "#FFFFFF",
  cardSurfaceSoft: "#F4F6F8",
  inputSurface: DESIGN_COLORS.surfaceContainerLow,
  border: "#E5E7EB",
  borderSubtle: "#F0F3F6",
  borderStrong: DESIGN_COLORS.outline,

  // Text
  textPrimary: "#111827",
  textSecondary: "#374151",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  textSubtle: "#64748B",

  // Brand Red Theme
  primaryRed: "#9E001C",
  primaryRedDark: "#7F0016",
  primaryRedLight: "#FEF2F2",
  primaryRedBorder: "#FEE2E2",
  primaryRedText: "#BE123C",

  // Category Badges & Soft Tints
  pinkBg: "#FCE7F3",
  pinkText: "#BE123C",
  orangeBg: "#FFEDD5",
  orangeText: "#C2410C",
  greenBg: "#DCFCE7",
  greenText: "#15803D",
  purpleBg: "#F3E8FF",
  purpleText: "#7E22CE",

  // Role / Status Badges
  badgeGrayBg: "#E2E8F0",
  badgeGrayText: "#475569",
  badgeAmberBg: "#FEF3C7",
  badgeAmberText: "#92400E",
  statusGreen: "#22C55E",
  statusAmber: "#F59E0B",

  // Legacy Mapped Tokens
  teal: DESIGN_COLORS.primary,
  tealDark: DESIGN_COLORS.surfaceTint,
  tealDeep: DESIGN_COLORS.onPrimaryFixed,
  tealLight: DESIGN_COLORS.primaryFixed,
  red: DESIGN_COLORS.emergencyRed,
  redDark: DESIGN_COLORS.onPrimaryFixedVariant,
  redDeeper: DESIGN_COLORS.onPrimaryFixed,
  redLight: DESIGN_COLORS.errorContainer,
  redBorder: DESIGN_COLORS.outlineVariant,
  amber: DESIGN_COLORS.warningAmber,
  amberDark: DESIGN_COLORS.onSecondaryFixedVariant,
  amberDeeper: DESIGN_COLORS.onSecondaryFixed,
  amberLight: DESIGN_COLORS.secondaryFixed,
  amberBorder: DESIGN_COLORS.secondaryFixedDim,
  green: DESIGN_COLORS.successGreen,
  greenDark: DESIGN_COLORS.onTertiaryFixedVariant,
  greenDeeper: DESIGN_COLORS.onTertiaryFixed,
  greenLight: DESIGN_COLORS.tertiaryFixed,
  greenBorder: DESIGN_COLORS.outlineVariant,
  avatarTeal: DESIGN_COLORS.primaryFixed,
  avatarBlue: DESIGN_COLORS.tertiaryFixed,
  avatarAmber: DESIGN_COLORS.secondaryFixed,
  avatarGray: DESIGN_COLORS.surfaceDim,
  avatarTealText: DESIGN_COLORS.onPrimaryFixed,
  avatarBlueText: DESIGN_COLORS.onTertiaryFixed,
  avatarAmberText: DESIGN_COLORS.onSecondaryFixed,
  avatarGrayText: DESIGN_COLORS.onSurface,
} as const;

export type ResQColor = (typeof ResQColors)[keyof typeof ResQColors];
