import type { Session } from "@/lib/auth";
// `import type` only — a value import would pull every reference solution back
// into the client bundle, which is the leak /api/mentor/answer-key exists to close.
import type { ChallengeSolution } from "@/data/challengeSolutions";
import type {
  ChallengeRow,
  HomeworkAssignmentRow,
  MentorRow,
  ProgressRow,
  StudentRow,
  SubmissionRow,
} from "@/lib/supabase";
import { TAB_LOADER_TIMEOUT_MS } from "@/lib/useWorkspaceSession";
import { fetchWithTimeout } from "@/lib/withTimeout";

export type MentorSnapshotRequest =
  | { kind: "progress"; studentId: string; challengeId: number }
  | { kind: "homework"; assignmentId: string }
  | { kind: "submission"; submissionId: string; part?: "code" | "blocks" | "all" };

/** Progress row without large snapshot columns (mentor list views). */
export type ProgressSummaryRow = Pick<
  ProgressRow,
  "id" | "student_id" | "challenge_id" | "completed" | "updated_at"
>;

/** Submission row without code/blocks bodies (mentor list views). */
export type SubmissionSummaryRow = Omit<
  SubmissionRow,
  "code_snapshot" | "blocks_snapshot"
>;

/** Homework row without saved code (list views). */
export type HomeworkSummaryRow = Omit<HomeworkAssignmentRow, "code_snapshot">;

/** Challenge row without large text fields (mentor list views). */
export type ChallengeSummaryRow = Pick<
  ChallengeRow,
  "id" | "title" | "difficulty" | "xp" | "created_by" | "created_at"
>;

export type MentorDashboardScope =
  | "overview"
  | "progress"
  | "homework"
  | "mentors"
  | "students"
  | "challenges"
  | "submissions";

export type OverviewPayload = {
  className: string | null;
  classCode: string | null;
  studentCount: number;
  pendingCount: number;
  challengeCount: number;
};

export type ProgressPayload = {
  students: StudentRow[];
  progress: ProgressSummaryRow[];
  homework: HomeworkSummaryRow[];
  challenges: ChallengeSummaryRow[];
};

export type HomeworkPayload = {
  students: StudentRow[];
  challenges: ChallengeSummaryRow[];
  homework: HomeworkSummaryRow[];
};

export type MentorsPayload = {
  rows: MentorRow[];
};

export type StudentsPayload = {
  rows: StudentRow[];
};

export type ChallengesPayload = {
  rows: ChallengeSummaryRow[];
};

export type SubmissionsPayload = {
  students: { id: string; name: string }[];
  submissions: SubmissionSummaryRow[];
  challenges: { id: number; title: string }[];
  totalCount: number;
  pendingCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
};

async function postMentorDashboard<T>(
  scope: MentorDashboardScope,
  session: Session,
  extra?: Record<string, unknown>
): Promise<T> {
  const res = await fetchWithTimeout("/api/mentor/dashboard-data", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      workspaceId: session.id,
      parentMentorId: session.parentMentorId,
      ...extra,
    }),
  },
    TAB_LOADER_TIMEOUT_MS,
    "Loading class data"
  );

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export function fetchOverviewData(session: Session): Promise<OverviewPayload> {
  return postMentorDashboard("overview", session);
}

export async function fetchClassCode(
  session: Session
): Promise<{ classCode: string | null; className: string | null; teamName: string | null }> {
  const params = new URLSearchParams({ workspaceId: session.id });
  if (session.parentMentorId) {
    params.set("parentMentorId", session.parentMentorId);
  }

  const res = await fetchWithTimeout(`/api/mentor/class-code?${params.toString()}`, { credentials: "include" },
    TAB_LOADER_TIMEOUT_MS,
    "Loading class code"
  );

  const data = (await res.json()) as {
    classCode?: string | null;
    className?: string | null;
    teamName?: string | null;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }

  return {
    classCode: data.classCode ?? null,
    className: data.className ?? null,
    teamName: data.teamName ?? null,
  };
}

export function fetchProgressData(session: Session): Promise<ProgressPayload> {
  return postMentorDashboard("progress", session);
}

export function fetchHomeworkData(session: Session): Promise<HomeworkPayload> {
  return postMentorDashboard("homework", session);
}

export function fetchMentorsData(session: Session): Promise<MentorsPayload> {
  return postMentorDashboard("mentors", session);
}

export function fetchStudentsData(session: Session): Promise<StudentsPayload> {
  return postMentorDashboard("students", session);
}

export function fetchChallengesData(session: Session): Promise<ChallengesPayload> {
  return postMentorDashboard("challenges", session);
}

