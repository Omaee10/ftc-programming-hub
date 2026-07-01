import { classChallengeAuthorIds } from "@/lib/classChallenges";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { authorizeMentorWorkspace } from "@/lib/supabase/mentorWorkspaceAuth";

export type ClassChallengeScope = {
  role: "mentor" | "student";
  workspaceId: string;
  parentMentorId?: string;
};

async function coMentorIdsForOwner(
  admin: SupabaseClient,
  ownerId: string
): Promise<string[]> {
  const { data } = await admin.from("mentors").select("id").eq("created_by", ownerId);
  return (data ?? []).map((row) => (row as { id: string }).id);
}

/** Resolve mentor UUIDs whose custom challenges belong to this workspace. */
export async function resolveClassChallengeAuthorIds(
  userId: string,
  scope: ClassChallengeScope
): Promise<string[] | null> {
  if (!hasServiceRoleKey()) return null;

  const admin = createAdminClient();

  if (scope.role === "mentor") {
    const access = await authorizeMentorWorkspace(
      userId,
      scope.workspaceId,
      scope.parentMentorId
    );
    if (!access) return null;

    // Use the trusted session/owner resolved by authorizeMentorWorkspace — the
    // client-supplied parentMentorId is never used to derive the owner here.
    const { session, ownerId } = access;
    const coIds = await coMentorIdsForOwner(admin, ownerId);
    return [...new Set([...classChallengeAuthorIds(session), ...coIds, ownerId])];
  }

  const { data: student, error } = await admin
    .from("students")
    .select("id, mentor_id, user_id")
    .eq("id", scope.workspaceId)
    .maybeSingle();

  if (error || !student || student.user_id !== userId) return null;

  const ownerId = (student.mentor_id as string | null) ?? null;
  if (!ownerId) return null;

  const coIds = await coMentorIdsForOwner(admin, ownerId);
  return [...new Set([ownerId, ...coIds])];
}

export function getAdminClientOrNull(): SupabaseClient | null {
  if (!hasServiceRoleKey()) return null;
  return createAdminClient();
}
