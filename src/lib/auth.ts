import { mergeIntoLocalProgress, readLocalProgress } from "@/lib/progressStorage";

const SESSION_KEY = "ftc-hub-session";
const COOKIE_NAME = "ftc-hub-role";
export const WORKSPACE_ID_COOKIE = "ftc-hub-workspace-id";
/** Keep workspace cookies in sync with localStorage across browser restarts. */
const WORKSPACE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function writeWorkspaceCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; SameSite=Lax; Max-Age=${WORKSPACE_COOKIE_MAX_AGE_SEC}`;
}

function clearWorkspaceCookie(name: string): void {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/** Re-apply workspace cookies from localStorage when they were cleared but session remains. */
export function syncWorkspaceCookiesFromStorage(): boolean {
  if (typeof document === "undefined") return false;
  const session = getSession();
  if (!session) return false;

  const hasRole = document.cookie.split(";").some((c) => {
    const [name, value] = c.trim().split("=");
    return name === COOKIE_NAME && value === session.role;
  });
  const hasWorkspace = document.cookie.split(";").some((c) => {
    const [name, value] = c.trim().split("=");
    return name === WORKSPACE_ID_COOKIE && value === session.id;
  });

  if (hasRole && hasWorkspace) return false;

  writeWorkspaceCookie(COOKIE_NAME, session.role);
  writeWorkspaceCookie(WORKSPACE_ID_COOKIE, session.id);
  return true;
}

export interface Session {
  role: "mentor" | "student";
  id: string;
  name: string;
  teamName?: string;
  /** Mentor's class label (e.g. "Period 3 Robotics") — distinct from robotics team name */
  className?: string;
  /** Set for co-mentors — the ID of the mentor who owns the class */
  parentMentorId?: string;
  /** Set for students — the ID of their mentor (used to filter mentor-created challenges) */
  mentorId?: string;
  /** Solo practice — no class enrollment; progress stays on this device only */
  solo?: boolean;
}

const SOLO_BANNER_DISMISSED_KEY = "ftc-solo-banner-dismissed";

export function isSoloSession(session: Session | null | undefined): boolean {
  return session?.role === "student" && session.solo === true;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/**
 * Carry a solo practiser's progress over when they convert to a class session.
 *
 * Progress is keyed by session id. A solo session's id is the auth user id,
 * while a class session's is the `students` row id — so joining (or entering)
 * a class changes the key and would orphan everything completed so far. Solo
 * progress is never synced to Supabase, so there is no server-side copy to fall
 * back on either.
 *
 * Copying it under the new id before the session flips means the bidirectional
 * sync that `ftc-session-updated` kicks off (syncProgressWithLocal, via
 * useSupabaseProgress) sees it as local-only and pushes it to the cloud.
 *
 * The old entry is deliberately left in place: leaving a class returns the
 * student to a solo session under the same auth user id, and their practice
 * history should still be waiting for them.
 */
function migrateSoloProgress(previous: Session | null, next: Session): void {
  if (!previous || !isSoloSession(previous)) return;
  if (next.role !== "student" || next.solo === true) return;
  if (previous.id === next.id) return;

  const soloProgress = readLocalProgress(previous.id);
  if (Object.keys(soloProgress).length === 0) return;

  mergeIntoLocalProgress(next.id, soloProgress);
}

export function setSession(session: Session): void {
  // Read before the write — getSession() still returns the outgoing session.
  migrateSoloProgress(getSession(), session);

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // Cookies let middleware / server components read the active workspace.
  writeWorkspaceCookie(COOKIE_NAME, session.role);
  writeWorkspaceCookie(WORKSPACE_ID_COOKIE, session.id);
  if (typeof window !== "undefined") {
    if (session.solo) {
      localStorage.removeItem(SOLO_BANNER_DISMISSED_KEY);
    }
    window.dispatchEvent(new CustomEvent("ftc-session-updated"));
  }
}

export function isSoloBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOLO_BANNER_DISMISSED_KEY) === "1";
}

export function dismissSoloBanner(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOLO_BANNER_DISMISSED_KEY, "1");
}

export function clearSupabaseAuthCookies(): void {
  if (typeof document === "undefined") return;
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (name?.startsWith("sb-")) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

/** Clear workspace picker state only — keeps Supabase auth cookies intact. */
export function clearWorkspaceSession(): void {
  localStorage.removeItem(SESSION_KEY);
  clearWorkspaceCookie(COOKIE_NAME);
  clearWorkspaceCookie(WORKSPACE_ID_COOKIE);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ftc-session-updated"));
  }
}

/** Full sign-out: workspace state + Supabase auth cookies. */
export function clearSession(): void {
  clearWorkspaceSession();
  clearSupabaseAuthCookies();
}
