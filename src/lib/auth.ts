const SESSION_KEY = "ftc-hub-session";
const COOKIE_NAME = "ftc-hub-role";
export const WORKSPACE_ID_COOKIE = "ftc-hub-workspace-id";

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

export function setSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // Cookies let middleware / server components read the active workspace.
  document.cookie = `${COOKIE_NAME}=${session.role}; path=/; SameSite=Lax`;
  document.cookie = `${WORKSPACE_ID_COOKIE}=${session.id}; path=/; SameSite=Lax`;
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
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${WORKSPACE_ID_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/** Full sign-out: workspace state + Supabase auth cookies. */
export function clearSession(): void {
  clearWorkspaceSession();
  clearSupabaseAuthCookies();
}
