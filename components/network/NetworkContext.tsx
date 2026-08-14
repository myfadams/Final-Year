import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { NetworkOfflineBanner } from "./NetworkOfflineBanner";

export interface NetworkContextType {
  isOffline: boolean;
  lastError: string | null;
  handleNetworkError: (error: any) => boolean;
  retryConnection: () => void;
  clearNetworkError: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

let globalHandleNetworkError: ((error: any) => boolean) | null = null;

/**
 * Utility function callable from anywhere (even outside React hooks) to inspect
 * an error and automatically trigger network offline handling if it's a network error.
 * Returns `true` if handled as a network error, `false` otherwise.
 */
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  const msg = String(
    error?.message ||
    error?.error_description ||
    error?.name ||
    error?.details ||
    error ||
    ""
  ).toLowerCase();

  const isMatchingMsg =
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("typeerror: network request failed") ||
    msg.includes("networkerror") ||
    msg.includes("connection failed") ||
    msg.includes("offline") ||
    msg.includes("fetcherror") ||
    msg.includes("authretryablefetcherror") ||
    msg.includes("channel_error") ||
    msg.includes("timed_out") ||
    msg.includes("websocket") ||
    msg.includes("aborted") ||
    msg.includes("realtime subscription offline") ||
    msg.includes("network error");

  const isMatchingCodeOrStatus =
    error?.name === "AuthRetryableFetchError" ||
    error?.name === "FetchError" ||
    error?.status === 0 ||
    error?.code === "FETCH_ERROR" ||
    error?.code === "ENOTFOUND" ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ETIMEDOUT";

  return isMatchingMsg || isMatchingCodeOrStatus;
};

export const handleGlobalNetworkError = (error: any): boolean => {
  if (globalHandleNetworkError) {
    return globalHandleNetworkError(error);
  }
  return isNetworkError(error);
};

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearNetworkError = useCallback(() => {
    setIsOffline(false);
    setLastError(null);
  }, []);

  const handleNetworkError = useCallback((error: any): boolean => {
    if (isNetworkError(error)) {
      const msg = typeof error === "string" ? error : error?.message || "Network connection failed.";
      console.warn("⚡ Network Context intercepted offline error:", msg);
      setIsOffline(true);
      setLastError(msg);
      return true;
    }
    return false;
  }, []);

  globalHandleNetworkError = handleNetworkError;

  const retryConnection = useCallback(() => {
    console.log("⚡ Network Context retrying connection...");
    // Reset state to trigger re-check
    clearNetworkError();
  }, [clearNetworkError]);

  // Hook into global ErrorUtils & unhandled promise rejections in React Native to suppress redbox popups for network failures
  useEffect(() => {
    if (typeof global !== "undefined") {
      // 1. Uncaught JS exceptions handler
      if ((global as any).ErrorUtils) {
        const defaultHandler = (global as any).ErrorUtils.getGlobalHandler?.();
        (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          const handled = handleNetworkError(error);
          if (handled) {
            // Prevent redbox error popup for network offline errors
            return;
          }
          if (defaultHandler) {
            defaultHandler(error, isFatal);
          }
        });
      }

      // 2. Unhandled promise rejections handler
      const prevUnhandled = (global as any).onunhandledrejection;
      (global as any).onunhandledrejection = (event: any) => {
        const error = event?.reason || event;
        if (handleNetworkError(error)) {
          if (typeof event?.preventDefault === "function") {
            event.preventDefault();
          }
          return;
        }
        if (typeof prevUnhandled === "function") {
          prevUnhandled(event);
        }
      };
    }
  }, [handleNetworkError]);

  return (
    <NetworkContext.Provider
      value={{
        isOffline,
        lastError,
        handleNetworkError,
        retryConnection,
        clearNetworkError,
      }}
    >
      <NetworkOfflineBanner
        visible={isOffline}
        message={lastError}
        onRetry={retryConnection}
        onDismiss={clearNetworkError}
      />
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    return {
      isOffline: false,
      lastError: null,
      handleNetworkError: (err) => isNetworkError(err),
      retryConnection: () => {},
      clearNetworkError: () => {},
    };
  }
  return context;
};
