import { FriendSearchResult } from "@/constants/interfaces";
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

// ── Get Pending Requests ──────────────────────────────────────────────────────

/**
 * Shape consumed by PendingRequestCard (matches PendingRequest interface).
 */
export interface IncomingFriendRequest {
  id: string;        // requester's public.users id
  name: string;
  role: string;      // mapped from public.users.role
  distance: string;  // mapped from program_of_study (no live distance available)
  avatarUrl: string;
}

/**
 * Fetches all pending incoming friend requests for the current user.
 * Uses direct table queries (no RPC needed) to avoid PostgREST schema cache issues.
 *
 * Step 1: query `friends` where friend_id = me AND status = 'pending'
 * Step 2: query `public.users` for those IDs to get display info
 */
export async function getPendingRequests(): Promise<{
  data: IncomingFriendRequest[];
  error: string | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: "Not authenticated" };
    }

    // Step 1: get the user_ids of people who sent me a pending request
    const { data: friendRows, error: friendsError } = await supabase
      .from("friends")
      .select("user_id")
      .eq("friend_id", user.id)
      .eq("status", "pending");

    if (friendsError) {
      console.error("getPendingRequests friends query error:", friendsError.message);
      return { data: [], error: friendsError.message };
    }

    if (!friendRows || friendRows.length === 0) {
      return { data: [], error: null };
    }

    const requesterIds = friendRows.map((r) => r.user_id as string);

    // Step 2: fetch their public user profiles
    const { data: userRows, error: usersError } = await supabase
      .from("users")
      .select("id, name, profile_img_url, role, program_of_study")
      .in("id", requesterIds);

    if (usersError) {
      console.error("getPendingRequests users query error:", usersError.message);
      return { data: [], error: usersError.message };
    }

    const mapped: IncomingFriendRequest[] = (userRows ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role ?? "Student",
      distance: u.program_of_study ?? "",
      avatarUrl: u.profile_img_url ?? "",
    }));

    return { data: mapped, error: null };
  } catch (err: any) {
    const msg =
      err?.message ??
      (typeof err === "string" ? err : "Failed to load pending requests");
    console.error("getPendingRequests exception:", msg);
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

// ── Get Accepted Friends (Contacts) ───────────────────────────────────────────

export interface FriendContact {
  friendshipId: string;   // friends.id — used for updates/deletes
  userId: string;         // the other person's public.users id
  name: string;
  profile_img_url: string | null;
  role: string | null;
  program_of_study: string | null;
  phone: string | null;
  relationship: string;   // friends.relationship label
  is_in_trusted_network: boolean;
}

/**
 * Fetches all accepted friends for the current user.
 * Returns records from both directions of the friendship.
 *
 * Strategy (no RPC needed):
 *  1a. friendships where user_id = me, status = accepted  → get friend_id list
 *  1b. friendships where friend_id = me, status = accepted → get user_id list
 *  2.  Query public.users for all those IDs at once
 */
export async function getFriends(): Promise<{
  data: FriendContact[];
  error: string | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: "Not authenticated" };
    }

    // 1a: rows where I am the initiator
    const { data: outRows, error: outErr } = await supabase
      .from("friends")
      .select("id, friend_id, relationship, is_in_trusted_network")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (outErr) {
      console.error("getFriends outgoing query error:", outErr.message);
      return { data: [], error: outErr.message };
    }

    // 1b: rows where they were the initiator
    const { data: inRows, error: inErr } = await supabase
      .from("friends")
      .select("id, user_id, relationship, is_in_trusted_network")
      .eq("friend_id", user.id)
      .eq("status", "accepted");

    if (inErr) {
      console.error("getFriends incoming query error:", inErr.message);
      return { data: [], error: inErr.message };
    }

    // Merge: normalise so "otherId" is always the person who isn't me
    type RawRow = {
      friendshipId: string;
      otherId: string;
      relationship: string;
      is_in_trusted_network: boolean;
    };

    const merged: RawRow[] = [
      ...(outRows ?? []).map((r) => ({
        friendshipId: r.id,
        otherId: r.friend_id as string,
        relationship: (r.relationship as string) ?? "Friend",
        is_in_trusted_network: r.is_in_trusted_network as boolean,
      })),
      ...(inRows ?? []).map((r) => ({
        friendshipId: r.id,
        otherId: r.user_id as string,
        relationship: (r.relationship as string) ?? "Friend",
        is_in_trusted_network: r.is_in_trusted_network as boolean,
      })),
    ];

    if (merged.length === 0) {
      return { data: [], error: null };
    }

    const otherIds = [...new Set(merged.map((r) => r.otherId))];

    // 2: fetch profiles
    const { data: userRows, error: usersErr } = await supabase
      .from("users")
      .select("id, name, profile_img_url, role, program_of_study, phone")
      .in("id", otherIds);

    if (usersErr) {
      console.error("getFriends users query error:", usersErr.message);
      return { data: [], error: usersErr.message };
    }

    const userMap = new Map(
      (userRows ?? []).map((u) => [u.id, u]),
    );

    const contacts: FriendContact[] = merged
      .map((row) => {
        const u = userMap.get(row.otherId);
        if (!u) return null;
        return {
          friendshipId: row.friendshipId,
          userId: u.id,
          name: u.name,
          profile_img_url: u.profile_img_url ?? null,
          role: u.role ?? null,
          program_of_study: u.program_of_study ?? null,
          phone: u.phone ?? null,
          relationship: row.relationship,
          is_in_trusted_network: row.is_in_trusted_network,
        } satisfies FriendContact;
      })
      .filter(Boolean) as FriendContact[];

    return { data: contacts, error: null };
  } catch (err: any) {
    const msg =
      err?.message ?? (typeof err === "string" ? err : "Failed to load friends");
    console.error("getFriends exception:", msg);
    return { data: [], error: msg };
  }
}

