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
  TriangleAlert
} from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import CustomButton from "./CustomButton";

const CaseComponent: React.FC<caseProp> = ({
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
}) => {
  const txtColor = getSeverityColors(severity);
  return (
    <View
      style={{
        backgroundColor: ResQColors.pageBg,
        borderTopColor: txtColor[0],
        borderTopWidth: 10,
        borderWidth: 1,
        borderColor: ResQColors.border,
        borderRadius: 16,
        paddingHorizontal: 6,
        marginHorizontal: 16,
        marginVertical: 8,
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
            <View>
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
            backgroundColor: "#fff",
            padding: 8,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MapPin color={Colors.light.primary} size={16} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 15, color: Colors.light.textMuted }}>
              {location}
            </Text>
            <Dot color={Colors.light.textMuted} />
            <Text style={{ fontSize: 15, color: Colors.light.textMuted }}>
              {formatDistance(distance)}
            </Text>
          </View>
        </View>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 15, color: Colors.light.textMuted }}>
              {responders} {"responding"}
            </Text>
            <Dot color={Colors.light.textMuted} />
            {responders && (
              <Text style={{ fontSize: 15, color: Colors.light.textMuted }}>
                {"ambulance en route"}
              </Text>
            )}
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            justifyContent: "space-between",
            marginVertical: 8,
          }}
        >
          <View style={{ width: "30%" }}>
            <CustomButton
              onPress={() => {}}
              Icon={<MapPin color={Colors.light.textMuted} size={19} />}
              text={"Map"}
              color="#fff"
              textColor={Colors.light.textMuted}
            />
          </View>
          <View style={{ width: "30%" }}>
            <CustomButton
              onPress={() => {}}
              Icon={<Phone color={Colors.light.textMuted} size={19} />}
              text={"Call"}
              color="#fff"
              textColor={Colors.light.textMuted}
            />
          </View>
          <View style={{}}>
            <CustomButton
              onPress={() => {
                width: "30%";
              }}
              Icon={<Siren color={Colors.light.textInverse} size={19} />}
              text={"Respond"}
              // color="#fff"
              // textColor={Colors.light.textMuted}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default CaseComponent;
