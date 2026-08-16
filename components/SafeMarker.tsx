import React, { useState, useEffect, useRef } from "react";
import { Marker, MarkerProps, LatLng } from "react-native-maps";

export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  // (0,0) is Null Island, almost always a fallback error in this app's context
  if (lat === 0 && lng === 0) return false;
  // Basic bounds checking
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export const SafeMarker: React.FC<MarkerProps> = (props) => {
  const { coordinate, ...rest } = props;
  
  const [validCoord, setValidCoord] = useState<LatLng | null>(() => {
    return isValidCoordinate(coordinate?.latitude, coordinate?.longitude)
      ? coordinate
      : null;
  });

  const prevCoordRef = useRef<LatLng | null>(validCoord);

  useEffect(() => {
    if (isValidCoordinate(coordinate?.latitude, coordinate?.longitude)) {
      setValidCoord(coordinate);
      prevCoordRef.current = coordinate;
    }
  }, [coordinate?.latitude, coordinate?.longitude]);

  // Fallback to the last known valid coordinate if the current state is still somehow null,
  // though validCoord state itself holds the last valid one natively.
  const coordToRender = validCoord || prevCoordRef.current;

  // Don't render anything if we've NEVER had a valid coordinate
  if (!coordToRender || !isValidCoordinate(coordToRender.latitude, coordToRender.longitude)) {
    return null;
  }

  return <Marker coordinate={coordToRender} {...rest} />;
};
