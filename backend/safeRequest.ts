import { handleGlobalNetworkError, isNetworkError } from "@/components/network/NetworkContext";

export interface SafeRequestOptions {
  timeoutMs?: number;
  autoRetry?: boolean;
  retryId?: string;
}

export interface SafeRequestResult<T> {
  data: T | null;
  error: any | null;
  isNetworkError: boolean;
}

/**
 * Utility to log errors safely:
 * Network/offline errors (expected, handled states) are logged with console.warn
 * to prevent triggering React Native's full-screen dev error overlay (RedBox).
 * Truly unexpected errors are logged with console.error.
 */
export function safeLogError(tag: string, error: any) {
  if (!error) return;
  if (isNetworkError(error)) {
    console.warn(`⚡ ${tag} (Offline/Network):`, typeof error === "string" ? error : error?.message || error);
  } else {
    console.error(tag, error);
  }
}

// Global store for offline status and queued auto-retries
let isGloballyOffline = false;
const autoRetryQueue = new Map<string, () => Promise<any>>();

/**
 * Updates global offline status (called by NetworkContext).
 */
export function setGlobalOfflineState(offline: boolean) {
  isGloballyOffline = offline;
  if (!offline && autoRetryQueue.size > 0) {
    // Automatically re-execute queued retries when coming back online
    flushAutoRetryQueue();
  }
}

/**
 * Returns current global offline state synchronously.
 */
export function getGlobalOfflineState(): boolean {
  return isGloballyOffline;
}

/**
 * Flushes all registered auto-retry callbacks.
 */
export async function flushAutoRetryQueue() {
  const tasks = Array.from(autoRetryQueue.values());
  autoRetryQueue.clear();
  for (const task of tasks) {
    try {
      await task();
    } catch (e) {
      console.warn("⚡ Auto-retry task execution warning:", e);
    }
  }
}

/**
 * Safe Supabase Request Wrapper:
 * 1. Checks pre-flight connectivity state. If offline, skips network call immediately.
 * 2. Enforces a request timeout (default 12s) to prevent hung loading states.
 * 3. Catches and distinguishes network errors from server logic/validation errors.
 * 4. Automatically triggers the global network offline banner.
 * 5. Registers an auto-retry callback to re-execute once online.
 */
export async function safeSupabaseRequest<T>(
  requestFn: () => PromiseLike<{ data: T | null; error: any }>,
  options: SafeRequestOptions = {}
): Promise<SafeRequestResult<T>> {
  const { timeoutMs = 12000, autoRetry = true, retryId } = options;

  // 1. Pre-flight check: if already flagged offline, skip network call immediately
  if (isGloballyOffline) {
    const offlineErr = new Error("Device is offline. Connection lost.");
    handleGlobalNetworkError(offlineErr);

    if (autoRetry) {
      const key = retryId || Math.random().toString(36).substring(7);
      autoRetryQueue.set(key, () => safeSupabaseRequest(requestFn, options));
    }

    return {
      data: null,
      error: offlineErr,
      isNetworkError: true,
    };
  }

  // 2. Request Timeout Wrapper
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) => {
    timeoutTimer = setTimeout(() => {
      const err = new Error("Request timed out. Please check your network connection.");
      (err as any).code = "ETIMEDOUT";
      reject(err);
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([requestFn(), timeoutPromise]);
    if (timeoutTimer) clearTimeout(timeoutTimer);

    // Supabase standard response structure { data, error }
    const { data, error } = response as { data: T | null; error: any };

    if (error) {
      const isNet = isNetworkError(error);
      if (isNet) {
        handleGlobalNetworkError(error);
        if (autoRetry) {
          const key = retryId || Math.random().toString(36).substring(7);
          autoRetryQueue.set(key, () => safeSupabaseRequest(requestFn, options));
        }
      }
      return {
        data: null,
        error,
        isNetworkError: isNet,
      };
    }

    return {
      data,
      error: null,
      isNetworkError: false,
    };
  } catch (err: any) {
    if (timeoutTimer) clearTimeout(timeoutTimer);

    const isNet = isNetworkError(err);
    if (isNet) {
      handleGlobalNetworkError(err);
      if (autoRetry) {
        const key = retryId || Math.random().toString(36).substring(7);
        autoRetryQueue.set(key, () => safeSupabaseRequest(requestFn, options));
      }
    }

    return {
      data: null,
      error: err,
      isNetworkError: isNet,
    };
  }
}
