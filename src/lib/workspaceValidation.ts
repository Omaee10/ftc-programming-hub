import type { Session } from "@/lib/auth";
import { isSoloSession } from "@/lib/auth";
import { fetchWithTimeout } from "@/lib/withTimeout";

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

/**
 * Why a workspace check did not produce an answer.
 *
 * `unauthorized` is the only one that means the stored session is genuinely no
 * longer valid. `unreachable` covers offline, timeout and 5xx — the session may
 * be perfectly fine and we simply could not confirm it.
 */
export type WorkspacesFailureReason = "unreachable" | "unauthorized";

export type WorkspacesResult =
  | { ok: true; data: WorkspacesPayload }
  | { ok: false; reason: WorkspacesFailureReason };

/**
 * Look up the workspaces belonging to the signed-in user.
 *
 * Returns a discriminated result rather than `null` on failure. Collapsing all
 * three failure modes into one value made callers treat "we could not reach the
 * server" identically to "this session is not yours", so loading any page while
 * offline cleared the user's workspace selection and bounced them to /signin —
 * taking up to 30s of unsaved editor work with it, because clearWorkspaceSession
 * fires ftc-session-updated, which resets the progress store and cancels every
 * pending debounced upsert.
 */
export async function fetchWorkspacesResult(): Promise<WorkspacesResult> {
  try {
    const res = await fetchWithTimeout("/api/auth/workspaces", { credentials: "include" },
      WORKSPACES_TIMEOUT_MS,
      "Loading workspaces"
    );

    // Only a 401 proves the session is no longer good. A 500/503 says the
    // server is unhappy, which tells us nothing about the stored workspace.
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (!res.ok) return { ok: false, reason: "unreachable" };

    const data = (await res.json()) as {
      students?: { id: string }[];
      mentors?: { id: string }[];
    };

    return {
      ok: true,
      data: {
        students: data.students ?? [],
        mentors: data.mentors ?? [],
      },
    };
  } catch {
    // Network error or the 15s timeout.
    return { ok: false, reason: "unreachable" };
  }
}
