import { Person } from "@/constants/interfaces";
import { PEOPLE } from "@/constants/tempData";
import axios from "axios";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

// =====================================================
// CONFIG
// =====================================================
const ORS_API_KEY =
  process.env.EXPO_PUBLIC_ORS_API_KEY ||
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImEzNjgzMDczYTY0YzRhZmQ5OTU2ZmRhMWVmNjI5NjRiIiwiaCI6Im11cm11cjY0In0=";

const getDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Fallback grid route generator
const generateSimulatedRoute = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) => {
  const coords = [];
  const lat1 = start.latitude;
  const lon1 = start.longitude;
  const lat2 = end.latitude;
  const lon2 = end.longitude;

  const p1 = { latitude: lat1 + (lat2 - lat1) * 0.3, longitude: lon1 };
  const p2 = {
    latitude: lat1 + (lat2 - lat1) * 0.3,
    longitude: lon1 + (lon2 - lon1) * 0.7,
  };
  const p3 = { latitude: lat2, longitude: lon1 + (lon2 - lon1) * 0.7 };

  const keyPoints = [start, p1, p2, p3, end];

  for (let k = 0; k < keyPoints.length - 1; k++) {
    const from = keyPoints[k];
    const to = keyPoints[k + 1];
    const steps = 12;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      coords.push({
        latitude: from.latitude + t * (to.latitude - from.latitude),
        longitude: from.longitude + t * (to.longitude - from.longitude),
      });
    }
  }
  coords.push(end);
  return coords;
};

// =====================================================
// PULSE RING ANIMATION
// =====================================================
const PulseRing: React.FC<{ color: string }> = ({ color }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 2.2,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
};

// =====================================================
// MAP COMPONENT
// =====================================================
interface MapViewComponentProps {
  selectedPerson: Person | null;
  activeEmergency: Person | null;
  onSelectPerson: (p: Person) => void;
  onRouteCalculated?: (distance: string, duration: string) => void;
  recenterNonce?: string;
}

