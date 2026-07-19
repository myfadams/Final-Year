import Colors, { ResQColors } from "@/constants/Colors";
import { caseProp } from "@/constants/interfaces";
import {
  formatDistance,
  formatTimeAgo,
  getSeverityColors,
} from "@/externalFunctions/functions";
import {
  AlertCircle,
  Clock,
  Dot,
  MapPin,
  Phone,
  ShieldAlert,
  Siren,
  TriangleAlert,
} from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import CustomButton from "./CustomButton";

interface CaseComponentProps extends caseProp {
  isActiveResponse?: boolean;
  onRespondPress?: () => void;
  onMapPress?: () => void;
}

const CaseComponent: React.FC<CaseComponentProps> = ({
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
  isActiveResponse,
  onRespondPress,
  onMapPress,
}) => {
  const txtColor = getSeverityColors(severity);
  const displayLocation =
    location.length > 20 ? location.substring(0, 17) + "..." : location;
  return (
    <View
      style={{
        backgroundColor: ResQColors.cardSurface,
        borderTopColor: txtColor[0],
        borderTopWidth: 5,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
        borderRadius: 16,
        paddingHorizontal: 8,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View style={{ margin: 16 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View
            style={{
              backgroundColor: txtColor[1],
              padding: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: ResQColors.border,
            }}
          >
            {severity.toLocaleLowerCase() == "critical" && (
              <TriangleAlert size={28} color={txtColor[0]} />
            )}
            {severity.toLocaleLowerCase() == "moderate" && (
              <ShieldAlert size={28} color={txtColor[0]} />
            )}
            {severity.toLocaleLowerCase() == "low" && (
              <AlertCircle size={28} color={txtColor[0]} />
            )}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              // gap: 18,
              flex: 1,
            }}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{
                  color: Colors.light.primary,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                {title}
              </Text>
              <View
                style={{ flexDirection: "row", gap: 2, alignItems: "center" }}
              >
                <Clock size={12} color={Colors.light.textMuted} />
                <Text style={{ fontSize: 12, color: Colors.light.textMuted }}>
                  {formatTimeAgo(time)}
                </Text>
              </View>
            </View>
            <View>
              <View
                style={{
                  backgroundColor: txtColor[1],
                  // flexGrow: 0,
                  // flexDirection:
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 8,
                  borderWidth: 1,
                  borderColor: ResQColors.border,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: txtColor[0],
                    fontWeight: "500",
                    fontSize: 13,
                  }}
                >
                  {severity}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            marginVertical: 8,
            backgroundColor: "#F9F9F8",
            padding: 10,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: "#EBEBE5",
          }}
        >
          <MapPin color={Colors.light.primary} size={16} />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              overflow: "hidden",
            }}
          >
            <Text
              style={{
                fontSize: 15,
                color: Colors.light.textMuted,
                flexShrink: 1,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayLocation}
            </Text>
            <Dot color={Colors.light.textMuted} />
            <Text
              style={{
                fontSize: 15,
                color: Colors.light.textMuted,
                flexShrink: 0,
              }}
            >
              {formatDistance(distance)}
            </Text>
          </View>
        </View>
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Text style={{ fontSize: 13, color: Colors.light.textMuted }}>
              {responders} resp.
            </Text>
            {responders > 0 && (
              <>
                <Dot color={Colors.light.textMuted} />
                <Text style={{ fontSize: 13, color: Colors.light.textMuted }}>
                  amb. en route
                </Text>
              </>
            )}
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            gap: 6,
            justifyContent: "space-between",
            marginVertical: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <CustomButton
              onPress={onMapPress}
              Icon={<MapPin color="#018790" size={19} />}
              text={"Map"}
              color="rgba(1, 135, 144, 0.05)"
              textColor="#018790"
              borderColor="rgba(1, 135, 144, 0.15)"
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomButton
              onPress={() => {}}
              Icon={<Phone color="#018790" size={19} />}
              text={"Call"}
              color="rgba(1, 135, 144, 0.05)"
              textColor="#018790"
              borderColor="rgba(1, 135, 144, 0.15)"
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomButton
              onPress={onRespondPress}
              disabled={distance > 800 && !isActiveResponse}
              Icon={
                <Siren
                  color={
                    distance > 800 && !isActiveResponse
                      ? "#9E9D96"
                      : isActiveResponse
                        ? "#FF3B3B"
                        : "#fff"
                  }
                  size={19}
                />
              }
              text={
                distance > 800 && !isActiveResponse
                  ? "too far"
                  : isActiveResponse
                    ? "Cancel"
                    : "Respond"
              }
              color={
                distance > 800 && !isActiveResponse
                  ? "#F1F1F0"
                  : isActiveResponse
                    ? "rgba(255, 59, 59, 0.08)"
                    : "#018790"
              }
              textColor={
                distance > 800 && !isActiveResponse
                  ? "#9E9D96"
                  : isActiveResponse
                    ? "#FF3B3B"
                    : "#fff"
              }
              borderColor={
                distance > 800 && !isActiveResponse
                  ? "#E2E2DF"
                  : isActiveResponse
                    ? "rgba(255, 59, 59, 0.2)"
                    : "#018790"
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default CaseComponent;
