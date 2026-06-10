import Colors from "@/constants/Colors";
import { Person } from "@/constants/interfaces";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// const URGENCY_COLORS = {
//   critical: "#FF3B3B",
//   high: "#FF9500",
//   medium: "#34C759",
// };

const URGENCY_LABELS = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
};
const PersonCard: React.FC<{
  person: Person;
  isSelected: boolean;
  onPress: () => void;
}> = ({ person, isSelected, onPress }) => {
  const urgencyColor = Colors.URGENCY_COLORS[person.urgency];

  return (
    <TouchableOpacity
      style={[cardStyles.card, isSelected && cardStyles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[cardStyles.urgencyBar, { backgroundColor: urgencyColor }]}
      />

      <View
        style={[
          cardStyles.avatar,
          {
            backgroundColor: person.avatarColor + "22",
            borderColor: person.avatarColor + "55",
          },
        ]}
      >
        <Text style={[cardStyles.avatarInitial, { color: person.avatarColor }]}>
          {person.name.charAt(0)}
        </Text>
      </View>

      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{person.name}</Text>
        <Text style={cardStyles.address}>{person.address}</Text>
      </View>

      <View style={cardStyles.right}>
        <View
          style={[
            cardStyles.urgencyBadge,
            {
              backgroundColor: urgencyColor + "22",
              borderColor: urgencyColor + "44",
            },
          ]}
        >
          <View
            style={[cardStyles.urgencyDot, { backgroundColor: urgencyColor }]}
          />
          <Text style={[cardStyles.urgencyText, { color: urgencyColor }]}>
            {URGENCY_LABELS[person.urgency]}
          </Text>
        </View>
        <View
          style={[
            cardStyles.navBtn,
            { backgroundColor: isSelected ? "#4ECDC4" : "#ffffff18" },
          ]}
        >
          <Text
            style={{
              color: isSelected ? "#0a0f1e" : "#fff",
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {isSelected ? "ACTIVE" : "▶"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    gap: 12,
  },
  cardSelected: {
    backgroundColor: "rgba(78,205,196,0.07)",
    borderColor: "rgba(78,205,196,0.25)",
  },
  urgencyBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  address: {
    color: "#4a6a8a",
    fontSize: 11,
    fontWeight: "500",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  urgencyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  navBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 44,
    alignItems: "center",
  },
});

export default PersonCard;
