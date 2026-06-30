import type { Session } from "@/lib/auth";
import { isSoloSession } from "@/lib/auth";
import { withTimeout } from "@/lib/withTimeout";

export interface WorkspacesPayload {
  students: { id: string }[];
  mentors: { id: string }[];
}

const WORKSPACES_TIMEOUT_MS = 15_000;

/** True when the stored workspace id still belongs to the signed-in user. */
export function sessionMatchesWorkspaces(
  session: Session,
  workspaces: WorkspacesPayload
): boolean {
  if (isSoloSession(session)) return true;

  if (session.role === "student") {
    return workspaces.students.some((row) => row.id === session.id);
  }

  return workspaces.mentors.some((row) => row.id === session.id);
}

export async function fetchWorkspacesPayload(): Promise<WorkspacesPayload | null> {
  try {
    const res = await withTimeout(
      fetch("/api/auth/workspaces", { credentials: "include" }),
      WORKSPACES_TIMEOUT_MS,
      "Loading workspaces"
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      students?: { id: string }[];
      mentors?: { id: string }[];
    };

    return {
      students: data.students ?? [],
      mentors: data.mentors ?? [],
    };
  } catch {
    return null;
  }
}
