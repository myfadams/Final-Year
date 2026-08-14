import { createSafeRealtimeChannel, supabase } from "./supabaseConfig";
import { safeSupabaseRequest } from "./safeRequest";
import { getVerifyRedirectUrl } from "../externalFunctions/expoFunctions";



/**
 * Interface representing user verification data fields
 */
export interface UserVerificationData {
  student_id_number: string;
  student_reference_number: string;
  program_of_study: string;
  phone: string;
  location_type: string;
  address: string;
  student_card_image_url?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Interface representing the profile data of a user
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "student" | "staff" | "responder" | "admin";
  is_verified: boolean;
  profile_image_url: string | null;
  student_id_number: string | null;
  student_reference_number: string | null;
  student_card_image_url: string | null;
  program_of_study: string | null;
  location_type: string | null;
  address: string | null;
  // avatar_color: string;
  // marker_color: string;
  known_health_problems: string[];
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check if a user with the given email already exists in the public users table.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (error) {
      console.warn("checkEmailExists warning:", error.message);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error("checkEmailExists error:", err);
    return false;
  }
}

/**
 * 1. Sign Up a New User
 * Registers the user under Supabase Auth.
 * The SQL trigger 'on_auth_user_created' will copy their ID, email, and name into the public users table.
 */
export async function signUpUser(
  email: string,
  password: string,
  fullName: string,
) {
  try {
    // build options safely — only set emailRedirectTo when it's an absolute http(s) URL
    const redirectUrl = getVerifyRedirectUrl("verify");
    const options: any = {
      data: {
        full_name: fullName,
        name: fullName,
      },
    };
    if (typeof redirectUrl === "string" && /^https?:\/\//i.test(redirectUrl)) {
      options.emailRedirectTo = redirectUrl;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      let msg = error.message;
      const lowerMsg = (msg || "").toLowerCase();
      const isExistingUser =
        lowerMsg.includes("already registered") ||
        lowerMsg.includes("user already exists") ||
        lowerMsg.includes("already in use") ||
        lowerMsg.includes("email already registered");

      if (isExistingUser) {
        return { data: null, error: "An account with this email already exists", isExistingUser: true };
      }

      if (!msg || typeof msg !== "string" || msg.includes("[object Object]")) {
        msg = "Account creation failed due to a server error. Please try again.";
      }
      if (msg.includes("unexpected_failure") || (error as any).status === 500) {
        msg =
          "Database trigger or email service error on Supabase server. Please check Supabase Auth triggers and logs.";
      }
      return { data: null, error: msg, isExistingUser: false };
    }

    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { data: null, error: "An account with this email already exists", isExistingUser: true };
    }

    return { data, error: null, isExistingUser: false };
  } catch (error: any) {
    console.error("Sign Up Error:", error);
    let msg = error?.message || String(error);
    if (
      msg.includes("Unexpected character: <") ||
      msg.includes("JSON Parse error") ||
      msg.includes("statusText") ||
      msg.includes("unexpected_failure")
    ) {
      msg =
        "Database trigger or email service error on Supabase server. Please check Supabase Auth triggers and logs.";
    }
    return { data: null, error: msg, isExistingUser: false };
  }
}

/**
 * 2. Sign In an Existing User
 */
export async function signInUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const msg = error.message || (error as any)?.error_description || "Invalid login credentials";
      return { data: null, error: msg };
    }
    return { data, error: null };
  } catch (error: any) {
    console.error("Sign In Error:", error);
    const msg = error?.message || (typeof error === "string" ? error : "An unexpected error occurred during sign in.");
    return { data: null, error: msg };
  }
}

/**
 * Resend email verification link to user
 */
export async function resendVerificationEmail(email: string) {
  try {
    const redirectUrl = getVerifyRedirectUrl("verify");
    const options: any = {};
    if (typeof redirectUrl === "string" && /^https?:\/\//i.test(redirectUrl)) {
      options.emailRedirectTo = redirectUrl;
    }

    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options,
    });

    if (error) {
      console.error("Resend Verification Email Error:", error.message);
      const msg = error.message || (error as any)?.error_description || "Failed to resend verification email.";
      return { data: null, error: msg };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error("Resend Verification Email Exception:", error);
    const msg = error?.message || (typeof error === "string" ? error : "Failed to resend verification email.");
    return { data: null, error: msg };
  }
}


