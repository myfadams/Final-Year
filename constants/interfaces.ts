export interface Person {
  id: string;
  name: string;
  address: string;
  avatarColor: string;
  markerColor: string;
  latitude: number;
  longitude: number;
  urgency: "critical" | "high" | "medium";
  description?: string;
  title?: string;
  creatorId?: string;
  images?: string[];
  requesterDesc?: string;
  knownHealthProblems?: string[];
  falseAlarm?: boolean;
  isResolved?: boolean;
}
export interface ContactsProp {
  id: string | number;
  initials: string;
  name: string;
  relationship: string;
  status: string;
  statusColor: string;
  avatarColor: string;
  avatarTextColor: string;
  category?: string;
  verified?: boolean;
  hasLeftAccent?: boolean;
  phone?: string;
  avatarUrl?: string;
  badgeType?: string;
  isTrustedNetwork?: boolean;
  /** Preview text of the most recent message in this contact's chat, if any. */
  lastMessagePreview?: string | null;
  /** ISO timestamp of the most recent message, used to render a relative time next to the preview. */
  lastMessageAt?: string | null;
  /** When the last message is one of the safety-feature types, renders a special bubble instead of plain preview text. */
  lastMessageKind?: "text" | "audio" | "media" | "location_share" | "walk_safe" | "im_okay" | null;
  /** Count of messages from this contact received since the chat was last opened on this device. */
  unreadCount?: number;
}
export interface HomeButton {
  Icon: React.ReactNode;
  text: string;
  isLoading?: boolean;
  buttonColor: string;
  subText: string;
  iconColor: string;
  onPress?: () => void;
}

export interface caseProp {
  id: string | number;
  title: string;
  description: string;
  location: string;
  distance: number;
  time: number;
  severity: "Critical" | "Moderate" | "Low" | "Resolved";
  isResolved: boolean;
  // color: string;
  responders: number;
  action: "Respond" | "Details" | "View" | "Help" | "";
  creatorID: string;
  falseAlarm: boolean;
  responseTime: number;
  lat?: string;
  lng?: string;
}

export interface PendingRequest {
  id: string;
  name: string;
  role: string;
  distance: string;
  avatarUrl: string;
}

export interface SuggestedResponder {
  id: string;
  name: string;
  role: string;
  distance: string;
  avatarUrl: string;
  isOnline?: boolean;
  isRequested?: boolean;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  publisher: string;
  time: string;
  image: string;
  leftAccent?: string;
  isFeatured?: boolean;
  content: string;
  // Raw ISO publish timestamp, distinct from `time` (a pre-formatted display string) — used
  // wherever a real sortable/comparable date is needed, e.g. notification recency checks.
  publishedAtIso?: string;
}

export interface ChatMessage {
  id: string;
  chatId?: string;
  senderId?: string;
  sender: "me" | "other" | "system";
  senderName?: string;
  senderRole?: string;
  senderAvatar?: string;
  timestamp: string;
  type: "text" | "audio" | "media" | "location_share" | "walk_safe" | "im_okay" | "system" | "location";
  text?: string;
  audioUri?: string;
  audioDuration?: number;
  isUploading?: boolean;
  uploadProgress?: number;
  mediaUri?: string;
  mediaType?: "image" | "video";
  locationCoords?: { latitude: number; longitude: number };
  locationTimestampText?: string;
  locationLabel?: string;
  isSystemMessage?: boolean;
  status?: "sending" | "sent" | "failed" | "pending";
  createdTimestamp?: number;
  createdAtIso?: string;
}

// ── Friend Search ─────────────────────────────────────────────────────────────

export type RelationshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "blocked";

export interface FriendSearchResult {
  id: string;
  name: string;
  profile_img_url: string | null;
  student_id_number: string | null;
  student_reference_number: string | null;
  program_of_study: string | null;
  relationship: RelationshipStatus;
  relevance_score: number;
}
