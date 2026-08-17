import AsyncStorage from "@react-native-async-storage/async-storage";
import { Person } from "@/constants/interfaces";

const ACTIVE_EMERGENCY_CACHE_KEY = "resq_active_emergency_cache_v1";

interface ActiveEmergencyCache {
  emergencyId: string;
  person: Person;
  savedAt: number;
}

/**
 * Persists the currently-responding-to emergency to disk so it survives a full app
 * restart, not just a re-render. Lets the map screen resume navigation offline instead
 * of stranding a responder on a blank map after the app was killed mid-response with no
 * connectivity to re-fetch the emergency from Supabase.
 */
export async function saveActiveEmergencyCache(emergencyId: string, person: Person): Promise<void> {
  try {
    const payload: ActiveEmergencyCache = { emergencyId, person, savedAt: Date.now() };
    await AsyncStorage.setItem(ACTIVE_EMERGENCY_CACHE_KEY, JSON.stringify(payload));
  } catch (_) {
    // Best-effort cache — losing it just means no offline resume, not a functional failure.
  }
}

export async function loadActiveEmergencyCache(): Promise<ActiveEmergencyCache | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_EMERGENCY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveEmergencyCache;
  } catch (_) {
    return null;
  }
}

export async function clearActiveEmergencyCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_EMERGENCY_CACHE_KEY);
  } catch (_) {
    // no-op
  }
}