import { globalState } from "@/constants/globalState";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY_USER_PROFILE = "@resq_cached_user_profile";

/**
 * Loads the user profile from AsyncStorage into memory (globalState) and returns it.
 */
export async function getCachedUserProfile(): Promise<UserProfile | null> {
  try {
    if (globalState.userProfile) {
      return globalState.userProfile;
    }
    const jsonValue = await AsyncStorage.getItem(CACHE_KEY_USER_PROFILE);
    if (jsonValue != null) {
      const profile = JSON.parse(jsonValue) as UserProfile;
      globalState.userProfile = profile;
      return profile;
    }
  } catch (e) {
    console.error("Failed to load cached user profile:", e);
  }
  return null;
}

/**
 * Saves a user profile to memory (globalState) and AsyncStorage cache.
 */
export async function setCachedUserProfile(profile: UserProfile | null): Promise<void> {
  try {
    globalState.userProfile = profile;
    if (profile) {
      await AsyncStorage.setItem(CACHE_KEY_USER_PROFILE, JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem(CACHE_KEY_USER_PROFILE);
    }
  } catch (e) {
    console.error("Failed to save cached user profile:", e);
  }
}

/**
 * Clears the cached user profile from memory and AsyncStorage.
 */
export async function clearCachedUserProfile(): Promise<void> {
  try {
    globalState.userProfile = null;
    await AsyncStorage.removeItem(CACHE_KEY_USER_PROFILE);
  } catch (e) {
    console.error("Failed to clear cached user profile:", e);
  }
}

/**
 * Realtime subscription channel reference
 */
let realtimeProfileChannel: any = null;

/**
 * Subscribes to Supabase Realtime changes for the user's row in public.users table.
 * Automatically updates globalState and AsyncStorage cache whenever user data changes.
 */
export function subscribeToUserProfileChanges(userId: string, onUpdate?: (profile: UserProfile) => void) {
  if (!userId) return null;

  if (realtimeProfileChannel) {
    try {
      supabase.removeChannel(realtimeProfileChannel);
      realtimeProfileChannel = null;
    } catch (e) { }
  }

  try {
    realtimeProfileChannel = createSafeRealtimeChannel(`user-profile-${userId}`, (ch) =>
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            console.log("⚡ Realtime user profile update received from DB:", payload.new);
            const updatedProfile = payload.new as UserProfile;
            setCachedUserProfile(updatedProfile);
            if (onUpdate) {
              onUpdate(updatedProfile);
            }
          }
        }
      )
    );
  } catch (err: any) {
    console.warn("subscribeToUserProfileChanges setup notice:", err?.message || err);
  }

  return realtimeProfileChannel;
}

/**
 * 3. Sign Out Current User
 */
export async function signOutUser() {
  try {
    if (realtimeProfileChannel) {
      try {
        supabase.removeChannel(realtimeProfileChannel);
        realtimeProfileChannel = null;
      } catch (e) {
        console.warn("Could not remove realtime channel during signout:", e);
      }
    }

    const { error } = await supabase.auth.signOut();
    await clearCachedUserProfile();
    globalState.activeEmergencyId = null;
    globalState.activeEmergencyPerson = null;
    globalState.activeSharedLocation = null;
    globalState.userProfile = null;
    try {
      await AsyncStorage.removeItem("@pending_verify_credentials");
    } catch (e) { }

    if (error) {
      console.warn("Supabase signOut notice:", error.message);
    }
    return { error: null };
  } catch (error: any) {
    await clearCachedUserProfile();
    console.error("Sign Out Error:", error);
    return { error: error?.message || (typeof error === "string" ? error : "Sign out failed") };
  }
}

/**
 * 4. Get Current Auth User and Session
 */
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (
        error.message?.includes("Network request failed") ||
        error.message?.includes("fetch") ||
        error.message?.includes("Failed to fetch")
      ) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          return { user: sessionData.session.user, error: null };
        }
      }
      return { user: null, error: error.message || "Failed to get current user" };
    }
    return { user, error: null };
  } catch (error: any) {
    console.warn("getCurrentUser notice (attempting session fallback):", error?.message || error);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        return { user: sessionData.session.user, error: null };
      }
    } catch {
      // ignore
    }
    return { user: null, error: error?.message || (typeof error === "string" ? error : "Failed to get current user") };
  }
}

