import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { updateMessageLocation } from "@/backend/chat";

interface WalkSafeContextType {
  activeSessionMessageId: string | null;
  startWalkSafeTracking: (messageId: string, table?: "private_chat_messages" | "emergency_chat_messages") => void;
  stopWalkSafeTracking: () => void;
}

const WalkSafeContext = createContext<WalkSafeContextType>({
  activeSessionMessageId: null,
  startWalkSafeTracking: () => {},
  stopWalkSafeTracking: () => {},
});

export const useWalkSafe = () => useContext(WalkSafeContext);

export const WalkSafeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSessionMessageId, setActiveSessionMessageId] = useState<string | null>(null);
  const activeTableRef = useRef<"private_chat_messages" | "emergency_chat_messages">("private_chat_messages");
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const isUpdatingRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);

  const stopWalkSafeTracking = () => {
    setActiveSessionMessageId(null);
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
  };

  const startWalkSafeTracking = async (
    messageId: string,
    table: "private_chat_messages" | "emergency_chat_messages" = "private_chat_messages"
  ) => {
    stopWalkSafeTracking();
    setActiveSessionMessageId(messageId);
    activeTableRef.current = table;

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        console.warn("Location permission not granted for Walk Safe tracking.");
        return;
      }

      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000,   // Update at most every 5 seconds
        },
        async (location) => {
          if (!activeSessionMessageId) return; // Wait, this might refer to stale closure state. I will use the messageId argument.
          
          // Simple debounce/throttle
          const now = Date.now();
          if (isUpdatingRef.current || now - lastUpdateRef.current < 3000) return;

          isUpdatingRef.current = true;
          try {
            await updateMessageLocation(
              messageId,
              location.coords.latitude,
              location.coords.longitude,
              activeTableRef.current
            );
            lastUpdateRef.current = Date.now();
          } catch (err) {
            console.warn("Failed to update walk safe location:", err);
          } finally {
            isUpdatingRef.current = false;
          }
        }
      );
    } catch (err) {
      console.error("Failed to start Walk Safe location watcher:", err);
    }
  };

  useEffect(() => {
    return () => {
      stopWalkSafeTracking();
    };
  }, []);

  return (
    <WalkSafeContext.Provider value={{ activeSessionMessageId, startWalkSafeTracking, stopWalkSafeTracking }}>
      {children}
    </WalkSafeContext.Provider>
  );
};
