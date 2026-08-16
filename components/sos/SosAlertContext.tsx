import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Location from "expo-location";
import {
  fetchNearbyAndTrustedSos,
  respondToSos,
  SosAlert,
  subscribeToSosAlerts,
} from "@/backend/sos";

interface SosAlertContextType {
  activeIncomingAlerts: SosAlert[];
  currentAlert: SosAlert | null;
  userLocation: { latitude: number; longitude: number } | null;
  dismissAlert: (sosId: string) => void;
  respondToCurrentAlert: () => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
}

const SosAlertContext = createContext<SosAlertContextType>({
  activeIncomingAlerts: [],
  currentAlert: null,
  userLocation: null,
  dismissAlert: () => {},
  respondToCurrentAlert: async () => false,
  refreshAlerts: async () => {},
});

export const useSosAlert = () => useContext(SosAlertContext);

export const SosAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  const fetchAlerts = useCallback(async () => {
    if (!userLocation) return;
    const { data, error } = await fetchNearbyAndTrustedSos(
      userLocation.latitude,
      userLocation.longitude
    );
    if (!error && data) {
      setAlerts(data);
    }
  }, [userLocation]);

  // Position watcher to trigger proximity re-checks as user moves
  useEffect(() => {
    let isMounted = true;

    async function startLocationWatch() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        // Obtain initial location
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted && initial?.coords) {
          setUserLocation({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          });
        }

        // Subscribe to movement updates (foreground only)
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 15, // Re-check proximity every 15 meters
            timeInterval: 15000,  // Or every 15 seconds
          },
          (loc) => {
            if (isMounted && loc?.coords) {
              setUserLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
            }
          }
        );
      } catch (err) {
        console.warn("SosAlertProvider location watch error:", err);
      }
    }

    startLocationWatch();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // Fetch alerts whenever user location updates or realtime event occurs
  useEffect(() => {
    if (userLocation) {
      fetchAlerts();
    }
  }, [userLocation, fetchAlerts]);

  // Realtime subscription on sos_alerts table (ignoring location ticks)
  useEffect(() => {
    const unsubscribe = subscribeToSosAlerts((changeType, alertRow) => {
      if (changeType === "status_changed" || changeType === "deleted") {
        if (alertRow?.id && alertRow.status !== "active") {
          // Immediately remove the non-active alert from local state for instant overlay dismissal
          setAlerts((prev) => prev.filter((a) => a.id !== alertRow.id));
        }
        fetchAlerts();
      } else if (changeType === "new_alert") {
        fetchAlerts();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [fetchAlerts]);

  const dismissAlert = (sosId: string) => {
    // Ephemeral in-memory dismissal: only affects local UI overlay visibility
    setDismissedIds((prev) => new Set(prev).add(sosId));
  };

  const activeIncomingAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
  const currentAlert = activeIncomingAlerts[0] || null;

  // Fallback safety-net interval: re-checks active alerts every 15s ONLY while an overlay is showing
  useEffect(() => {
    if (!currentAlert) return;

    const interval = setInterval(() => {
      fetchAlerts();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [currentAlert, fetchAlerts]);

  const respondToCurrentAlert = async (): Promise<boolean> => {
    if (!currentAlert) return false;
    const source = currentAlert.source ?? "proximity";
    const { error } = await respondToSos(currentAlert.id, source);
    if (!error) {
      dismissAlert(currentAlert.id);
      return true;
    }
    return false;
  };

  return (
    <SosAlertContext.Provider
      value={{
        activeIncomingAlerts,
        currentAlert,
        userLocation,
        dismissAlert,
        respondToCurrentAlert,
        refreshAlerts: fetchAlerts,
      }}
    >
      {children}
    </SosAlertContext.Provider>
  );
};
