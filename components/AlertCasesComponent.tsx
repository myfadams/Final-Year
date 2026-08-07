import { ResQColors } from "@/constants/Colors";
import React from "react";
import { Text, View } from "react-native";
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
  return (
    <View
      style={{
        backgroundColor: ResQColors.pageBg,
        paddingHorizontal: 8,
        paddingVertical: 12,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        // borderColor: ResQColors.border,
        borderColor: color,
        borderRadius: 10,
        flex: 1,
        boxSizing: "border-box",
      }}
    >
      <Text style={{ color: color, fontSize: 24 }}>{caseNumber}</Text>
      <Text style={{ color: color, fontSize: 13 }}>{text}</Text>
    </View>
  );
};

export default AlertCasesComponent;
