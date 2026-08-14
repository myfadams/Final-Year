import Colors from "@/constants/Colors";
import { SharedLocationPinMarker } from "@/components/SharedLocationPinMarker";
import { SharedLocationPin } from "@/constants/globalState";
import { Person } from "@/constants/interfaces";
import axios from "axios";
import * as Location from "expo-location";
import { BriefcaseMedical, Flame, Shield } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

// Helper to resolve incident category type
const getIncidentType = (person: Person): "medical" | "fire" | "security" => {
  const desc = (person.description || "").toLowerCase();
  const name = (person.name || "").toLowerCase();
  if (
    desc.includes("fire") ||
    desc.includes("smoke") ||
    desc.includes("spark") ||
    desc.includes("electric") ||
    name.includes("fire")
  ) {
    return "fire";
  }
  if (
    desc.includes("suspicious") ||
    desc.includes("security") ||
    desc.includes("theft") ||
    desc.includes("loiter") ||
    name.includes("security") ||
    name.includes("loiter")
  ) {
    return "security";
  }
  return "medical";
};

// Helper to resolve icon and color based on severity (urgency) using brand Colors constants
const getIncidentIconInfo = (person: Person) => {
  const type = getIncidentType(person);
  const color =
    Colors.URGENCY_COLORS[person.urgency] || Colors.URGENCY_COLORS.critical;

  switch (type) {
    case "fire":
      return { Icon: Flame, color };
    case "security":
      return { Icon: Shield, color };
    case "medical":
    default:
      return { Icon: BriefcaseMedical, color };
  }
};

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

// Calculates perpendicular distance from a point to a line segment in meters
const getDistanceToSegmentInMeters = (
  p: { latitude: number; longitude: number },
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const latRad = (a.latitude * Math.PI) / 180;
  const metersPerDegreeLat = 111139;
  const metersPerDegreeLon = 111139 * Math.cos(latRad);

  const px = (p.longitude - a.longitude) * metersPerDegreeLon;
  const py = (p.latitude - a.latitude) * metersPerDegreeLat;

  const bx = (b.longitude - a.longitude) * metersPerDegreeLon;
  const by = (b.latitude - a.latitude) * metersPerDegreeLat;

  const segmentSqLength = bx * bx + by * by;
  if (segmentSqLength === 0) {
    return Math.hypot(px, py);
  }

  let t = (px * bx + py * by) / segmentSqLength;
  t = Math.max(0, Math.min(1, t));

  const projX = t * bx;
  const projY = t * by;

  return Math.hypot(px - projX, py - projY);
};