// ── Update Friend Relationship Label ─────────────────────────────────────────

/**
 * Updates the `relationship` label on a specific friendship row.
 * @param friendshipId  friends.id (primary key)
 * @param relationship  new label, e.g. "Classmate"
 */
export async function updateFriendRelationship(
  friendshipId: string,
  relationship: string,
): Promise<FriendActionResult> {
  try {
    const { error } = await supabase
      .from("friends")
      .update({ relationship, updated_at: new Date().toISOString() })
      .eq("id", friendshipId);

    if (error) {
      console.error("updateFriendRelationship error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to update relationship";
    console.error("updateFriendRelationship exception:", msg);
    return { error: msg };
  }
}

// ── Remove an Accepted Friend ─────────────────────────────────────────────────

/**
 * Deletes a friendship row entirely (both users lose the connection).
 * @param friendshipId  friends.id (primary key)
 */
export async function removeFriend(
  friendshipId: string,
): Promise<FriendActionResult> {
  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      console.error("removeFriend error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to remove friend";
    console.error("removeFriend exception:", msg);
    return { error: msg };
  }
}

// ── Update Trusted Network Status ──────────────────────────────────────────────

/**
 * Updates `is_in_trusted_network` column for a given friendship.
 * @param friendshipId  friends.id (primary key)
 * @param isInTrustedNetwork  boolean
 */
export async function updateTrustedNetworkStatus(
  friendshipId: string,
  isInTrustedNetwork: boolean,
): Promise<FriendActionResult> {
  try {
    const { error } = await supabase
      .from("friends")
      .update({
        is_in_trusted_network: isInTrustedNetwork,
        updated_at: new Date().toISOString(),
      })
      .eq("id", friendshipId);

    if (error) {
      console.error("updateTrustedNetworkStatus error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    const msg = err?.message ?? "Failed to update trusted network status";
    console.error("updateTrustedNetworkStatus exception:", msg);
    return { error: msg };
  }
}

