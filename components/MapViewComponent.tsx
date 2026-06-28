import { useEffect, useRef, useState } from "react";
import MapView, { Polyline } from "react-native-maps";
import MarkerResponder, { MarkerEmergency } from "./MarkerResponder";
import { View } from "./Themed";

import { Person } from "@/constants/interfaces";
import axios from "axios";
import * as Location from "expo-location";
import { StyleSheet } from "react-native";
const MapViewComponent: React.FC<{ selectedPerson: Person | null }> = ({
  selectedPerson,
}) => {
  const [location, setLocation] = useState<any>(null);
  const [victimLocation, setVictimLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  const watchRef = useRef<any>(null);
  const victimInterval = useRef<any>(null);

  const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY;
  // console.log(ORS_API_KEY);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const current = await Location.getCurrentPositionAsync({});
      setLocation(current.coords);
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 2,
        },
        (loc) => setLocation(loc.coords),
      );
    })();
    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!selectedPerson) return;
    setVictimLocation({
      latitude: selectedPerson.latitude,
      longitude: selectedPerson.longitude,
    });
    victimInterval.current = setInterval(() => {
      setVictimLocation((prev: any) => {
        if (!prev) return prev;
        return {
          latitude: prev.latitude + (Math.random() - 0.5) * 0.0004,
          longitude: prev.longitude + (Math.random() - 0.5) * 0.0004,
        };
      });
    }, 3000);
    return () => {
      if (victimInterval.current) clearInterval(victimInterval.current);
    };
  }, [selectedPerson]);

  useEffect(() => {
    if (!location || !victimLocation) return;
    fetchRoute();
  }, [location, victimLocation]);

  const fetchRoute = async () => {
    try {
      const response = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          coordinates: [
            [location.longitude, location.latitude],
            [victimLocation.longitude, victimLocation.latitude],
          ],
        },
        {
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
        },
      );
      const feature = response.data.features[0];
      console.log(feature);
      const coords = feature.geometry.coordinates.map(
        ([lng, lat]: number[]) => ({
          latitude: lat,
          longitude: lng,
        }),
      );
      setRouteCoords(coords);
      const summary = feature.properties.summary;
      setDistance(`${(summary.distance / 1000).toFixed(1)} km`);
      setDuration(`${Math.ceil(summary.duration / 60)} min`);
    } catch (error) {
      console.log("ORS Error:", error);
      // console.log(ORS_API_KEY);
    }
  };

  if (!location) {
    return <View style={StyleSheet.absoluteFillObject} />;
  }

  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      }}
      customMapStyle={darkMapStyle}
      showsUserLocation={false}
    >
      <MarkerResponder location={location} />

      {victimLocation && selectedPerson && (
        <MarkerEmergency
          selectedPerson={selectedPerson}
          victimLocation={victimLocation}
        />
      )}

      {routeCoords.length > 0 && (
        <>
          <Polyline
            coordinates={routeCoords}
            strokeWidth={12}
            strokeColor="rgba(78,205,196,0.15)"
          />
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#4ECDC4"
          />
        </>
      )}
    </MapView>
  );
};

export default MapViewComponent;

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0a0f1e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1e" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a2035" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#1e2a42" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#243050" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2d3a5c" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1a2e" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0e1525" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#12192e" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#0c1220" }],
  },
];