// Calculates minimum distance from a location point to a polyline route in meters
const getMinDistanceToPolyline = (
  point: { latitude: number; longitude: number },
  polyline: { latitude: number; longitude: number }[],
) => {
  if (!polyline || polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return getDistanceInMeters(
      point.latitude,
      point.longitude,
      polyline[0].latitude,
      polyline[0].longitude,
    );
  }

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = getDistanceToSegmentInMeters(
      point,
      polyline[i],
      polyline[i + 1],
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
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
  activeSharedLocation?: SharedLocationPin | null;
  realEmergencies?: Person[];
  onSelectPerson: (p: Person) => void;
  onSelectSharedPin?: (pin: SharedLocationPin) => void;
  onRouteCalculated?: (distance: string, duration: string) => void;
  recenterNonce?: string | null;
  categoryFilter?: string; // category filter state passed from parent
  searchQuery?: string; // search query string passed from parent
  travelMode?: "driving" | "running" | "walking"; // travel mode passed from parent
}

const MapViewComponent: React.FC<MapViewComponentProps> = ({
  selectedPerson,
  activeEmergency,
  activeSharedLocation,
  realEmergencies,
  onSelectPerson,
  onSelectSharedPin,
  onRouteCalculated,
  recenterNonce,
  categoryFilter,
  searchQuery,
  travelMode = "running",
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

  // Smart ORS routing tracking refs & concurrency lock
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRouteRef = useRef<boolean>(false);
  const lastCalculatedLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const lastTargetLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const lastTravelModeRef = useRef<string | null>(null);
  const currentRouteCoordsRef = useRef<any[]>([]);

  // Dynamic helper for person coordinates
  const getAdjustedPerson = React.useCallback(
    (p: Person | null): Person | null => {
      return p;
    },
    [],
  );

  const adjustedSelectedPerson = React.useMemo(() => {
    return getAdjustedPerson(selectedPerson);
  }, [selectedPerson, getAdjustedPerson]);

  const adjustedActiveEmergency = React.useMemo(() => {
    return getAdjustedPerson(activeEmergency);
  }, [activeEmergency, getAdjustedPerson]);

  const allEmergenciesList = React.useMemo(() => {
    const map = new Map<string, Person>();
    if (realEmergencies) {
      realEmergencies.forEach((p) => map.set(p.id, p));
    }
    if (selectedPerson) map.set(selectedPerson.id, selectedPerson);
    if (activeEmergency) map.set(activeEmergency.id, activeEmergency);
    return Array.from(map.values());
  }, [realEmergencies, selectedPerson, activeEmergency]);

  const adjustedPeople = React.useMemo(() => {
    return allEmergenciesList.map((p) => getAdjustedPerson(p) as Person);
  }, [allEmergenciesList, getAdjustedPerson]);

  // Initialize and watch current GPS location of the user (every 5s or 10 meters)
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const current = await Location.getCurrentPositionAsync({});
      setLocation(current.coords);

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Watch every 5 seconds (5-10s requirement)
          distanceInterval: 10, // Minimum movement 10 meters
        },
        (loc) => {
          setLocation((prev: any) => {
            if (prev) {
              const d = getDistanceInMeters(
                prev.latitude,
                prev.longitude,
                loc.coords.latitude,
                loc.coords.longitude,
              );
              if (d < 3) return prev; // Filter small GPS jitter
            }
            return loc.coords;
          });
        },
      );
    })();
    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  // Fetch Route from ORS API with AbortController cancellation & request lock
  const updateRoute = async (
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    mode: string,
  ) => {
    // Abort previous in-flight ORS request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isFetchingRouteRef.current = true;

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
          signal: controller.signal,
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
      currentRouteCoordsRef.current = coords;
      lastCalculatedLocationRef.current = start;
      lastTargetLocationRef.current = end;
      lastTravelModeRef.current = mode;

      const summary = feature.properties.summary;
      const distanceVal =
        summary.distance < 1000
          ? `${Math.round(summary.distance)} m`
          : `${(summary.distance / 1000).toFixed(1)} km`;

      let durationFactor = 1.0;
      if (mode === "driving") durationFactor = 0.5;
      else if (mode === "running") durationFactor = 1.6;
      else if (mode === "walking") durationFactor = 4.0;

      const durationVal = `${Math.ceil((summary.duration * durationFactor) / 60)} min`;

      setDistance(distanceVal);
      setDuration(durationVal);
      onRouteCalculated?.(distanceVal, durationVal);
    } catch (error: any) {
      if (
        axios.isCancel(error) ||
        error?.name === "CanceledError" ||
        error?.name === "AbortError"
      ) {
        return; // Request was aborted cleanly
      }
      console.log("ORS API Error, using fallback route:", error);

      const rawDistance = getDistanceInMeters(
        start.latitude,
        start.longitude,
        end.latitude,
        end.longitude,
      );
      const roadDistance = rawDistance * 1.35;
      const distanceVal =
        roadDistance < 1000
          ? `${Math.round(roadDistance)} m`
          : `${(roadDistance / 1000).toFixed(1)} km`;

      let speed = 4.5;
      if (mode === "driving") speed = 12.0;
      else if (mode === "running") speed = 4.5;
      else if (mode === "walking") speed = 1.4;

      const seconds = roadDistance / speed;
      const durationVal = `${Math.max(1, Math.ceil(seconds / 60))} min`;

      setDistance(distanceVal);
      setDuration(durationVal);
      onRouteCalculated?.(distanceVal, durationVal);

      const fallback = generateSimulatedRoute(start, end);
      setRouteCoords(fallback);
      currentRouteCoordsRef.current = fallback;
      lastCalculatedLocationRef.current = start;
      lastTargetLocationRef.current = end;
      lastTravelModeRef.current = mode;
    } finally {
      isFetchingRouteRef.current = false;
    }
  };

  // Smart Reroute Decision Logic:
  // Location update -> Moved >=15m? -> Is route still usable (off route <=40m)? -> Request ORS
  useEffect(() => {
    if (!location) return;

    let targetLat: number | null = null;
    let targetLng: number | null = null;

    if (
      activeSharedLocation?.isTrackingActive &&
      !activeSharedLocation.dismissed
    ) {
      targetLat = activeSharedLocation.latitude;
      targetLng = activeSharedLocation.longitude;
    } else {
      const target = adjustedActiveEmergency || adjustedSelectedPerson;
      if (target) {
        targetLat = target.latitude;
        targetLng = target.longitude;
      }
    }

    if (targetLat === null || targetLng === null) {
      if (routeCoords.length > 0) {
        setRouteCoords([]);
        currentRouteCoordsRef.current = [];
        setDistance("");
        setDuration("");
        onRouteCalculated?.("--", "--");
        lastCalculatedLocationRef.current = null;
        lastTargetLocationRef.current = null;
        lastTravelModeRef.current = null;
      }
      return;
    }

    const currentTarget = { latitude: targetLat, longitude: targetLng };
    const currentStart = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    const directDist = getDistanceInMeters(
      currentStart.latitude,
      currentStart.longitude,
      currentTarget.latitude,
      currentTarget.longitude
    );
    const immediateVal =
      directDist < 1000
        ? `${Math.round(directDist)} m`
        : `${(directDist / 1000).toFixed(1)} km`;
    setDistance(immediateVal);
    const estMin = Math.max(1, Math.ceil(directDist / 80));
    const durVal = directDist <= 50 ? "< 1 min" : `${estMin} min`;
    onRouteCalculated?.(immediateVal, durVal);

    const MIN_MOVEMENT_METERS = 15; // Minimum 15m user movement to evaluate rerouting
    const OFF_ROUTE_METERS = 40;     // Off-route threshold: 40 meters
    const TARGET_MOVED_METERS = 20;  // Target location shifted threshold

    // 1. Check if no route exists yet
    const hasExistingRoute = currentRouteCoordsRef.current.length > 0;
    if (!hasExistingRoute) {
      updateRoute(currentStart, currentTarget, travelMode);
      return;
    }

    // 2. Check if travel mode changed
    if (lastTravelModeRef.current !== travelMode) {
      updateRoute(currentStart, currentTarget, travelMode);
      return;
    }

    // 3. Check if target location moved significantly
    if (lastTargetLocationRef.current) {
      const targetMovement = getDistanceInMeters(
        lastTargetLocationRef.current.latitude,
        lastTargetLocationRef.current.longitude,
        currentTarget.latitude,
        currentTarget.longitude,
      );
      if (targetMovement > TARGET_MOVED_METERS) {
        updateRoute(currentStart, currentTarget, travelMode);
        return;
      }
    }

    // 4. Has user moved significantly from previous route calculation origin?
    if (lastCalculatedLocationRef.current) {
      const startMovement = getDistanceInMeters(
        lastCalculatedLocationRef.current.latitude,
        lastCalculatedLocationRef.current.longitude,
        currentStart.latitude,
        currentStart.longitude,
      );

      // User has NOT moved significantly (<15m) -> DO NOT reroute!
      if (startMovement < MIN_MOVEMENT_METERS) {
        return;
      }
    }

    // 5. User moved >15m. Check if current route is still usable (off-route test)
    const offRouteDistance = getMinDistanceToPolyline(
      currentStart,
      currentRouteCoordsRef.current,
    );

    // If user is within 40m of existing route polyline, keep existing route!
    if (offRouteDistance <= OFF_ROUTE_METERS) {
      return;
    }

    // 6. User is >40m off route -> Request ORS route recalculation
    updateRoute(currentStart, currentTarget, travelMode);
  }, [
    location,
    adjustedActiveEmergency,
    adjustedSelectedPerson,
    activeSharedLocation,
    travelMode,
  ]);

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

  // Center/fit map camera to focus on selected/active pin or fallback to device location when windows are dismissed
  useEffect(() => {
    if (!mapRef.current) return;

    const isSharedLocationCardActive = Boolean(
      activeSharedLocation &&
      !activeSharedLocation.dismissed &&
      !activeSharedLocation.cardDismissed,
    );

    if (isSharedLocationCardActive && activeSharedLocation) {
      if (activeSharedLocation.isTrackingActive && location) {
        // Fit responder and shared location in view when tracking route
        mapRef.current.fitToCoordinates(
          [
            location,
            {
              latitude: activeSharedLocation.latitude,
              longitude: activeSharedLocation.longitude,
            },
          ],
          {
            edgePadding: { top: 120, right: 100, bottom: 250, left: 100 },
            animated: true,
          },
        );
      } else {
        // Zoom directly to pinned shared location
        mapRef.current.animateToRegion(
          {
            latitude: activeSharedLocation.latitude - 0.0025,
            longitude: activeSharedLocation.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          },
          1000,
        );
      }
      hasCentered.current = false;
    } else if (adjustedActiveEmergency) {
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
      // Selected emergency preview: zoom directly to focus on the selected victim marker
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
      // Fallback: center on user's device location when no floating window is open
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        1000,
      );
      hasCentered.current = true;
    }
  }, [
    location,
    adjustedActiveEmergency,
    adjustedSelectedPerson,
    activeSharedLocation,
    activeSharedLocation?.cardDismissed,
    activeSharedLocation?.dismissed,
  ]);

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
      customMapStyle={silverMapStyle}
      showsUserLocation={false}
    >
      {/* All Emergency Markers (Filtered to within 800m / near you) */}
      {adjustedPeople
        .filter((p) => {
          // Filter by category filter pill if set
          if (categoryFilter && categoryFilter !== "All") {
            const resolvedType = getIncidentType(p);
            if (resolvedType !== categoryFilter.toLowerCase()) return false;
          }
          // Filter by search query if set
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const nameMatch = p.name.toLowerCase().includes(query);
            const addrMatch = p.address.toLowerCase().includes(query);
            const descMatch = (p.description || "")
              .toLowerCase()
              .includes(query);
            if (!nameMatch && !addrMatch && !descMatch) return false;
          }
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
          const isSelected = adjustedSelectedPerson?.id === p.id;
          const currentLoc = isActive && victimLocation ? victimLocation : p;

          const iconInfo = getIncidentIconInfo(p);
          const ActiveIcon = iconInfo.Icon;

          // Format label text using nearest landmark / address
          const labelText = p.address || p.name;
          const shortLabel =
            labelText.length > 22 ? labelText.substring(0, 19) + "..." : labelText;

          return (
            <Marker
              key={p.id}
              coordinate={{
                latitude: currentLoc.latitude,
                longitude: currentLoc.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => onSelectPerson(p)}
              tracksViewChanges={isActive || isSelected}
            >
              <View style={mapStyles.victimWrapper}>
                {/* Custom Pulse Ring for active response alerts */}
                {isActive && <PulseRing color={iconInfo.color} />}

                {/* Circular Badge Marker matching high-fidelity mockup */}
                <View
                  style={[
                    mapStyles.customMarkerCircle,
                    {
                      backgroundColor: iconInfo.color,
                      transform: [
                        { scale: isActive || isSelected ? 1.15 : 0.95 },
                      ],
                      borderColor:
                        isActive || isSelected
                          ? "#FFFFFF"
                          : "rgba(255, 255, 255, 0.8)",
                      borderWidth: isActive || isSelected ? 2.5 : 1.5,
                    },
                  ]}
                >
                  <ActiveIcon
                    size={isActive || isSelected ? 16 : 13}
                    color="#FFFFFF"
                  />
                </View>

                {/* Text Label below Marker matching mockup */}
                <View style={mapStyles.markerLabelContainer}>
                  <Text style={mapStyles.markerLabelText} numberOfLines={1}>
                    {shortLabel}
                  </Text>
                </View>
              </View>
            </Marker>
          );
        })}

      {/* Shared Location Pin Marker (Walk Safe & Location Snapshot) */}
      {activeSharedLocation && !activeSharedLocation.dismissed && (
        <SharedLocationPinMarker
          pin={activeSharedLocation}
          onPress={() => onSelectSharedPin?.(activeSharedLocation)}
        />
      )}

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
      {routeCoords.length > 0 &&
        (adjustedActiveEmergency || activeSharedLocation?.isTrackingActive) && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeWidth={10}
              strokeColor={
                activeSharedLocation?.isTrackingActive
                  ? "rgba(13, 148, 136, 0.18)"
                  : "rgba(175, 16, 26, 0.12)"
              }
            />
            <Polyline
              coordinates={routeCoords}
              strokeWidth={4}
              strokeColor={
                activeSharedLocation?.isTrackingActive ? "#0D9488" : "#af101a"
              }
            />
          </>
        )}
    </MapView>
  );
};

export default React.memo(MapViewComponent);

// =====================================================
// SILVER MAP STYLE (Light Theme)
// =====================================================
const silverMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#E2E8F0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F8FAFC" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#CBD5E1" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#93C5FD" }],
  }, // soft light blue
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#E2E8F0" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#E2E8F0" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#F1F5F9" }],
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
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  victimWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  customMarkerCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  markerLabelContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1,
  },
  markerLabelText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#0F172A",
  },
});
