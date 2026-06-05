import { supabase } from "@/lib/supabase";
import { clearSession } from "@/lib/auth";

export async function signOutAll(): Promise<void> {
  await supabase.auth.signOut();
  clearSession();
}

export async function getAuthUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
