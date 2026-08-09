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

  if (text.toLowerCase().includes("critical")) {
    borderColor = ResQColors.redLight;
  } else if (text.toLowerCase().includes("moderate")) {
    borderColor = ResQColors.amberLight;
  } else if (text.toLowerCase().includes("resolved")) {
    borderColor = ResQColors.greenBg;
  }

  return (
    <View style={[styles.card, { borderColor }]}>
      <Text style={[styles.numberText, { color }]}>{caseNumber}</Text>
      <Text style={[styles.labelText, { color }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: ResQColors.cardSurface,
    paddingVertical: 14,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 20,
  },
  numberText: {
    fontSize: 26,
    fontFamily: typography.bold,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 12,
    fontFamily: typography.regular,
    textAlign: "center",
  },
});

export default AlertCasesComponent;
