import AlertCasesComponent from "@/components/AlertCasesComponent";
import CaseComponent from "@/components/CaseComponent";
import HomeTabBar from "@/components/HomeTabBar";
import ResolvedCaseComponent from "@/components/ResolvedCaseComponent";
import ScrollViewButton from "@/components/ScrollViewButton";
import Colors, { ResQColors } from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { caseProp } from "@/constants/interfaces";
import { emergencyAlerts } from "@/constants/tempData";
import filterByProperty from "@/externalFunctions/functions";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function alerts() {
  const [isActive, setActive] = useState("all");
  const [all, setAll] = useState<caseProp[]>([]);
  const [resolved, setResolved] = useState<caseProp[]>([]);
  const [critical, setCritical] = useState<caseProp[]>([]);
  const [moderate, setModerate] = useState<caseProp[]>([]);
  const [activeCases, setActiveCases] = useState<caseProp[]>([]);
  const [low, setLow] = useState<caseProp[]>([]);
  const [activeEmergencyId, setActiveEmergencyId] = useState<string | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      setAll(emergencyAlerts);
      setResolved(filterByProperty(emergencyAlerts, "isResolved", true));
      setCritical(filterByProperty(emergencyAlerts, "severity", "Critical"));
      setModerate(filterByProperty(emergencyAlerts, "severity", "Moderate"));
      setLow(filterByProperty(emergencyAlerts, "severity", "Low"));
      setActiveCases(filterByProperty(emergencyAlerts, "isResolved", false));
      setActiveEmergencyId(globalState.activeEmergencyId);
    }, []),
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ResQColors.pageBg }}>
      <HomeTabBar pageTitle="Alerts" />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
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
              caseNumber={critical.length}
              text={"Critical"}
              color={Colors.URGENCY_COLORS.critical}
            />
            <AlertCasesComponent
              caseNumber={moderate.length}
              text={"Moderate"}
              color={Colors.URGENCY_COLORS.high}
            />
            <AlertCasesComponent
              caseNumber={resolved.length}
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
              numberOfCases={all.length}
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
                {activeCases.length} incident{activeCases.length > 0 ? "s" : ""}
              </Text>
            </View>
          </View>
          <View>
            {activeCases.map((item) => (
              <CaseComponent
                {...item}
                key={item.id}
                isActiveResponse={activeEmergencyId === item.id.toString()}
                onMapPress={() => {
                  router.push({
                    pathname: "/(resident)/map",
                    params: { personId: item.id.toString(), action: "preview" },
                  });
                }}
                onRespondPress={() => {
                  const idStr = item.id.toString();
                  if (activeEmergencyId === idStr) {
                    globalState.activeEmergencyId = null;
                    setActiveEmergencyId(null);
                  } else {
                    globalState.activeEmergencyId = idStr;
                    setActiveEmergencyId(idStr);
                    router.push({
                      pathname: "/(resident)/map",
                      params: { personId: idStr, action: "respond" },
                    });
                  }
                }}
              />
            ))}
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
            <Text style={{ color: Colors.light.textMuted }}>
              {resolved.length} closed
            </Text>
          </View>
        </View>
        <View>
          {resolved.map(
            ({
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
            }) => (
              <ResolvedCaseComponent
                id={id}
                title={title}
                description={description}
                location={location}
                distance={distance}
                time={time}
                severity={severity}
                action={action}
                isResolved={isResolved}
                key={id}
                responders={responders}
                creatorID={creatorID}
                falseAlarm={falseAlarm}
                responseTime={responseTime}
              />
            ),
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
