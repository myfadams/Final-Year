import { NotificationCategoryKey } from "@/backend/notificationPreferences";
import { Clock, Flame, MapPin, ShieldAlert } from "lucide-react-native";
import React from "react";

export const CATEGORY_ICONS: Record<
  NotificationCategoryKey,
  React.ComponentType<{ size: number; color: string; strokeWidth?: number }>
> = {
  nearbyEmergencies: MapPin,
  recentDigest: Clock,
  hotspotAlerts: Flame,
  trustedNetworkSos: ShieldAlert,
};