/**
 * 5. Fetch User Profile Details with Cache Strategy:
 * - Checks cache (AsyncStorage / globalState) first.
 * - If cached data exists and matches userId, returns it immediately.
 * - Checks database for updates in background or directly if no cache exists.
 * - Refetches and updates cache if user data changed.
 */
export async function getUserProfile(userId: string, forceRefetch = false) {
  try {
    // 1. Check in-memory and AsyncStorage cache first
    const cached = await getCachedUserProfile();
    let cachedResult: UserProfile | null = null;
    if (cached && cached.id === userId) {
      cachedResult = cached;
    }

    // Subscribe to realtime database updates for this user
    subscribeToUserProfileChanges(userId);

    // If cache hit and not force refetching, return cached result immediately while checking in background
    if (cachedResult && !forceRefetch) {
      // Background verification: check if DB data has changed
      (async () => {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

          if (!error && data) {
            const fresh = data as UserProfile;
            if (JSON.stringify(fresh) !== JSON.stringify(cachedResult)) {
              console.log("🔄 Background user profile update detected, updating cache.");
              setCachedUserProfile(fresh);
            }
          }
        } catch (err) {
          console.warn("Background profile check error:", err);
        }
      })();

      return { profile: cachedResult, fromCache: true, error: null };
    }

    // 2. Fetch fresh data from Supabase
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (cachedResult) {
        return { profile: cachedResult, fromCache: true, error: null };
      }
      return { profile: null, fromCache: false, error: error.message || "Failed to fetch user profile" };
    }

    const freshProfile = data as UserProfile;
    await setCachedUserProfile(freshProfile);
    return { profile: freshProfile, fromCache: false, error: null };
  } catch (error: any) {
    console.error("Get User Profile Error:", error);
    const cached = await getCachedUserProfile();
    if (cached && cached.id === userId) {
      return { profile: cached, fromCache: true, error: null };
    }
    return {
      profile: null,
      fromCache: false,
      error: error?.message || (typeof error === "string" ? error : "Failed to fetch user profile"),
    };
  }
}

/**
 * 6. Update User Profile Verification Details
 * Updates the public users table with student verification details.
 */
export interface UserVerificationData {
  name?: string;
  email?: string;
  student_id_number: string;
  student_reference_number: string;
  program_of_study: string;
  phone: string;
  location_type: string;
  address: string;
  student_card_image_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_verified?: boolean;
}

/**
 * Check if a student_id_number or student_reference_number already exists in the public users table.
 * Excludes the given userId if provided (so a user updating their own info is not flagged as duplicate).
 */
export async function checkStudentIdAndRefExists(
  studentIdNumber: string,
  studentRefNumber: string,
  excludeUserId?: string
): Promise<{
  idExists: boolean;
  refExists: boolean;
  error?: string;
}> {
  try {
    const cleanId = studentIdNumber.trim();
    const cleanRef = studentRefNumber.trim();

    let idQuery = supabase
      .from("users")
      .select("id")
      .ilike("student_id_number", cleanId);

    if (excludeUserId) {
      idQuery = idQuery.neq("id", excludeUserId);
    }

    const { data: idMatch, error: idError } = await idQuery.maybeSingle();
    if (idError) {
      console.warn("checkStudentIdAndRefExists ID check warning:", idError.message);
    }

    let refQuery = supabase
      .from("users")
      .select("id")
      .ilike("student_reference_number", cleanRef);

    if (excludeUserId) {
      refQuery = refQuery.neq("id", excludeUserId);
    }

    const { data: refMatch, error: refError } = await refQuery.maybeSingle();
    if (refError) {
      console.warn("checkStudentIdAndRefExists Ref check warning:", refError.message);
    }

    return {
      idExists: !!idMatch,
      refExists: !!refMatch,
    };
  } catch (err: any) {
    console.error("checkStudentIdAndRefExists error:", err);
    return {
      idExists: false,
      refExists: false,
      error: err?.message || "Error checking student credentials",
    };
  }
}

/**
 * 6. Update User Profile Verification Details
 * Upserts the public users table with student verification details.
 */
