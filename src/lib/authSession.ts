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

export async function getAuthUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS, "Auth check");
  return user?.id ?? null;
}

export async function getProfileDisplayName(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  return data?.display_name?.trim() || null;
}
