import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prepares linked rows before auth user deletion.
 *
 * - Mentor / co-mentor codes: keep the row, clear the account link (and personal
 *   name on co-mentor slots) so the code can be claimed again.
 * - Students added by a mentor before signup: keep the row, release the code.
 * - Students who self-joined via class code after signup: leave user_id set so
 *   ON DELETE CASCADE removes the enrollment when the auth user is deleted.
 */
export async function releaseLinkedCodesBeforeDelete(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    return { ok: false, error: profileErr.message };
  }

  // Authoritative account-creation time comes from the auth user; the profile
  // row is only a fallback. If it can't be determined, DON'T release any
  // enrollments — the old default of `new Date()` (now) made every student row
  // look "older than the account" and released them all, orphaning self-joined
  // rows instead of letting ON DELETE CASCADE remove them.
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const accountCreatedRaw =
    authUser?.user?.created_at
    ?? (profile?.created_at as string | null | undefined)
    ?? null;
  const accountCreatedAt = accountCreatedRaw ? new Date(accountCreatedRaw) : null;

  const { data: students, error: studentsErr } = await admin
    .from("students")
    .select("id, created_at")
    .eq("user_id", userId);

  if (studentsErr) {
    return { ok: false, error: studentsErr.message };
  }

  for (const row of students ?? []) {
    const enrolledAt = new Date(row.created_at as string);
    // Row existed before this account → mentor pre-added slot; release the code.
    if (accountCreatedAt && enrolledAt < accountCreatedAt) {
      const { error: releaseErr } = await admin
        .from("students")
        .update({ user_id: null })
        .eq("id", row.id as string);

      if (releaseErr) {
        return { ok: false, error: releaseErr.message };
      }
    }
  }

  const { error: coMentorErr } = await admin
    .from("mentors")
    .update({ user_id: null, mentor_name: null })
    .eq("user_id", userId)
    .not("created_by", "is", null);

  if (coMentorErr) {
    return { ok: false, error: coMentorErr.message };
  }

  const { error: ownerErr } = await admin
    .from("mentors")
    .update({ user_id: null })
    .eq("user_id", userId)
    .is("created_by", null);

  if (ownerErr) {
    return { ok: false, error: ownerErr.message };
  }

  return { ok: true };
}

export async function deleteUserAccount(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const released = await releaseLinkedCodesBeforeDelete(admin, userId);
  if (!released.ok) {
    return released;
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return { ok: false, error: deleteErr.message };
  }

  return { ok: true };
}
