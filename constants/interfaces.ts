export interface Person {
  id: string;
  name: string;
  address: string;
  avatarColor: string;
  markerColor: string;
  latitude: number;
  longitude: number;
  urgency: "critical" | "high" | "medium";
}
export interface HomeButton {
  Icon: React.ReactNode;
  text: string;
  isLoading?: boolean;
  buttonColor: string;
  subText: string;
  iconColor: string;
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
