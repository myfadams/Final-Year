import { getVerifyRedirectUrl } from "@/externalFunctions/expoFunctions";
import { supabase } from "./supabaseConfig";

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
    const redirectUrl = getVerifyRedirectUrl("(auth)/waitingVerify");
    const options: any = {
      data: {
        full_name: fullName,
        name: fullName,
      },
    };
    if (typeof redirectUrl === "string" && /^https?:\/\//i.test(redirectUrl)) {
      options.emailRedirectTo = redirectUrl;
    } else {
      console.warn(
        "Skipping emailRedirectTo; invalid redirect URL:",
        redirectUrl,
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    // surface raw error for easier debugging (avoid re-parsing JSON/html)
    console.error("Sign Up Error:", error);
    return { data: null, error: error?.message ?? String(error) };
  }
}

/**
 * 2. Sign In an Existing User
 */
export async function signInUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Sign In Error:", error.message);
    return { data: null, error: error.message };
  }
}

/**
 * 3. Sign Out Current User
 */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error("Sign Out Error:", error.message);
    return { error: error.message };
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
    if (error) throw error;
    return { user, error: null };
  } catch (error: any) {
    console.error("Get Current User Error:", error.message);
    return { user: null, error: error.message };
  }
}

/**
 * 5. Fetch User Profile Details from public.users
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return { profile: data as UserProfile, error: null };
  } catch (error: any) {
    console.error("Get User Profile Error:", error.message);
    return { profile: null, error: error.message };
  }
}

/**
 * 6. Update User Profile Verification Details
 * Updates the public users table with student verification details.
 */
export async function updateUserVerification(
  userId: string,
  verificationData: UserVerificationData,
) {
  try {
    const { data, error } = await supabase
      .from("users")
      .update({
        student_id_number: verificationData.student_id_number,
        student_reference_number: verificationData.student_reference_number,
        program_of_study: verificationData.program_of_study,
        phone: verificationData.phone,
        location_type: verificationData.location_type,
        address: verificationData.address,
        ...(verificationData.student_card_image_url && {
          student_card_image_url: verificationData.student_card_image_url,
        }),
        ...(verificationData.latitude !== undefined && {
          latitude: verificationData.latitude,
        }),
        ...(verificationData.longitude !== undefined && {
          longitude: verificationData.longitude,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Profile Verification Update Error:", error.message);
    return { data: null, error: error.message };
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

    // Define the upload path in the bucket (e.g., student-ids/{userId}/{timestamp}.jpg)
    const fileExt = fileName.split(".").pop() || "jpg";
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("student-ids")
      .upload(filePath, blob, {
        contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
        upsert: true,
      });

    if (error) throw error;

    // Get the public URL of the uploaded image file
    const { data: publicUrlData } = supabase.storage
      .from("student-ids")
      .getPublicUrl(filePath);

    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (error: any) {
    console.error("ID Card Upload Error:", error.message);
    return { publicUrl: null, error: error.message };
  }
}