export async function updateUserVerification(
  userId: string,
  verificationData: UserVerificationData,
) {
  try {
    // Check if Student ID number or Reference number already exists for another account
    const { idExists, refExists } = await checkStudentIdAndRefExists(
      verificationData.student_id_number,
      verificationData.student_reference_number,
      userId
    );

    if (idExists || refExists) {
      let duplicateMsg = "Verification information matches an existing account.";
      if (idExists && refExists) {
        duplicateMsg = "Both Student ID number and Reference number are already registered to another user.";
      } else if (idExists) {
        duplicateMsg = "Student ID number is already registered to another user.";
      } else if (refExists) {
        duplicateMsg = "Student Reference number is already registered to another user.";
      }
      return { data: null, error: duplicateMsg };
    }

    const upsertPayload: Record<string, any> = {
      id: userId,
      student_id_number: verificationData.student_id_number,
      student_reference_number: verificationData.student_reference_number,
      program_of_study: verificationData.program_of_study,
      phone: verificationData.phone,
      location_type: verificationData.location_type,
      address: verificationData.address,
      is_verified: true,
      updated_at: new Date().toISOString(),
    };

    if (verificationData.name) {
      upsertPayload.name = verificationData.name;
    }
    if (verificationData.email) {
      upsertPayload.email = verificationData.email;
    }
    if (verificationData.student_card_image_url) {
      upsertPayload.student_card_image_url = verificationData.student_card_image_url;
    }
    if (verificationData.latitude !== undefined) {
      upsertPayload.latitude = verificationData.latitude;
    }
    if (verificationData.longitude !== undefined) {
      upsertPayload.longitude = verificationData.longitude;
    }

    console.log("📄 Upserting user verification payload for ID:", userId);
    console.log(upsertPayload);

    const { data, error } = await supabase
      .from("users")
      .upsert(upsertPayload, { onConflict: "id" })
      .select();

    if (error) {
      console.error("❌ Supabase users upsert error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Supabase upsert returned 0 rows. Verify Row Level Security (RLS) on users table.");
      return {
        data: null,
        error: "Failed to update profile. Please verify Supabase Row Level Security (RLS) policies on table 'users'.",
      };
    }

    console.log("✅ Successfully saved user verification to Supabase users table:", data[0]);
    await setCachedUserProfile(data[0] as UserProfile);
    return { data, error: null };
  } catch (error: any) {
    console.error("❌ Profile Verification Update Error:", error.message || error);
    return { data: null, error: error.message || String(error) };
  }
}

/**
 * 7. Upload Student ID Card Image to Supabase Storage
 * Uploads a local image file to the 'student-ids' bucket.
 */
export async function uploadStudentIdCard(
  userId: string,
  fileUri: string,
  fileName: string,
) {
  try {
    // Read local file as a blob using fetch
    const response = await fetch(fileUri);
    const blob = await response.blob();

    // Define the upload path in the bucket (e.g., schoolID/{userId}/{timestamp}.jpg)
    const fileExt = fileName.split(".").pop() || "jpg";
    const filePath = `schoolID/${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, blob, {
        contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
        upsert: true,
      });

    if (error) throw error;

    // Get the public URL of the uploaded image file
    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (error: any) {
    console.error("ID Card Upload Error:", error.message);
    return { publicUrl: null, error: error.message };
  }
}

/**
 * Fetch public profile details for a given user ID (e.g. creator of an emergency).
 */
export async function fetchUserProfileById(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const { data, error } = await safeSupabaseRequest<UserProfile>(
      () =>
        supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle(),
      { retryId: `fetchUserProfileById_${userId}` }
    );

    if (error || !data) return null;
    return data as UserProfile;
  } catch (err) {
    console.warn("fetchUserProfileById notice:", err);
    return null;
  }
}

/**
 * Checks if a user has an entry in the `users` database table and whether they are verified.
 * Used during login flow to route users missing a `users` table record or unverified to verification.
 */
export async function checkUserAccountStatus(userId: string): Promise<{
  exists: boolean;
  profile: UserProfile | null;
  isVerified: boolean;
}> {
  if (!userId) return { exists: false, profile: null, isVerified: false };
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return { exists: false, profile: null, isVerified: false };
    }

    const profile = data as UserProfile;
    return {
      exists: true,
      profile,
      isVerified: Boolean(profile.is_verified),
    };
  } catch (err) {
    console.warn("checkUserAccountStatus notice:", err);
    return { exists: false, profile: null, isVerified: false };
  }
}