const MapViewComponent: React.FC<MapViewComponentProps> = ({
  selectedPerson,
  activeEmergency,
  onSelectPerson,
  onRouteCalculated,
  recenterNonce,
}) => {
  const [location, setLocation] = useState<any>(null);
  const [victimLocation, setVictimLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  const mapRef = useRef<any>(null);
  const watchRef = useRef<any>(null);
  const victimInterval = useRef<any>(null);

  const hasCentered = useRef(false);

  // Dynamic helper to shift coordinates close to the responder for testing if too far
  const getAdjustedPerson = React.useCallback(
    (p: Person | null): Person | null => {
      if (!p || !location) return p;

      const distanceToFirst = getDistanceInMeters(
        location.latitude,
        location.longitude,
        PEOPLE[0].latitude,
        PEOPLE[0].longitude,
      );

      if (distanceToFirst > 10000) {
        const idx = PEOPLE.findIndex((item) => item.id === p.id);
        if (idx !== -1) {
          const offsets = [
            { dLat: 0.002, dLon: 0.002 }, // ~300m (Within 500m)
            { dLat: 0.007, dLon: 0.006 }, // ~1km (Too Far)
            { dLat: 0.003, dLon: -0.002 }, // ~400m (Within 500m)
            { dLat: -0.008, dLon: 0.008 }, // ~1.2km (Too Far)
            { dLat: 0.001, dLon: -0.002 }, // ~250m (Within 500m)
          ];
          const offset = offsets[idx % offsets.length];
          return {
            ...p,
            latitude: location.latitude + offset.dLat,
            longitude: location.longitude + offset.dLon,
          };
        }
      }
      return p;
    },
    [location],
  );

  const adjustedSelectedPerson = React.useMemo(() => {
    return getAdjustedPerson(selectedPerson);
  }, [selectedPerson, getAdjustedPerson]);

  const adjustedActiveEmergency = React.useMemo(() => {
    return getAdjustedPerson(activeEmergency);
  }, [activeEmergency, getAdjustedPerson]);

  const adjustedPeople = React.useMemo(() => {
    return PEOPLE.map((p) => getAdjustedPerson(p) as Person);
  }, [location, getAdjustedPerson]);

  // Initialize and watch current GPS location of the user (the attender)
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const current = await Location.getCurrentPositionAsync({});
      setLocation(current.coords);

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Watch every 3 seconds
          distanceInterval: 5, // Trigger update if moved 5 meters
        },
        (loc) => setLocation(loc.coords),
      );
    })();
    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  // Fetch Route from ORS API
  const updateRoute = async (
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
  ) => {
    try {
      if (!ORS_API_KEY) {
        throw new Error("No ORS_API_KEY configured.");
      }

      const response = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          coordinates: [
            [start.longitude, start.latitude],
            [end.longitude, end.latitude],
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
      const coords = feature.geometry.coordinates.map(
        ([lng, lat]: number[]) => ({
          latitude: lat,
          longitude: lng,
        }),
      );
      setRouteCoords(coords);

      const summary = feature.properties.summary;
      const distanceVal = `${(summary.distance / 1000).toFixed(1)} km`;
      const durationVal = `${Math.ceil(summary.duration / 60)} min`;
      setDistance(distanceVal);
      setDuration(durationVal);
      onRouteCalculated?.(distanceVal, durationVal);
    } catch (error) {
      console.log("ORS API Error, using fallback route:", error);

      const rawDistance = getDistanceInMeters(
        start.latitude,
        start.longitude,
        end.latitude,
        end.longitude,
      );
      const roadDistance = rawDistance * 1.35; // account for curves
      const distanceVal =
        roadDistance < 1000
          ? `${Math.round(roadDistance)} m`
          : `${(roadDistance / 1000).toFixed(1)} km`;

      const seconds = roadDistance / 5.0; // speed: 5 m/s (~18 km/h)
      const durationVal = `${Math.max(1, Math.ceil(seconds / 60))} min`;

      setDistance(distanceVal);
      setDuration(durationVal);
      onRouteCalculated?.(distanceVal, durationVal);

      // Generate grid fallback route
      const fallback = generateSimulatedRoute(start, end);
      setRouteCoords(fallback);
    }
  };

  // Recalculate route whenever user location, activeEmergency or selectedPerson changes
  useEffect(() => {
    if (!location) return;

    const target = adjustedActiveEmergency || adjustedSelectedPerson;
    if (!target) {
      setRouteCoords([]);
      setDistance("");
      setDuration("");
      onRouteCalculated?.("--", "--");
      return;
    }

    updateRoute(location, {
      latitude: target.latitude,
      longitude: target.longitude,
    });
  }, [location, adjustedActiveEmergency, adjustedSelectedPerson]);

  // Handle active emergency victim position updates and jitter simulation
  useEffect(() => {
    if (victimInterval.current) {
      clearInterval(victimInterval.current);
    }

    if (!adjustedActiveEmergency) {
      setVictimLocation(null);
      return;
    }

    hasCentered.current = false;

    setVictimLocation({
      latitude: adjustedActiveEmergency.latitude,
      longitude: adjustedActiveEmergency.longitude,
    });

    victimInterval.current = setInterval(() => {
      setVictimLocation((prev: any) => {
        if (!prev) return prev;
        return {
          latitude: prev.latitude + (Math.random() - 0.5) * 0.0001,
          longitude: prev.longitude + (Math.random() - 0.5) * 0.0001,
        };
      });
    }, 3000);

    return () => {
      if (victimInterval.current) clearInterval(victimInterval.current);
    };
  }, [adjustedActiveEmergency]);

  // Adjust route's end node to exactly follow the jittering victim location
  useEffect(() => {
    if (!victimLocation || routeCoords.length === 0) return;
    setRouteCoords((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = {
        latitude: victimLocation.latitude,
        longitude: victimLocation.longitude,
      };
      return updated;
    });
  }, [victimLocation]);

  // Center/fit map camera to focus on selected/active emergencies
  useEffect(() => {
    if (mapRef.current) {
      if (adjustedActiveEmergency) {
        // Active emergency navigation: fit both responder and destination in view
        if (location) {
          mapRef.current.fitToCoordinates(
            [
              location,
              {
                latitude: adjustedActiveEmergency.latitude,
                longitude: adjustedActiveEmergency.longitude,
              },
            ],
            {
              edgePadding: { top: 120, right: 100, bottom: 250, left: 100 },
              animated: true,
            },
          );
        }
        hasCentered.current = false;
      } else if (adjustedSelectedPerson) {
        // Selected emergency preview: zoom directly to focus on the selected victim marker,
        // offset the center slightly south so the marker is pushed up and not covered by the modal
        mapRef.current.animateToRegion(
          {
            latitude: adjustedSelectedPerson.latitude - 0.0025,
            longitude: adjustedSelectedPerson.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          },
          1000,
        );
        hasCentered.current = false;
      } else if (location) {
        // Fallback: center on responder if nothing is selected or active
        if (!hasCentered.current) {
          hasCentered.current = true;
          mapRef.current.animateToRegion(
            {
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            },
            1000,
          );
        }
      }
    }
  }, [location, adjustedActiveEmergency, adjustedSelectedPerson]);

  // Handle manual recenter double-press trigger
  useEffect(() => {
    if (recenterNonce && mapRef.current && location) {
      hasCentered.current = true;
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        1000,
      );
    }
  }, [recenterNonce]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude:
          location?.latitude || adjustedSelectedPerson?.latitude || 5.6037,
        longitude:
          location?.longitude || adjustedSelectedPerson?.longitude || -0.1869,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      }}
      customMapStyle={darkMapStyle}
      showsUserLocation={false}
    >
      {/* All Emergency Markers (Filtered to within 800m / near you) */}
      {adjustedPeople
        .filter((p) => {
          if (!location) return true;
          const dist = getDistanceInMeters(
            location.latitude,
            location.longitude,
            p.latitude,
            p.longitude,
          );
          return (
            dist <= 800 ||
            adjustedActiveEmergency?.id === p.id ||
            adjustedSelectedPerson?.id === p.id
          );
        })
        .map((p) => {
          const isActive = adjustedActiveEmergency?.id === p.id;
          const currentLoc = isActive && victimLocation ? victimLocation : p;

          return (
            <Marker
              key={p.id}
              coordinate={{
                latitude: currentLoc.latitude,
                longitude: currentLoc.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => onSelectPerson(p)}
            >
              <View style={mapStyles.responderWrapper}>
                {isActive && <PulseRing color={p.avatarColor} />}
                <View
                  style={[
                    mapStyles.victimCore,
                    {
                      backgroundColor: p.avatarColor,
                      transform: [{ scale: isActive ? 1.1 : 0.9 }],
                      borderWidth: isActive ? 3 : 2,
                      borderColor: isActive ? "#ffffff" : "#0a0f1e",
                    },
                  ]}
                >
                  <Text style={{ fontSize: isActive ? 18 : 14 }}>🆘</Text>
                </View>
              </View>
            </Marker>
          );
        })}

      {/* Responder Location Marker */}
      {location && (
        <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={mapStyles.responderWrapper}>
            <PulseRing color="#4ECDC4" />
            <View style={mapStyles.responderCore}>
              <Text style={{ fontSize: 18 }}>🚑</Text>
            </View>
          </View>
        </Marker>
      )}

      {/* Polyline Route */}
      {routeCoords.length > 0 && adjustedActiveEmergency && (
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

// =====================================================
// DARK MAP STYLE
// =====================================================
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
