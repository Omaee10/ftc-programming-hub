import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaveClassKind = "student" | "mentor";

export interface LeaveClassResult {
  ok: boolean;
  error?: string;
  status?: number;
}

/**
 * Remove the CURRENT user's own membership in a class (self-service unenroll).
 *
 * - student: delete their `students` row. ON DELETE CASCADE removes that class's
 *   progress, homework, and submissions for them.
 * - co-mentor: reassign their authored challenges to the class owner (so the
 *   class keeps them — `challenges.created_by` is ON DELETE SET NULL, which
 *   would otherwise hide them), then delete their `mentors` row.
 *
 * Class OWNERS cannot leave — they must delete the class instead.
 */
export async function leaveClass(
  admin: SupabaseClient,
  userId: string,
  kind: LeaveClassKind,
  membershipId: string
): Promise<LeaveClassResult> {
  if (kind === "student") {
    const { data: row, error: lookupErr } = await admin
      .from("students")
      .select("id, user_id")
      .eq("id", membershipId)
      .maybeSingle();

    if (lookupErr) return { ok: false, error: lookupErr.message, status: 500 };
    if (!row || (row.user_id as string | null) !== userId) {
      return { ok: false, error: "Enrollment not found.", status: 404 };
    }

    const { error: delErr } = await admin
      .from("students")
      .delete()
      .eq("id", membershipId)
      .eq("user_id", userId);

    if (delErr) return { ok: false, error: delErr.message, status: 500 };
    return { ok: true };
  }

  // Co-mentor self-removal.
  const { data: row, error: lookupErr } = await admin
    .from("mentors")
    .select("id, user_id, created_by")
    .eq("id", membershipId)
    .maybeSingle();

  if (lookupErr) return { ok: false, error: lookupErr.message, status: 500 };
  if (!row || (row.user_id as string | null) !== userId) {
    return { ok: false, error: "Membership not found.", status: 404 };
  }

  const ownerId = row.created_by as string | null;
  if (!ownerId) {
    return {
      ok: false,
      error: "Class owners can't leave their own class. Delete the class instead.",
      status: 400,
    };
  }

  // Keep the class's custom challenges by moving authorship to the owner before
  // deleting this co-mentor row.
  const { error: reassignErr } = await admin
    .from("challenges")
    .update({ created_by: ownerId })
    .eq("created_by", membershipId);

  if (reassignErr) return { ok: false, error: reassignErr.message, status: 500 };

  const { error: delErr } = await admin
    .from("mentors")
    .delete()
    .eq("id", membershipId)
    .eq("user_id", userId)
    .not("created_by", "is", null);

  if (delErr) return { ok: false, error: delErr.message, status: 500 };
  return { ok: true };
}
