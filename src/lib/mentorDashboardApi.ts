import type { Session } from "@/lib/auth";
import type {
  ChallengeRow,
  HomeworkAssignmentRow,
  MentorRow,
  ProgressRow,
  StudentRow,
  SubmissionRow,
} from "@/lib/supabase";
import { TAB_LOADER_TIMEOUT_MS } from "@/lib/useWorkspaceSession";
import { withTimeout } from "@/lib/withTimeout";

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
  const res = await withTimeout(
    fetch("/api/mentor/dashboard-data", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        workspaceId: session.id,
        parentMentorId: session.parentMentorId,
        ...extra,
      }),
    }),
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

  const res = await withTimeout(
    fetch(`/api/mentor/class-code?${params.toString()}`, { credentials: "include" }),
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
  const res = await withTimeout(
    fetch("/api/mentor/snapshots", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        workspaceId: session.id,
        parentMentorId: session.parentMentorId,
      }),
    }),
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
  const res = await withTimeout(
    fetch("/api/mentor/snapshots", {
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
    }),
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
  const res = await withTimeout(
    fetch("/api/mentor/snapshots", {
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
    }),
    TAB_LOADER_TIMEOUT_MS,
    "Loading submission blocks"
  );

  const data = (await res.json()) as { error?: string; blocks?: Record<string, unknown> | null };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data.blocks ?? null;
}

export async function deleteClassMember(
  session: Session,
  type: "student" | "mentor",
  memberId: string
): Promise<{ error: string | null }> {
  const res = await withTimeout(
    fetch("/api/mentor/delete-member", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        memberId,
        workspaceId: session.id,
        parentMentorId: session.parentMentorId,
      }),
    }),
    TAB_LOADER_TIMEOUT_MS,
    "Deleting member"
  );

  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    return { error: data.error ?? `Delete failed (${res.status})` };
  }

  return { error: null };
}
