import Colors, { ResQColors } from "@/constants/Colors";
import {
  Ambulance,
  Clock,
  Dot,
  MapPin,
  Phone,
  Siren,
} from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import CustomButton from "./CustomButton";

const CaseComponent = () => {
  return (
    <View
      style={{
        backgroundColor: ResQColors.pageBg,
        borderTopColor: Colors.URGENCY_COLORS.critical,
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
              backgroundColor: Colors.URGENCY_BACKGROUND.critical,
              padding: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: ResQColors.border,
            }}
          >
            <Ambulance size={28} color={Colors.URGENCY_COLORS.critical} />
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
                Medical emergency
              </Text>
              <View
                style={{ flexDirection: "row", gap: 2, alignItems: "center" }}
              >
                <Clock size={12} color={Colors.light.textMuted} />
                <Text style={{ fontSize: 12, color: Colors.light.textMuted }}>
                  {"5 min ago"}
                </Text>
              </View>
            </View>
            <View>
              <View
                style={{
                  backgroundColor: Colors.URGENCY_BACKGROUND.critical,
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
                    color: Colors.URGENCY_COLORS.critical,
                    fontWeight: "500",
                    fontSize: 13,
                  }}
                >
                  Critical
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
              {"Science block"}
            </Text>
            <Dot color={Colors.light.textMuted} />
            <Text style={{ fontSize: 15, color: Colors.light.textMuted }}>
              {200}
              {"m away"}
            </Text>
          </View>
        </View>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 15, color: Colors.light.textMuted }}>
              {2} {"responding"}
            </Text>
            <Dot color={Colors.light.textMuted} />
            <Text style={{ fontSize: 15, color: Colors.light.textMuted }}>
              {"ambulance en route"}
            </Text>
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
