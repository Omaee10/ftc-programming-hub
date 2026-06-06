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
  studentCount: number;
  pendingCount: number;
  challengeCount: number;
};

export type ProgressPayload = {
  students: StudentRow[];
  progress: ProgressRow[];
  homework: HomeworkAssignmentRow[];
  challenges: ChallengeRow[];
};

export type HomeworkPayload = {
  students: StudentRow[];
  challenges: ChallengeRow[];
  homework: HomeworkAssignmentRow[];
};

export type MentorsPayload = {
  rows: MentorRow[];
};

export type StudentsPayload = {
  rows: StudentRow[];
};

export type ChallengesPayload = {
  rows: ChallengeRow[];
};

export type SubmissionsPayload = {
  students: { id: string; name: string }[];
  submissions: SubmissionRow[];
  challenges: { id: number; title: string }[];
};

async function postMentorDashboard<T>(
  scope: MentorDashboardScope,
  session: Session
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

export function fetchSubmissionsData(session: Session): Promise<SubmissionsPayload> {
  return postMentorDashboard("submissions", session);
}
