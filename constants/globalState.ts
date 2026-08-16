import { UserProfile } from "@/backend/auth";
import { Person } from "@/constants/interfaces";
import type { ActiveSosMonitoringPin } from "@/components/MapViewComponent";

export interface SharedLocationPin {
  id: string;
  senderName: string;
  senderAvatar: string;
  latitude: number;
  longitude: number;
  type: "location_share" | "walk_safe";
  timestampText: string;
  createdAt: number; // Date.now() timestamp when original message was sent
  messageText?: string;
  hasImOkay?: boolean; // True if sender sent "I'm okay" message
  imOkayTimestamp?: number;
  reopenedAt?: number; // Timestamp when user re-opened the map for an expired snapshot pin
  dismissed?: boolean; // Pin hidden from map (after 5 mins)
  cardDismissed?: boolean;
  isTrackingActive?: boolean; // Active routing mode enabled from floating card
}
export const globalState = {
  activeEmergencyId: null as string | null,
  activeEmergencyPerson: null as Person | null,
  activeSharedLocation: null as SharedLocationPin | null,
  activeSosMonitoring: null as ActiveSosMonitoringPin | null,
  isWalkSafeRoutingActive: false as boolean,
  userProfile: null as UserProfile | null,
};

