import { supabase } from "./supabaseConfig";

export interface MedicalRecord {
  id?: string;
  user_id: string;
  blood_group: string | null;
  allergies: string | null;
  medications: string | null;
  chronic_conditions: string | null;
  emergency_notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MedicalDataState {
  bloodGroup: string;
  allergies: string;
  medications: string;
  chronicConditions: string;
  emergencyNotes: string;
}

/**
 * Fetch medical info for a user from `medical_info` table.
 */
export async function getMedicalInfo(userId: string): Promise<{
  data: MedicalRecord | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from("medical_info")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching medical info:", error.message || error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Exception fetching medical info:", err);
    return { data: null, error: err };
  }
}

/**
 * Save (upsert) medical info for a user into `medical_info` table.
 */
export async function saveMedicalInfo(
  userId: string,
  medicalData: MedicalDataState
): Promise<{ data: MedicalRecord | null; error: any }> {
  try {
    const payload = {
      user_id: userId,
      blood_group: medicalData.bloodGroup?.trim() || null,
      allergies: medicalData.allergies?.trim() || null,
      medications: medicalData.medications?.trim() || null,
      chronic_conditions: medicalData.chronicConditions?.trim() || null,
      emergency_notes: medicalData.emergencyNotes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("medical_info")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error saving medical info:", error.message || error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Exception saving medical info:", err);
    return { data: null, error: err };
  }
}
