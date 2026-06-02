import type { Session } from "@/lib/auth";
import { supabase, type ChallengeRow } from "@/lib/supabase";

/** Class owner mentor id (parent for co-mentors, self for owners). */
export function classOwner(
  session: { id: string; parentMentorId?: string } | null
): string {
  return session?.parentMentorId ?? session?.id ?? "";
}

/** Mentor-created challenges use ids >= 1000 (see supabase-setup.sql). */
export function isCustomChallengeId(id: number): boolean {
  return id >= 1000;
}

/** Who may have created challenges visible to this class. */
export function classChallengeAuthorIds(session: Session): string[] {
  const ownerId = classOwner(session);
  if (!ownerId) return [];

  if (session.role === "mentor") {
    const ids = new Set([ownerId]);
    if (session.id !== ownerId) ids.add(session.id);
    return [...ids];
  }

  return [ownerId];
}

async function coMentorIdsForOwner(ownerId: string): Promise<string[]> {
  const { data } = await supabase
    .from("mentors")
    .select("id")
    .eq("created_by", ownerId);
  return (data ?? []).map((row) => (row as { id: string }).id);
}

/** Resolve the mentor that owns a student's class. */
export async function resolveStudentMentorOwnerId(
  session: Session
): Promise<string | null> {
  if (session.mentorId) return session.mentorId;

  const { data } = await supabase
    .from("students")
    .select("mentor_id")
    .eq("id", session.id)
    .single();

  return (data as { mentor_id?: string | null } | null)?.mentor_id ?? null;
}

/** Fetch mentor-authored challenges for the signed-in user (mentor or student). */
export async function fetchClassChallenges(
  session: Session
): Promise<ChallengeRow[]> {
  let authorIds: string[];

  if (session.role === "mentor") {
    authorIds = classChallengeAuthorIds(session);
  } else {
    const ownerId = await resolveStudentMentorOwnerId(session);
    if (!ownerId) return [];
    const coIds = await coMentorIdsForOwner(ownerId);
    authorIds = [...new Set([ownerId, ...coIds])];
  }

  if (authorIds.length === 0) return [];

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .in("created_by", authorIds)
    .order("id", { ascending: true });

  if (error) {
    console.error("fetchClassChallenges:", error.message);
    return [];
  }

  return (data ?? []) as ChallengeRow[];
}

/** created_by value to store when a mentor saves a new challenge. */
export function challengeCreatedBy(session: Session | null): string | null {
  if (!session?.id) return null;
  const owner = classOwner(session);
  return owner || session.id;
}
