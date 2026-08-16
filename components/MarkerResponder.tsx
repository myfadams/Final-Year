import { Person } from "@/constants/interfaces";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeMarker as Marker } from "@/components/SafeMarker";
import PulseRing from "./MapPulseRing";

interface ResponderProps {
  location: any;
}
interface EmergencyProps {
  victimLocation: any;
  selectedPerson: Person;
}
const MarkerResponder: React.FC<ResponderProps> = ({ location }) => {
  return (
    <View>
      <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={mapStyles.responderWrapper}>
          <PulseRing color="#4ECDC4" />
          <View style={mapStyles.responderCore}>
            <Text style={{ fontSize: 18 }}>🚑</Text>
          </View>
        </View>
      </Marker>
    </View>
  );
};

export const MarkerEmergency: React.FC<EmergencyProps> = ({
  victimLocation,
  selectedPerson,
}) => {
  return (
    <Marker coordinate={victimLocation} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={mapStyles.responderWrapper}>
        <PulseRing color={selectedPerson.avatarColor} />
        <View
          style={[
            mapStyles.victimCore,
            { backgroundColor: selectedPerson.avatarColor },
          ]}
        >
          <Text style={{ fontSize: 18 }}>🆘</Text>
        </View>
      </View>
    </Marker>
  );
};

const mapStyles = StyleSheet.create({
  responderWrapper: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  responderCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0a0f1e",
  },
  victimCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0a0f1e",
  },
});

export default MarkerResponder;
