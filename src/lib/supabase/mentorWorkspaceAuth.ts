import type { Session } from "@/lib/auth";
import { classOwner } from "@/lib/classChallenges";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export type MentorWorkspaceRow = {
  id: string;
  user_id: string | null;
  created_by: string | null;
};

export type MentorWorkspaceAccess = {
  workspace: MentorWorkspaceRow;
  session: Session;
  ownerId: string;
  admin: ReturnType<typeof createAdminClient>;
};

/**
 * Verify the signed-in user may manage a mentor workspace, then return a
 * service-role client for server-side reads/writes.
 *
 * Uses the admin client so mentor API routes keep working when RLS is enabled
 * on all tables — authorization is enforced here instead of via RLS alone.
 */
export async function authorizeMentorWorkspace(
  userId: string,
  workspaceId: string,
  parentMentorId?: string
): Promise<MentorWorkspaceAccess | null> {
  if (!hasServiceRoleKey()) return null;

  const admin = createAdminClient();
  const { data: workspace, error } = await admin
    .from("mentors")
    .select("id, user_id, created_by")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !workspace?.user_id) return null;

  const row = workspace as MentorWorkspaceRow;
  let allowed = row.user_id === userId;

  if (!allowed && row.created_by) {
    const { data: ownerRow } = await admin
      .from("mentors")
      .select("user_id")
      .eq("id", row.created_by)
      .maybeSingle();
    allowed = ownerRow?.user_id === userId;
  }

  if (!allowed) return null;

  const session: Session = {
    role: "mentor",
    id: workspaceId,
    name: "",
    ...(parentMentorId
      ? { parentMentorId }
      : row.created_by
        ? { parentMentorId: row.created_by }
        : {}),
  };

  const ownerId = classOwner(session);
  if (!ownerId) return null;

  return { workspace: row, session, ownerId, admin };
}

/** Ensure a student row belongs to the mentor's class before server-side reads. */
export async function studentBelongsToClass(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string,
  studentId: string
): Promise<boolean> {
  const { data } = await admin
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("mentor_id", ownerId)
    .maybeSingle();
  return Boolean(data);
}

/** Ensure the signed-in user owns this student workspace. */
export async function authorizeStudentWorkspace(
  userId: string,
  studentId: string
): Promise<{ admin: ReturnType<typeof createAdminClient> } | null> {
  if (!hasServiceRoleKey()) return null;

  const admin = createAdminClient();
  const { data: student, error } = await admin
    .from("students")
    .select("id, user_id")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !student || student.user_id !== userId) return null;

  return { admin };
}
