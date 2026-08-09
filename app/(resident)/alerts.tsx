import AlertCasesComponent from "@/components/AlertCasesComponent";
import CaseComponent from "@/components/CaseComponent";
import HomeTabBar from "@/components/HomeTabBar";
import ResolvedCaseComponent from "@/components/ResolvedCaseComponent";
import ScrollViewButton from "@/components/ScrollViewButton";
import Colors, { DESIGN_COLORS, ResQColors } from "@/constants/Colors";
import { globalState } from "@/constants/globalState";
import { caseProp } from "@/constants/interfaces";
import { emergencyAlerts } from "@/constants/tempData";
import { typography } from "@/constants/typograyph";
import filterByProperty from "@/externalFunctions/functions";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AlertsScreen() {
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

  // Compute filtered active and resolved cases based on horizontal scroll wheel selection
  const { displayedActiveCases, displayedResolvedCases } = useMemo(() => {
    const filter = isActive.toLowerCase();

    if (filter === "critical") {
      return {
        displayedActiveCases: activeCases.filter(
          (item) => item.severity.toLowerCase() === "critical",
        ),
        displayedResolvedCases: [],
      };
    }

    if (filter === "moderate") {
      return {
        displayedActiveCases: activeCases.filter(
          (item) => item.severity.toLowerCase() === "moderate",
        ),
        displayedResolvedCases: [],
      };
    }

    if (filter === "nearby") {
      return {
        displayedActiveCases: [...activeCases].sort(
          (a, b) => a.distance - b.distance,
        ),
        displayedResolvedCases: [],
      };
    }

    if (filter === "medical") {
      return {
        displayedActiveCases: activeCases.filter(
          (item) =>
            item.title.toLowerCase().includes("breathing") ||
            item.title.toLowerCase().includes("medical") ||
            item.description.toLowerCase().includes("medical") ||
            item.severity.toLowerCase() === "critical",
        ),
        displayedResolvedCases: [],
      };
    }

    if (filter === "resolved") {
      return {
        displayedActiveCases: [],
        displayedResolvedCases: resolved,
      };
    }

    // Default "all" filter
    return {
      displayedActiveCases: activeCases,
      displayedResolvedCases: resolved,
    };
  }, [isActive, activeCases, resolved]);

  return (
    <SafeAreaView style={styles.container}>
      <HomeTabBar pageTitle="Alerts" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Location Subtitle */}
        <View style={styles.locationSubtitleRow}>
          <Text style={styles.locationSubtitleText}>Near KNUST campus</Text>
        </View>

        {/* Top Summary Cards */}
        <View style={styles.summaryCardsRow}>
          <AlertCasesComponent
            caseNumber={critical.length}
            text="Critical"
            color={Colors.URGENCY_COLORS.critical}
          />
          <AlertCasesComponent
            caseNumber={moderate.length}
            text="Moderate"
            color={Colors.URGENCY_COLORS.high}
          />
          <AlertCasesComponent
            caseNumber={resolved.length}
            text="Resolved today"
            color={Colors.light.success}
          />
        </View>

        {/* Filter Scroll Wheel */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContainer}
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

        {/* ACTIVE NOW Section Header */}
        {displayedActiveCases.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>ACTIVE NOW</Text>
              <Text style={styles.sectionCountText}>
                {displayedActiveCases.length} incident
                {displayedActiveCases.length > 1 ? "s" : ""}
              </Text>
            </View>

            {/* Active Incident List */}
            <View>
              {displayedActiveCases.map((item) => (
                <CaseComponent
                  {...item}
                  key={item.id}
                  isActiveResponse={activeEmergencyId === item.id.toString()}
                  onMapPress={() => {
                    router.push({
                      pathname: "/(resident)/map",
                      params: {
                        personId: item.id.toString(),
                        action: "preview",
                      },
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
          </>
        )}

        {/* RESOLVED TODAY Section Header */}
        {displayedResolvedCases.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>RESOLVED TODAY</Text>
              <Text style={styles.sectionCountText}>
                {displayedResolvedCases.length} closed
              </Text>
            </View>

            {/* Resolved Incident List */}
            <View>
              {displayedResolvedCases.map((item) => (
                <ResolvedCaseComponent {...item} key={item.id} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResQColors.pageBg,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  locationSubtitleRow: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  locationSubtitleText: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: ResQColors.textSubtle,
  },
  summaryCardsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 18,
  },
  filterScrollContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: DESIGN_COLORS.slate900,
    letterSpacing: 0.5,
  },
  sectionCountText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: ResQColors.textSubtle,
  },
});
