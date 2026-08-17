import { SharedLocationPinMarker } from "@/components/SharedLocationPinMarker";
import Colors, { ResQColors } from "@/constants/Colors";
import { SharedLocationPin } from "@/constants/globalState";
import { Person } from "@/constants/interfaces";
import axios from "axios";
import * as Location from "expo-location";
import { BriefcaseMedical, Flame, Shield, ShieldAlert } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import MapView, { Polyline } from "react-native-maps";
import { SafeMarker as Marker, isValidCoordinate } from "@/components/SafeMarker";

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

// Trims a polyline, keeping only the portion from the closest segment to the end
const trimPolylineToLocation = (
  point: { latitude: number; longitude: number },
  polyline: { latitude: number; longitude: number }[]
) => {
  if (!polyline || polyline.length <= 1) return polyline;

  let minDistance = Infinity;
  let closestSegmentIndex = 0;

  // Find the closest line segment
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = getDistanceToSegmentInMeters(point, polyline[i], polyline[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
      closestSegmentIndex = i;
    }
  }

  // Keep the current position as the new start, followed by the remaining nodes
  const trimmed = [point, ...polyline.slice(closestSegmentIndex + 1)];
  return trimmed;
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
export interface ActiveSosMonitoringPin {
  sosId: string;
  senderName?: string;
  senderAvatar?: string | null;
  latitude: number;
  longitude: number;
  isRoutingActive: boolean;
  cardDismissed?: boolean;
}

interface MapViewComponentProps {
  selectedPerson: Person | null;
  activeEmergency: Person | null;
  activeSharedLocation?: SharedLocationPin | null;
  activeSosMonitoring?: ActiveSosMonitoringPin | null;
  realEmergencies?: Person[];
  onSelectPerson: (p: Person) => void;
  onSelectSharedPin?: (pin: SharedLocationPin) => void;
  onSelectSosPin?: (pin: ActiveSosMonitoringPin) => void;
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
  activeSosMonitoring,
  realEmergencies,
  onSelectPerson,
  onSelectSharedPin,
  onSelectSosPin,
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
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);

  const mapRef = useRef<any>(null);
  const watchRef = useRef<any>(null);
  const headingWatchRef = useRef<any>(null);
  const lastAppliedHeadingRef = useRef<number | null>(null);
  const lastHeadingApplyTimeRef = useRef<number>(0);
  const wasNavigatingRef = useRef<boolean>(false);
  const navigationFitTargetRef = useRef<string | null>(null);
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
  const lastTrimTimeRef = useRef<number>(0);
  const lastTrimLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

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
      if (isValidCoordinate(current.coords.latitude, current.coords.longitude)) {
        setLocation(current.coords);
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Watch every 5 seconds (5-10s requirement)
          distanceInterval: 10, // Minimum movement 10 meters
        },
        (loc) => {
          // Reject GPS glitches / null-island fixes outright — never let a bad
          // sample overwrite the last known-good location.
          if (!isValidCoordinate(loc.coords.latitude, loc.coords.longitude)) return;
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
    let shouldRoute = true;

    if (activeSosMonitoring) {
      targetLat = activeSosMonitoring.latitude;
      targetLng = activeSosMonitoring.longitude;
      shouldRoute = activeSosMonitoring.isRoutingActive;
    } else if (
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

    const hasValidTarget =
      targetLat !== null && targetLng !== null && isValidCoordinate(targetLat, targetLng);
    const hasValidStart = isValidCoordinate(location.latitude, location.longitude);

    if (!hasValidTarget || !hasValidStart) {
      // Never route toward/from a null-island or otherwise malformed fix —
      // just hold the last good route (if any) rather than snapping to (0,0).
      if (!hasValidTarget && routeCoords.length > 0) {
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

    const currentTarget = { latitude: targetLat as number, longitude: targetLng as number };
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

    if (!shouldRoute) {
      if (routeCoords.length > 0) {
        setRouteCoords([]);
        currentRouteCoordsRef.current = [];
        lastCalculatedLocationRef.current = null;
        lastTargetLocationRef.current = null;
        lastTravelModeRef.current = null;
      }
      return;
    }

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
    activeSosMonitoring,
    travelMode,
  ]);

  // Live-updating route trimming (throttled)
  useEffect(() => {
    if (!location || !isValidCoordinate(location.latitude, location.longitude)) return;
    if (currentRouteCoordsRef.current.length === 0) return;

    const now = Date.now();
    const timeSinceLastTrim = now - lastTrimTimeRef.current;
    
    let distSinceLastTrim = Infinity;
    if (lastTrimLocationRef.current) {
      distSinceLastTrim = getDistanceInMeters(
        lastTrimLocationRef.current.latitude,
        lastTrimLocationRef.current.longitude,
        location.latitude,
        location.longitude
      );
    }

    // Throttle: 5 seconds or 10 meters
    if (timeSinceLastTrim >= 5000 || distSinceLastTrim >= 10) {
      lastTrimTimeRef.current = now;
      lastTrimLocationRef.current = location;

      const trimmedRoute = trimPolylineToLocation(location, currentRouteCoordsRef.current);
      if (trimmedRoute.length !== currentRouteCoordsRef.current.length || 
          trimmedRoute[0].latitude !== currentRouteCoordsRef.current[0].latitude) {
        currentRouteCoordsRef.current = trimmedRoute;
        setRouteCoords(trimmedRoute);
      }
    }
  }, [location]);

  // Handle active emergency victim position updates without simulated jitter
  useEffect(() => {
    if (victimInterval.current) {
      clearInterval(victimInterval.current);
      victimInterval.current = null;
    }

    if (
      !adjustedActiveEmergency ||
      !isValidCoordinate(adjustedActiveEmergency.latitude, adjustedActiveEmergency.longitude)
    ) {
      setVictimLocation(null);
      return;
    }

    hasCentered.current = false;

    setVictimLocation({
      latitude: adjustedActiveEmergency.latitude,
      longitude: adjustedActiveEmergency.longitude,
    });
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

  // True whenever we're actively en-route to a target (as opposed to just previewing a pin).
  // While navigating, the camera is owned by the heading-follow effect below instead of the
  // continuous "fit both points" logic, so the two don't fight each other every GPS tick.
  const isNavigating = !!(
    adjustedActiveEmergency ||
    (activeSharedLocation?.isTrackingActive && !activeSharedLocation.dismissed) ||
    activeSosMonitoring?.isRoutingActive
  );

  // Center/fit map camera to focus on selected/active pin or fallback to device location when windows are dismissed.
  // Every branch below is gated on isValidCoordinate() — an invalid/null-island fix must never
  // reach fitToCoordinates/animateToRegion, since that's what sends the camera (and the pins
  // riding along with it) flying off to a corner of the world.
  useEffect(() => {
    if (!mapRef.current) return;

    const validLocation =
      location && isValidCoordinate(location.latitude, location.longitude) ? location : null;

    if (
      activeSosMonitoring &&
      validLocation &&
      isValidCoordinate(activeSosMonitoring.latitude, activeSosMonitoring.longitude)
    ) {
      // Once actively routing, give one overview fit then hand the camera off to the
      // heading-follow effect so it isn't yanked back to a "fit both" framing every tick.
      const targetKey = `sos:${activeSosMonitoring.sosId}`;
      if (!activeSosMonitoring.isRoutingActive || navigationFitTargetRef.current !== targetKey) {
        mapRef.current.fitToCoordinates(
          [
            validLocation,
            {
              latitude: activeSosMonitoring.latitude,
              longitude: activeSosMonitoring.longitude,
            },
          ],
          {
            edgePadding: { top: 120, right: 80, bottom: 260, left: 80 },
            animated: true,
          },
        );
        if (activeSosMonitoring.isRoutingActive) navigationFitTargetRef.current = targetKey;
      }
      hasCentered.current = false;
    } else if (
      activeSharedLocation &&
      isValidCoordinate(activeSharedLocation.latitude, activeSharedLocation.longitude)
    ) {
      if (activeSharedLocation.isTrackingActive && validLocation) {
        const targetKey = `shared:${activeSharedLocation.id}`;
        if (navigationFitTargetRef.current !== targetKey) {
          // Fit responder and shared location in view when tracking route (once per session)
          mapRef.current.fitToCoordinates(
            [
              validLocation,
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
          navigationFitTargetRef.current = targetKey;
        }
        hasCentered.current = false;
      } else if (!activeSharedLocation.isTrackingActive) {
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
        hasCentered.current = false;
      }
    } else if (
      adjustedActiveEmergency &&
      isValidCoordinate(adjustedActiveEmergency.latitude, adjustedActiveEmergency.longitude)
    ) {
      // Active emergency navigation: fit both responder and destination in view (once per session),
      // then let the heading-follow effect own the camera as the responder moves.
      const targetKey = `emergency:${adjustedActiveEmergency.id}`;
      if (validLocation && navigationFitTargetRef.current !== targetKey) {
        mapRef.current.fitToCoordinates(
          [
            validLocation,
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
        navigationFitTargetRef.current = targetKey;
      }
      hasCentered.current = false;
    } else if (
      adjustedSelectedPerson &&
      isValidCoordinate(adjustedSelectedPerson.latitude, adjustedSelectedPerson.longitude)
    ) {
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
    } else if (validLocation) {
      // Fallback: center on user's device location when no floating window is open
      mapRef.current.animateToRegion(
        {
          latitude: validLocation.latitude,
          longitude: validLocation.longitude,
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
    activeSosMonitoring,
  ]);

  // Handle manual recenter / compass-tap trigger — always snaps the camera back to a
  // true north-up, level orientation in addition to recentering, since animateToRegion
  // alone doesn't reliably clear an existing rotation/tilt on every platform.
  useEffect(() => {
    if (recenterNonce && mapRef.current && location && isValidCoordinate(location.latitude, location.longitude)) {
      hasCentered.current = true;
      lastAppliedHeadingRef.current = 0;
      mapRef.current.animateCamera(
        {
          center: { latitude: location.latitude, longitude: location.longitude },
          heading: 0,
          pitch: 0,
          zoom: 17,
        },
        { duration: 600 },
      );
    }
  }, [recenterNonce]);

  // Track device compass heading while actively navigating, so the map can rotate to match
  // the direction of travel (heading-up navigation) instead of staying locked north-up.
  useEffect(() => {
    if (!isNavigating) {
      if (headingWatchRef.current) {
        headingWatchRef.current.remove();
        headingWatchRef.current = null;
      }
      // Navigation just ended — snap the map back to north-up and clear the fit-once guard
      // so the next navigation session gets a fresh overview fit.
      navigationFitTargetRef.current = null;
      if (wasNavigatingRef.current && mapRef.current) {
        lastAppliedHeadingRef.current = 0;
        mapRef.current.animateCamera({ heading: 0, pitch: 0 }, { duration: 500 });
      }
      wasNavigatingRef.current = false;
      return;
    }

    wasNavigatingRef.current = true;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      headingWatchRef.current = await Location.watchHeadingAsync((headingData) => {
        const trueHeading = headingData.trueHeading;
        const magHeading = headingData.magHeading;
        const heading =
          typeof trueHeading === "number" && trueHeading >= 0
            ? trueHeading
            : typeof magHeading === "number" && magHeading >= 0
              ? magHeading
              : null;
        if (heading !== null) setDeviceHeading(heading);
      });
    })();

    return () => {
      cancelled = true;
      if (headingWatchRef.current) {
        headingWatchRef.current.remove();
        headingWatchRef.current = null;
      }
    };
  }, [isNavigating]);

  // Apply the tracked heading to the map camera while navigating (throttled so we don't
  // spam the native bridge on every 1-2 degree compass jitter).
  useEffect(() => {
    if (!isNavigating || deviceHeading === null || !mapRef.current) return;
    if (!location || !isValidCoordinate(location.latitude, location.longitude)) return;

    const prevHeading = lastAppliedHeadingRef.current;
    const headingDelta =
      prevHeading === null
        ? 360
        : Math.min(Math.abs(deviceHeading - prevHeading), 360 - Math.abs(deviceHeading - prevHeading));

    const now = Date.now();
    if (headingDelta < 4 && now - lastHeadingApplyTimeRef.current < 1500) return;

    lastAppliedHeadingRef.current = deviceHeading;
    lastHeadingApplyTimeRef.current = now;

    mapRef.current.animateCamera(
      { heading: deviceHeading, center: { latitude: location.latitude, longitude: location.longitude } },
      { duration: 400 },
    );
  }, [deviceHeading, isNavigating, location]);

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

      {/* Active SOS Monitoring Sender Marker */}
      {activeSosMonitoring && (
        <Marker
          key={`active-sos-marker-${activeSosMonitoring.sosId}`}
          coordinate={{
            latitude: activeSosMonitoring.latitude,
            longitude: activeSosMonitoring.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={true}
          onPress={() => onSelectSosPin?.(activeSosMonitoring)}
        >
          <View style={mapStyles.victimWrapper}>
            <PulseRing color={ResQColors.primaryRed} />
            <View
              style={[
                mapStyles.customMarkerCircle,
                {
                  backgroundColor: ResQColors.primaryRed,
                  transform: [{ scale: 1.25 }],
                  borderColor: "#FFFFFF",
                  borderWidth: 2.5,
                },
              ]}
            >
              <ShieldAlert size={18} color="#FFFFFF" />
            </View>
            <View
              style={[
                mapStyles.markerLabelContainer,
                { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
              ]}
            >
              <Text
                style={[
                  mapStyles.markerLabelText,
                  { color: ResQColors.primaryRed, fontFamily: "Inter_700Bold" },
                ]}
                numberOfLines={1}
              >
                🚨 SOS: {activeSosMonitoring.senderName || "In Distress"}
              </Text>
            </View>
          </View>
        </Marker>
      )}

      {/* Responder Location Marker */}
      {location && (
        <Marker
          key="current-user-responder-location-marker"
          coordinate={location}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={true}
        >
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
        (adjustedActiveEmergency ||
          activeSharedLocation?.isTrackingActive ||
          activeSosMonitoring?.isRoutingActive) && (
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
