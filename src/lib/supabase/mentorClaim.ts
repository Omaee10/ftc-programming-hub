import type { SupabaseClient } from "@supabase/supabase-js";

export interface MentorClaimRow {
  id: string;
  mentor_name: string | null;
  name: string;
  user_id: string | null;
  created_by?: string | null;
}

function classOwnerId(mentor: MentorClaimRow): string {
  return mentor.created_by ?? mentor.id;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** True if this login already owns or co-mentors in the same class as `mentor`. */
export async function userAlreadyHasClassAccess(
  admin: SupabaseClient,
  userId: string,
  mentor: MentorClaimRow
): Promise<boolean> {
  if (mentor.user_id === userId) return true;

  const ownerId = classOwnerId(mentor);

  const { data: ownerRow } = await admin
    .from("mentors")
    .select("id")
    .eq("id", ownerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownerRow) return true;

  const { data: coRow } = await admin
    .from("mentors")
    .select("id")
    .eq("created_by", ownerId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(coRow);
}

/**
 * Find an unclaimed mentor row by personal sign-in code only.
 * Class codes (student join codes) must not claim mentor workspaces.
 */
export async function findUnclaimedMentor(
  admin: SupabaseClient,
  code: string
): Promise<{ mentor: MentorClaimRow | null; lookupError?: string }> {
  const { data: byMentorCode, error: mentorCodeErr } = await admin
    .from("mentors")
    .select("id, mentor_name, name, user_id, created_by")
    .eq("code", code)
    .limit(1);

  if (mentorCodeErr) {
    return { mentor: null, lookupError: mentorCodeErr.message };
  }

  const mentorMatch = (byMentorCode?.[0] as MentorClaimRow | undefined) ?? null;
  return { mentor: mentorMatch };
}

/**
 * Co-mentors sometimes claim the class-owner row by mistake (e.g. wrong code).
 * If this user is on the owner row but is claiming a co-mentor slot with a
 * matching name, clear the mistaken owner link so the co-mentor slot can be claimed.
 */
/** Find an unclaimed co-mentor slot in this class whose label matches the user's profile name. */
export async function findMatchingCoMentorSlot(
  admin: SupabaseClient,
  ownerId: string,
  profileName: string
): Promise<MentorClaimRow | null> {
  const userName = normalizeName(profileName);
  if (!userName) return null;

  const { data: coSlots } = await admin
    .from("mentors")
    .select("id, mentor_name, name, user_id, created_by")
    .eq("created_by", ownerId)
    .is("user_id", null);

  return (
    (coSlots ?? []).find((row) => {
      const slot = row as MentorClaimRow;
      const slotName = normalizeName(slot.mentor_name || slot.name);
      return slotName === userName;
    }) as MentorClaimRow | undefined
  ) ?? null;
}

/**
 * A co-mentor sometimes claims the class-owner row by mistake. Move their link to
 * their personal co-mentor slot so the owner row and co-mentor code both work.
 */
export async function transferMistakenOwnerClaimToCoMentor(
  admin: SupabaseClient,
  ownerId: string,
  userId: string,
  profileName?: string
): Promise<boolean> {
  const { data: ownerRow } = await admin
    .from("mentors")
    .select("id, user_id")
    .eq("id", ownerId)
    .maybeSingle();

  if (!ownerRow?.user_id || ownerRow.user_id !== userId) return false;

  let resolvedName = profileName?.trim();
  if (!resolvedName) {
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    resolvedName = profile?.display_name?.trim() || "";
  }

  if (!resolvedName) return false;

  const coSlot = await findMatchingCoMentorSlot(admin, ownerId, resolvedName);
  if (!coSlot) return false;

  const { error: clearErr } = await admin
    .from("mentors")
    .update({ user_id: null, mentor_name: null })
    .eq("id", ownerId)
    .eq("user_id", userId);

  if (clearErr) return false;

  return (await linkMentorToUser(admin, coSlot.id, userId, resolvedName)).ok;
}

/** On dashboard load, fix owner-row links that belong on a co-mentor slot. */
export async function repairClassMentorLinks(
  admin: SupabaseClient,
  ownerId: string
): Promise<void> {
  const { data: ownerRow } = await admin
    .from("mentors")
    .select("id, user_id, mentor_name")
    .eq("id", ownerId)
    .maybeSingle();

  if (!ownerRow?.user_id) return;

  const userId = ownerRow.user_id as string;
  const transferred = await transferMistakenOwnerClaimToCoMentor(
    admin,
    ownerId,
    userId
  );
  if (transferred) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const linkedName = profile?.display_name?.trim() || "";
  if (!linkedName) return;

  const staleName = (ownerRow.mentor_name as string | null)?.trim() || "";
  if (staleName && normalizeName(staleName) !== normalizeName(linkedName)) {
    await admin
      .from("mentors")
      .update({ mentor_name: linkedName })
      .eq("id", ownerId)
      .eq("user_id", userId);
  }
}

export async function tryRepairMistakenOwnerClaim(
  admin: SupabaseClient,
  userId: string,
  coMentorSlot: MentorClaimRow,
  profileName?: string
): Promise<boolean> {
  const ownerId = coMentorSlot.created_by;
  if (!ownerId) return false;

  const { data: ownerRow } = await admin
    .from("mentors")
    .select("id, user_id")
    .eq("id", ownerId)
    .maybeSingle();

  if (!ownerRow || ownerRow.user_id !== userId) return false;

  const slotName = normalizeName(coMentorSlot.mentor_name || coMentorSlot.name);
  const userName = normalizeName(profileName);
  if (!slotName || !userName || slotName !== userName) return false;

  return transferMistakenOwnerClaimToCoMentor(admin, ownerId, userId, profileName);
}

export async function linkMentorToUser(
  admin: SupabaseClient,
  mentorId: string,
  userId: string,
  displayName?: string
): Promise<{ ok: boolean; error?: string }> {
  const updatePayload: { user_id: string; mentor_name?: string } = { user_id: userId };
  if (displayName?.trim()) {
    updatePayload.mentor_name = displayName.trim();
  }

  const { data: linked, error: linkErr } = await admin
    .from("mentors")
    .update(updatePayload)
    .eq("id", mentorId)
    .is("user_id", null)
    .select("id");

  if (linkErr || !linked?.length) {
    return { ok: false, error: linkErr?.message ?? "Failed to link mentor code." };
  }

  await cleanupStaleCoMentorSlots(admin, mentorId);

  return { ok: true };
}

/** Class owner or co-mentor may clear a mistaken sign-in on a row in their class. */
export async function clearMentorAccountLink(
  admin: SupabaseClient,
  requesterUserId: string,
  mentorRowId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: target, error: targetErr } = await admin
    .from("mentors")
    .select("id, user_id, created_by")
    .eq("id", mentorRowId)
    .maybeSingle();

  if (targetErr || !target) {
    return { ok: false, error: "Mentor row not found." };
  }

  const ownerId = (target.created_by as string | null) ?? (target.id as string);

  const { data: requesterRows } = await admin
    .from("mentors")
    .select("id, created_by, user_id")
    .eq("user_id", requesterUserId);

  const canManage = (requesterRows ?? []).some((row) => {
    const r = row as { id: string; created_by?: string | null };
    return r.id === ownerId || r.created_by === ownerId;
  });

  if (!canManage) {
    return { ok: false, error: "You do not have permission to reset this mentor link." };
  }

  const { data: cleared, error: clearErr } = await admin
    .from("mentors")
    .update({ user_id: null })
    .eq("id", mentorRowId)
    .select("id");

  if (clearErr || !cleared?.length) {
    return { ok: false, error: clearErr?.message ?? "Failed to reset mentor link." };
  }

  return { ok: true };
}

/** Remove older unclaimed co-mentor slots with the same name in one class. */
export async function cleanupStaleCoMentorSlots(
  admin: SupabaseClient,
  claimedMentorId: string
): Promise<void> {
  const { data: claimed } = await admin
    .from("mentors")
    .select("id, name, mentor_name, created_by")
    .eq("id", claimedMentorId)
    .single();

  const row = claimed as MentorClaimRow | null;
  if (!row?.created_by) return;

  const displayName = row.mentor_name?.trim() || row.name?.trim();
  if (!displayName) return;

  await admin
    .from("mentors")
    .delete()
    .eq("created_by", row.created_by)
    .is("user_id", null)
    .neq("id", claimedMentorId)
    .eq("name", displayName);
}

export function databaseKeyErrorMessage(lookupError?: string): string {
  if (!lookupError || lookupError.trim() === "") {
    return "Server database key may be invalid or truncated. Re-copy the full service_role key into SUPABASE_SERVICE_ROLE_KEY and redeploy.";
  }
  return "Could not verify mentor code. Try again.";
}
