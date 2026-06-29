import Colors, { ResQColors } from "@/constants/Colors";
import { caseProp } from "@/constants/interfaces";
import { formatTime, formatTimeAgo } from "@/externalFunctions/functions";
import { Check, Dot, Minus } from "lucide-react-native";
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
  return (
    <View
      style={{
        marginHorizontal: 6,
        marginVertical: 8,
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#fff",
        paddingHorizontal: 6,
        paddingVertical: 8,
        borderColor: ResQColors.border,
        borderRadius: 8,
      }}
    >
      <View
        style={{
          backgroundColor: Colors.URGENCY_BACKGROUND.medium,
          padding: 8,
          borderRadius: 8,
          borderColor: ResQColors.border,
          borderWidth: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Check color={Colors.URGENCY_COLORS.medium} />
      </View>
      <View style={{ justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontWeight: "500", fontSize: 15 }}>{title}</Text>
              {falseAlarm && (
                <>
                  <Minus />
                  <Text style={{ fontWeight: "500", fontSize: 15 }}>
                    false alarm
                  </Text>
                </>
              )}
            </View>
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

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: Colors.light.textMuted }}>
            {location}
          </Text>
          <Dot color={Colors.light.textMuted} />
          <Text style={{ fontSize: 13, color: Colors.light.textMuted }}>
            Resolved {formatTimeAgo(time)}
          </Text>
          <Dot color={Colors.light.textMuted} />
          <Text style={{ fontSize: 13, color: Colors.light.textMuted }}>
            {formatTime(responseTime)} response
          </Text>
        </View>
      </View>

      <View></View>
    </View>
  );
};

export default ResolvedCaseComponent;
