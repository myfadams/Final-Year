import Colors, { ResQColors } from "@/constants/Colors";
import { caseProp } from "@/constants/interfaces";
import { typography } from "@/constants/typograyph";
import {
  formatDistance,
  formatTimeAgo,
  getSeverityColors,
} from "@/externalFunctions/functions";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  ShieldAlert,
  Siren,
  TriangleAlert,
  Users
} from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
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
  action,
  responders,
  isActiveResponse,
  onRespondPress,
  onMapPress,
}) => {
  const txtColor = getSeverityColors(severity);
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => {
        router.push({
          pathname: "/IncidentDetails",
          params: {
            id: id.toString(),
            title: title,
            description: description,
            location: location,
            distance: distance.toString(),
            time: time.toString(),
            severity: severity,
            isResolved: isResolved ? "true" : "false",
            fromCasesScreen: "true",
          },
        });
      }}
      style={{
        backgroundColor: ResQColors.cardSurface,
        borderTopColor: txtColor[0],
        borderTopWidth: 3.5,
        borderWidth: 1,
        borderColor: txtColor[0],
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
        {/* Header Row */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View>
            <View
              style={{
                backgroundColor: txtColor[1],
                padding: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: ResQColors.border,
              }}
            >
              {severity.toLocaleLowerCase() === "critical" && (
                <TriangleAlert size={28} color={txtColor[0]} />
              )}
              {severity.toLocaleLowerCase() === "moderate" && (
                <ShieldAlert size={28} color={txtColor[0]} />
              )}
              {severity.toLocaleLowerCase() === "low" && (
                <AlertCircle size={28} color={txtColor[0]} />
              )}
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{
                  color: Colors.light.primary,
                  fontSize: 16,
                  fontFamily: typography.bold,
                }}
              >
                {title}
              </Text>
              <View
                style={{ flexDirection: "row", gap: 4, alignItems: "center", marginTop: 2 }}
              >
                <Clock size={12} color={Colors.light.textMuted} />
                <Text style={{ fontSize: 12, fontFamily: typography.medium, color: Colors.light.textMuted }}>
                  {formatTimeAgo(time)}
                </Text>
              </View>
            </View>
            <View>
              <View
                style={{
                  backgroundColor: txtColor[1],
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: ResQColors.border,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: txtColor[0],
                    fontFamily: typography.bold,
                    fontSize: 12,
                    textTransform: "uppercase",
                  }}
                >
                  {severity}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Enhanced Location & Distance Bar */}
        <View
          style={{
            marginVertical: 10,
            backgroundColor: "#F8FAFC",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <MapPin color="#AF101A" size={16} style={{ marginRight: 6 }} />
            <Text
              style={{
                fontSize: 13.5,
                fontFamily: typography.semibold,
                color: "#1E293B",
                flexShrink: 1,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {location}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#EDF2F7",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: typography.bold,
                color: "#475569",
              }}
            >
              {formatDistance(distance)}
            </Text>
          </View>
        </View>

        {/* Enhanced Responders & Status Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            marginTop: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Users size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 13, fontFamily: typography.medium, color: "#475569" }}>
              {responders > 0
                ? `${responders} Responder${responders > 1 ? "s" : ""}`
                : "No responders yet"}
            </Text>
          </View>

          {isActiveResponse && (
            <View
              style={{
                backgroundColor: "#DCFCE7",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#86EFAC",
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontFamily: typography.bold,
                  color: "#15803D",
                }}
              >
                You are responding
              </Text>
            </View>
          )}
        </View>

        {/* Round Custom Buttons */}
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            gap: 6,
            justifyContent: "space-between",
            marginVertical: 4,
          }}
        >
          <View style={{ flex: 1 }}>
            <CustomButton
              onPress={onMapPress}
              Icon={<MapPin color={Colors.light.primary} size={19} />}
              text={"Map"}
              color={ResQColors.cardSurface}
              textColor={Colors.light.primary}
              borderColor={ResQColors.border}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomButton
              onPress={() => { }}
              Icon={<Phone color={Colors.light.primary} size={19} />}
              text={"Call"}
              color={ResQColors.cardSurface}
              textColor={Colors.light.primary}
              borderColor={ResQColors.border}
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
                    : Colors.light.primary
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
                    : ResQColors.border
              }
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CaseComponent;
