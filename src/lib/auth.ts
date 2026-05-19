const SESSION_KEY = "ftc-hub-session";
const COOKIE_NAME = "ftc-hub-role";

export interface Session {
  role: "mentor" | "student";
  id: string;
  name: string;
  teamName?: string;
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
  // Set cookie so proxy.ts can read the role for server-side route guards.
  document.cookie = `${COOKIE_NAME}=${session.role}; path=/; SameSite=Lax`;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
