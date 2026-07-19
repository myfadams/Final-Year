import Colors, { ResQColors } from "@/constants/Colors";
import { caseProp } from "@/constants/interfaces";
import { formatTime, formatTimeAgo } from "@/externalFunctions/functions";
import { Check, Dot } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

const ResolvedCaseComponent: React.FC<caseProp> = ({
  id,
  title,
  description,
  location,
  distance,
  time,
  severity,
  isResolved,
  // color,
  action,
  responders,
  creatorID,
  falseAlarm,
  responseTime,
}) => {
  const displayLocation =
    location.length > 20 ? location.substring(0, 17) + "..." : location;
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: ResQColors.cardSurface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.04)",
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View
        style={{
          backgroundColor: Colors.URGENCY_BACKGROUND.medium,
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(52, 199, 89, 0.15)",
        }}
      >
        <Check color={Colors.URGENCY_COLORS.medium} size={20} />
      </View>
      <View style={{ justifyContent: "center", flex: 1, marginLeft: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              flexWrap: "wrap",
              marginRight: 8,
            }}
          >
            <Text
              style={{ fontWeight: "500", fontSize: 15, flexShrink: 1 }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {falseAlarm && (
              <Text
                style={{
                  fontWeight: "500",
                  fontSize: 12,
                  color: Colors.light.textMuted,
                  marginLeft: 4,
                }}
              >
                (False Alarm)
              </Text>
            )}
          </View>
          <View style={{ justifyContent: "center" }}>
            <View
              style={{
                backgroundColor: Colors.URGENCY_BACKGROUND.medium,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                borderColor: Colors.URGENCY_COLORS.medium,
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "500",
                  color: Colors.URGENCY_COLORS.medium,
                }}
              >
                Done
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 4,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: Colors.light.textMuted,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {displayLocation}
          </Text>
          <Dot color={Colors.light.textMuted} />
          <Text style={{ fontSize: 13, color: Colors.light.textMuted }}>
            Res. {formatTimeAgo(time)}
          </Text>
          <Dot color={Colors.light.textMuted} />
          <Text style={{ fontSize: 13, color: Colors.light.textMuted }}>
            {formatTime(responseTime)} resp.
          </Text>
        </View>
      </View>

      <View></View>
    </View>
  );
};

export default ResolvedCaseComponent;
