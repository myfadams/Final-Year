import { FriendSearchResult, RelationshipStatus } from "@/constants/interfaces";
import { supabase } from "./supabaseConfig";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FriendActionResult {
  error: string | null;
}

// ── Search Users ──────────────────────────────────────────────────────────────

/**
 * Calls the `search_users` Supabase RPC.
 * Returns a relevance-ranked list of users matching the search term,
 * with relationship status resolved server-side.
 * The current authenticated user is never included.
 */
export async function searchUsers(
  searchTerm: string
): Promise<{ data: FriendSearchResult[]; error: string | null }> {
  try {
    const clean = searchTerm.trim();
    if (!clean) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase.rpc("search_users", {
      search_term: clean,
    });

    if (error) {
      console.error("searchUsers RPC error:", error.message);
      return { data: [], error: error.message };
    }

    return {
      data: (data ?? []) as FriendSearchResult[],
      error: null,
    };
  } catch (err: any) {
    const msg =
      err?.message ?? (typeof err === "string" ? err : "Search failed");
    console.error("searchUsers exception:", msg);
    return { data: [], error: msg };
  }
}

// ── Get Suggested Users ───────────────────────────────────────────────────────

/**
 * Calls the `get_suggested_users` Supabase RPC.
 * Returns `count` random users with whom the caller has no relationship.
 */
export async function getSuggestedUsers(
  count = 2
): Promise<{ data: FriendSearchResult[]; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("get_suggested_users", {
      limit_count: count,
    });

    if (error) {
      console.error("getSuggestedUsers RPC error:", error.message);
      return { data: [], error: error.message };
    }

    return {
      data: (data ?? []) as FriendSearchResult[],
      error: null,
    };
  } catch (err: any) {
    const msg =
      err?.message ??
      (typeof err === "string" ? err : "Failed to load suggestions");
    console.error("getSuggestedUsers exception:", msg);
    return { data: [], error: msg };
  }
}

// ── Send Friend Request ───────────────────────────────────────────────────────

/**
 * Inserts a `pending` friendship row: caller → targetUserId.
 * Supabase's unique constraint prevents duplicates.
 */
export async function sendFriendRequest(
  targetUserId: string
): Promise<FriendActionResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const { error } = await supabase.from("friends").insert({
      user_id: user.id,
      friend_id: targetUserId,
      status: "pending",
    });

    if (error) {
      // Unique constraint violation — request already exists
      if (error.code === "23505") {
        return { error: null }; // treat as success (idempotent)
      }
      console.error("sendFriendRequest error:", error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    const msg =
      err?.message ??
      (typeof err === "string" ? err : "Failed to send friend request");
    console.error("sendFriendRequest exception:", msg);
    return { error: msg };
  }
}

// ── Accept Friend Request ─────────────────────────────────────────────────────

/**
 * Accepts an incoming request: updates the row where
 * user_id = requesterId and friend_id = caller to `accepted`.
 */
export async function acceptFriendRequest(
  requesterId: string
): Promise<FriendActionResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("friends")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("user_id", requesterId)
      .eq("friend_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("acceptFriendRequest error:", error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    const msg =
      err?.message ??
      (typeof err === "string" ? err : "Failed to accept friend request");
    console.error("acceptFriendRequest exception:", msg);
    return { error: msg };
  }
}

// ── Decline / Cancel Friend Request ──────────────────────────────────────────

/**
 * Removes a pending friendship row.
 * Works for both declining an incoming request and cancelling an outgoing one.
 */
export async function removeFriendRequest(
  otherUserId: string
): Promise<FriendActionResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Try deleting outgoing (caller → other)
    const { error: outError } = await supabase
      .from("friends")
      .delete()
      .eq("user_id", user.id)
      .eq("friend_id", otherUserId);

    // Try deleting incoming (other → caller)
    const { error: inError } = await supabase
      .from("friends")
      .delete()
      .eq("user_id", otherUserId)
      .eq("friend_id", user.id);

    if (outError && inError) {
      return { error: outError.message };
    }

    return { error: null };
  } catch (err: any) {
    const msg =
      err?.message ??
      (typeof err === "string" ? err : "Failed to remove friend request");
    console.error("removeFriendRequest exception:", msg);
    return { error: msg };
  }
}
