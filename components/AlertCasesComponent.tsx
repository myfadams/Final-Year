import { ResQColors } from "@/constants/Colors";
import { typography } from "@/constants/typograyph";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface AlertProp {
  color: string;
  caseNumber: number;
  text: string;
}

const AlertCasesComponent: React.FC<AlertProp> = ({
  color,
  caseNumber,
  text,
}) => {
  let borderColor: string = ResQColors.border;
  let bgTint: string = "rgba(248, 250, 252, 0.8)";

  if (text.toLowerCase().includes("critical")) {
    borderColor = "#FCA5A5";
    bgTint = "rgba(254, 226, 226, 0.3)";
  } else if (text.toLowerCase().includes("moderate")) {
    borderColor = "#FCD34D";
    bgTint = "rgba(254, 243, 199, 0.3)";
  } else if (text.toLowerCase().includes("resolved")) {
    borderColor = "#86EFAC";
    bgTint = "rgba(220, 252, 231, 0.3)";
  }

  return (
    <View style={[styles.card, { borderColor, backgroundColor: bgTint }]}>
      <Text style={[styles.numberText, { color }]}>{caseNumber}</Text>
      <Text style={[styles.labelText, { color }]} numberOfLines={1}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  numberText: {
    fontSize: 24,
    fontFamily: typography.bold,
    marginBottom: 2,
  },
  labelText: {
    fontSize: 11.5,
    fontFamily: typography.semibold,
    textAlign: "center",
  },
});

export default AlertCasesComponent;
