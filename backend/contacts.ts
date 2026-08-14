import { supabase } from "./supabaseConfig";
import { safeLogError } from "./safeRequest";

export interface TrustedContactRecord {
  id: string;
  user_id: string | null;
  contact_name: string;
  contact_phone: string;
  relationship: string | null;
  created_at?: string | null;
}

/**
 * Fetch trusted contacts for a given user from `trusted_contacts` table.
 */
export async function getTrustedContacts(userId: string): Promise<{
  data: TrustedContactRecord[] | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from("trusted_contacts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      safeLogError("Error fetching trusted contacts:", error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    safeLogError("Exception fetching trusted contacts:", err);
    return { data: null, error: err };
  }
}

/**
 * Add a new trusted contact into `trusted_contacts` table.
 */
export async function addTrustedContact(
  userId: string,
  contact: {
    name: string;
    phone: string;
    relationship: string;
  }
): Promise<{ data: TrustedContactRecord | null; error: any }> {
  try {
    const payload = {
      user_id: userId,
      contact_name: contact.name.trim(),
      contact_phone: contact.phone.trim(),
      relationship: contact.relationship.trim() || null,
    };

    const { data, error } = await supabase
      .from("trusted_contacts")
      .insert([payload])
      .select()
      .single();

    if (error) {
      safeLogError("Error adding trusted contact:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    safeLogError("Exception adding trusted contact:", err);
    return { data: null, error: err };
  }
}

/**
 * Delete a trusted contact from `trusted_contacts` table by id.
 */
export async function deleteTrustedContact(contactId: string): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from("trusted_contacts")
      .delete()
      .eq("id", contactId);

    if (error) {
      safeLogError("Error deleting trusted contact:", error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    safeLogError("Exception deleting trusted contact:", err);
    return { error: err };
  }
}
