import AlertCasesComponent from "@/components/AlertCasesComponent";
import CaseComponent from "@/components/CaseComponent";
import HomeTabBar from "@/components/HomeTabBar";
import ResolvedCaseComponent from "@/components/ResolvedCaseComponent";
import ScrollViewButton from "@/components/ScrollViewButton";
import Colors, { ResQColors } from "@/constants/Colors";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function alerts() {
  const [isActive, setActive] = useState("all");
  return (
    <SafeAreaView>
      <HomeTabBar pageTitle="Alerts" />
      <ScrollView>
        <View>
          <View
            style={{
              marginHorizontal: 16,
              marginVertical: 6,
            }}
          >
            <Text style={{ fontSize: 14, color: Colors.light.textMuted }}>
              {"Near KNUST campus"}
            </Text>
          </View>
          <View
            style={{
              marginVertical: 18,
              gap: 8,
              flexDirection: "row",
              marginHorizontal: 16,
              borderBottomWidth: 1,
              paddingVertical: 16,
              borderColor: ResQColors.border,
            }}
          >
            <AlertCasesComponent
              caseNumber={2}
              text={"Critical"}
              color={Colors.URGENCY_COLORS.critical}
            />
            <AlertCasesComponent
              caseNumber={1}
              text={"Moderate"}
              color={Colors.URGENCY_COLORS.high}
            />
            <AlertCasesComponent
              caseNumber={2}
              text={"Resolved today"}
              color={Colors.light.success}
            />
          </View>
          {/* <View> */}
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: "row",
              paddingHorizontal: 16,
              gap: 8,
              marginVertical: 8,
            }}
          >
            <ScrollViewButton
              pageName="all"
              text="All"
              setIsActive={setActive}
              isActive={isActive}
              numberOfCases={3}
            />
            <ScrollViewButton
              pageName="critical"
              text="Critical"
              setIsActive={setActive}
              isActive={isActive}
            />
            <ScrollViewButton
              pageName="nearby"
              text="Nearby"
              setIsActive={setActive}
              isActive={isActive}
            />
            <ScrollViewButton
              pageName="medical"
              text="Medical"
              setIsActive={setActive}
              isActive={isActive}
            />
            <ScrollViewButton
              pageName="resolved"
              text="Resolved"
              setIsActive={setActive}
              isActive={isActive}
            />
          </ScrollView>
          {/* </View> */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 18,
              paddingHorizontal: 16,
              borderTopWidth: 1,
              marginTop: 8,
              borderColor: ResQColors.border,
            }}
          >
            <View style={{}}>
              <Text
                style={{
                  fontSize: 16,
                  color: Colors.light.textMuted,
                  fontWeight: "500",
                }}
              >
                ACTIVE NOW
              </Text>
            </View>
            <View>
              <Text style={{ color: Colors.light.textMuted }}>
                {3} incidents
              </Text>
            </View>
          </View>
          <View>
            <CaseComponent />
            <CaseComponent />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 16,
            paddingHorizontal: 16,
            // borderTopWidth: 1,
            marginTop: 8,
            // borderColor: ResQColors.border,
          }}
        >
          <View style={{}}>
            <Text
              style={{
                fontSize: 16,
                color: Colors.light.textMuted,
                fontWeight: "500",
              }}
            >
              RESOLVED TODAY
            </Text>
          </View>
          <View>
            <Text style={{ color: Colors.light.textMuted }}>{18} closed</Text>
          </View>
        </View>
        <View>
          <ResolvedCaseComponent />
          <ResolvedCaseComponent />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
