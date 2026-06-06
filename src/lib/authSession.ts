import { supabase } from "@/lib/supabase";
import { clearSession } from "@/lib/auth";
import { withTimeout } from "@/lib/withTimeout";

const AUTH_TIMEOUT_MS = 10_000;

export async function signOutAll(): Promise<void> {
  clearSession();

  try {
    const res = await withTimeout(
      fetch("/api/auth/signout", { method: "POST", credentials: "include" }),
      8_000,
      "Sign out"
    );
    if (res.ok) return;
  } catch {
    // Fall through to direct client sign-out.
  }

  try {
    await withTimeout(supabase.auth.signOut(), 5_000, "Sign out");
  } catch {
    // Local session and cookies are already cleared.
  }
}

export async function signInViaApi(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  try {
    const res = await withTimeout(
      fetch("/api/auth/signin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      }),
      AUTH_TIMEOUT_MS,
      "Sign in"
    );

    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return { error: data.error ?? "Sign in failed." };
    }
    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch";
    return { error: message };
  }
}

export async function fetchAuthMe(): Promise<{
  userId: string;
  email: string;
  displayName: string | null;
} | null> {
  try {
    const res = await withTimeout(
      fetch("/api/auth/me", { credentials: "include" }),
      AUTH_TIMEOUT_MS,
      "Auth check"
    );
    if (!res.ok) return null;
    return (await res.json()) as {
      userId: string;
      email: string;
      displayName: string | null;
    };
  } catch {
    return null;
  }
}

export async function getAuthUserId(): Promise<string | null> {
  const me = await fetchAuthMe();
  if (me?.userId) return me.userId;

  try {
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS, "Auth check");
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getProfileDisplayName(userId: string): Promise<string | null> {
  const me = await fetchAuthMe();
  if (me?.userId === userId && me.displayName) return me.displayName;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    return data?.display_name?.trim() || null;
  } catch {
    return null;
  }
}