export function fetchSubmissionsData(
  session: Session,
  options?: { page?: number; pageSize?: number }
): Promise<SubmissionsPayload> {
  return postMentorDashboard("submissions", session, options);
}

export async function fetchMentorSnapshotCode(
  session: Session,
  request: MentorSnapshotRequest
): Promise<string | null> {
  const detail = await fetchMentorSubmissionDetail(session, request);
  return detail.code;
}

export type MentorSubmissionDetail = {
  code: string | null;
  blocks: Record<string, unknown> | null;
};

export async function fetchMentorSubmissionDetail(
  session: Session,
  request: MentorSnapshotRequest
): Promise<MentorSubmissionDetail> {
  const res = await fetchWithTimeout("/api/mentor/snapshots", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...request,
      workspaceId: session.id,
      parentMentorId: session.parentMentorId,
    }),
  },
    TAB_LOADER_TIMEOUT_MS,
    "Loading saved code"
  );

  const data = (await res.json()) as {
    error?: string;
    code?: string | null;
    blocks?: Record<string, unknown> | null;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return {
    code: data.code ?? null,
    blocks: data.blocks ?? null,
  };
}

export async function fetchSubmissionCodeOnly(
  session: Session,
  submissionId: string
): Promise<string | null> {
  const res = await fetchWithTimeout("/api/mentor/snapshots", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "submission",
      submissionId,
      part: "code",
      workspaceId: session.id,
      parentMentorId: session.parentMentorId,
    }),
  },
    TAB_LOADER_TIMEOUT_MS,
    "Loading submission code"
  );

  const data = (await res.json()) as { error?: string; code?: string | null };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data.code ?? null;
}

export async function fetchSubmissionBlocksOnly(
  session: Session,
  submissionId: string
): Promise<Record<string, unknown> | null> {
  const res = await fetchWithTimeout("/api/mentor/snapshots", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "submission",
      submissionId,
      part: "blocks",
      workspaceId: session.id,
      parentMentorId: session.parentMentorId,
    }),
  },
    TAB_LOADER_TIMEOUT_MS,
    "Loading submission blocks"
  );

  const data = (await res.json()) as { error?: string; blocks?: Record<string, unknown> | null };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data.blocks ?? null;
}

// ─── Answer key (mentor-only reference solutions) ──────────────────────────

/** One catalog entry — metadata only, never solution content. */
export type AnswerKeyIndexEntry = { id: number; hasBlocks: boolean };

/**
 * Callers need to tell "you may not see this" (403 — bounce to /challenges)
 * apart from "it broke" (show an error), so the status comes back rather than
 * collapsing everything into a thrown Error.
 */
export type AnswerKeyResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

function answerKeyParams(session: Session): URLSearchParams {
  const params = new URLSearchParams({ workspaceId: session.id });
  if (session.parentMentorId) {
    params.set("parentMentorId", session.parentMentorId);
  }
  return params;
}

async function getAnswerKey<T>(
  params: URLSearchParams,
  label: string,
  pick: (body: Record<string, unknown>) => T | undefined
): Promise<AnswerKeyResult<T>> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`/api/mentor/answer-key?${params.toString()}`, { credentials: "include" },
      TAB_LOADER_TIMEOUT_MS,
      label
    );
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "Failed to load answer key.",
    };
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: (body.error as string) ?? `Request failed (${res.status})`,
    };
  }

  const data = pick(body);
  if (data === undefined) {
    return { ok: false, status: res.status, error: "Unexpected server response." };
  }
  return { ok: true, data };
}

/** Which challenges have a reference solution (no solution content). */
export function fetchAnswerKeyIndex(
  session: Session
): Promise<AnswerKeyResult<AnswerKeyIndexEntry[]>> {
  return getAnswerKey(
    answerKeyParams(session),
    "Loading answer key",
    (body) => body.solutions as AnswerKeyIndexEntry[] | undefined
  );
}

/** The full reference solution for one challenge. */
export function fetchAnswerKeySolution(
  session: Session,
  challengeId: number
): Promise<AnswerKeyResult<ChallengeSolution>> {
  const params = answerKeyParams(session);
  params.set("challengeId", String(challengeId));
  return getAnswerKey(
    params,
    "Loading reference solution",
    (body) => body.solution as ChallengeSolution | undefined
  );
}

export async function deleteClassMember(
  session: Session,
  type: "student" | "mentor",
  memberId: string
): Promise<{ error: string | null }> {
  const res = await fetchWithTimeout("/api/mentor/delete-member", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      memberId,
      workspaceId: session.id,
      parentMentorId: session.parentMentorId,
    }),
  },
    TAB_LOADER_TIMEOUT_MS,
    "Deleting member"
  );

  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    return { error: data.error ?? `Delete failed (${res.status})` };
  }

  return { error: null };
}
