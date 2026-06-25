import type { Session } from "@/lib/auth";
import type { Challenge } from "@/data/challenges";
import { rowToChallengeSummary, rowToChallenge } from "@/lib/homeworkUtils";
import type { ChallengeRow } from "@/lib/supabase";

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

function classChallengeQuery(session: Session): URLSearchParams {
  const params = new URLSearchParams({
    workspaceId: session.id,
    role: session.role,
  });
  if (session.parentMentorId) {
    params.set("parentMentorId", session.parentMentorId);
  }
  return params;
}

/** Fetch mentor-authored challenges for the signed-in user (mentor or student). */
export async function fetchClassChallenges(session: Session): Promise<Challenge[]> {
  try {
    const res = await fetch(`/api/challenges/class?${classChallengeQuery(session).toString()}`, {
      credentials: "include",
    });

    const body = (await res.json()) as { challenges?: ChallengeRow[]; error?: string };
    if (!res.ok) {
      console.error("fetchClassChallenges:", body.error ?? res.status);
      return [];
    }

    return (body.challenges ?? []).map((row) => rowToChallengeSummary(row));
  } catch (err) {
    console.error("fetchClassChallenges:", err);
    return [];
  }
}

/** Load a single custom challenge through the server API (RLS-safe). */
export async function fetchClassChallengeById(
  session: Session,
  challengeId: number
): Promise<Challenge | null> {
  if (!isCustomChallengeId(challengeId)) return null;

  try {
    const params = classChallengeQuery(session);
    const res = await fetch(
      `/api/challenges/class/${encodeURIComponent(String(challengeId))}?${params.toString()}`,
      { credentials: "include" }
    );

    const body = (await res.json()) as { challenge?: ChallengeRow; error?: string };
    if (!res.ok || !body.challenge) {
      console.error("fetchClassChallengeById:", body.error ?? res.status);
      return null;
    }

    return rowToChallenge(body.challenge);
  } catch (err) {
    console.error("fetchClassChallengeById:", err);
    return null;
  }
}

/** created_by value to store when a mentor saves a new challenge. */
export function challengeCreatedBy(session: Session | null): string | null {
  if (!session?.id) return null;
  const owner = classOwner(session);
  return owner || session.id;
}

/** Resolve the mentor that owns a student's class. */
export async function resolveStudentMentorOwnerId(
  session: Session
): Promise<string | null> {
  if (session.mentorId) return session.mentorId;

  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase
    .from("students")
    .select("mentor_id")
    .eq("id", session.id)
    .single();

  return (data as { mentor_id?: string | null } | null)?.mentor_id ?? null;
}
