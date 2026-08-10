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
  activeSharedLocation: null as SharedLocationPin | null,
  isWalkSafeRoutingActive: false as boolean,
};
