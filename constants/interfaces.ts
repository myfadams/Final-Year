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
export const URGENCY_LABELS = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
};
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

export interface Article {
  id: string;
  title: string;
  category: "ADVISORY" | "OFFICIAL" | "COMMUNITY";
  categoryColor: string;
  categoryBg: string;
  publisher: string;
  time: string;
  image: string;
  leftAccent?: string;
  isFeatured?: boolean;
  content: string;
}
