import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { handleGlobalNetworkError } from "@/components/network";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, options) => {
        try {
          return await fetch(url, options);
        } catch (error) {
          handleGlobalNetworkError(error);
          throw error;
        }
      },
    },
  }
);

/**
 * Safely creates a Supabase Realtime channel with a unique name,
 * ensures no duplicated channel listeners, and routes channel/network errors
 * to global NetworkContext error handling.
 */
export function createSafeRealtimeChannel(
  baseTopic: string,
  configure: (channel: RealtimeChannel) => RealtimeChannel,
  onStatusChange?: (status: string, err?: any) => void
): RealtimeChannel {
  const uniqueName = `${baseTopic}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const channel = supabase.channel(uniqueName);

  const configuredChannel = configure(channel);

  configuredChannel.subscribe((status, err) => {
    if (onStatusChange) {
      try {
        onStatusChange(status, err);
      } catch (_) { }
    }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      const errorMsg =
        err?.message || `Realtime subscription offline [${status}]`;
      console.warn(`⚡ Realtime channel notice [${baseTopic}]:`, errorMsg);
      handleGlobalNetworkError(err || new Error(errorMsg));
    }
  });

  return configuredChannel;
}