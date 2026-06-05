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
  if (mentorMatch) {
    return { mentor: mentorMatch };
  }

  const { data: byClassCode, error: classCodeErr } = await admin
    .from("mentors")
    .select("id, mentor_name, name, user_id, created_by")
    .eq("class_code", code)
    .is("created_by", null)
    .limit(1);

  if (classCodeErr) {
    return { mentor: null, lookupError: classCodeErr.message };
  }

  return { mentor: (byClassCode?.[0] as MentorClaimRow | undefined) ?? null };
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
