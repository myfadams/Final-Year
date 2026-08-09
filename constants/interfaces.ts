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
  images?: string[];
  requesterDesc?: string;
  knownHealthProblems?: string[];
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
  hasMessage?: boolean;
  phone?: string;
  avatarUrl?: string;
  badgeType?: string;
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
