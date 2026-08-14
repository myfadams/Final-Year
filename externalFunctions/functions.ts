import Colors from "@/constants/Colors";

export default function filterByProperty<T, K extends keyof T>(
  data: T[],
  property: K,
  value: T[K],
): T[] {
  return data.filter((item) => item[property] === value);
}

export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(1)} km`;
}

export function getSeverityColors(
  severity: "Critical" | "Moderate" | "Low" | "Resolved",
): [string, string] {
  switch (severity) {
    case "Critical":
      return [
        Colors.URGENCY_COLORS.critical,
        Colors.URGENCY_BACKGROUND.critical,
      ];

    case "Moderate":
      return [Colors.URGENCY_COLORS.high, Colors.URGENCY_BACKGROUND.high];

    case "Low":
    default:
      return [Colors.URGENCY_COLORS.medium, Colors.URGENCY_BACKGROUND.medium];
  }
}

export function formatTimeAgo(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr${hours > 1 ? "s" : ""}`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days > 1 ? "s" : ""}`;
}
