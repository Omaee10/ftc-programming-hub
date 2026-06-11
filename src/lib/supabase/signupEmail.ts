import type { SupabaseClient } from "@supabase/supabase-js";

export const DUPLICATE_SIGNUP_EMAIL_MESSAGE =
  "An account with this email already exists. Sign in instead.";

export function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isDuplicateSignupAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists") ||
    lower.includes("duplicate")
  );
}

export function signupAuthErrorMessage(message: string): string {
  return isDuplicateSignupAuthError(message)
    ? DUPLICATE_SIGNUP_EMAIL_MESSAGE
    : message;
}

export function isDuplicateProfileError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("duplicate") || lower.includes("unique");
}

export async function findRegisteredSignupEmail(
  admin: SupabaseClient,
  email: string
): Promise<{ exists: boolean; lookupError?: string }> {
  const normalized = normalizeSignupEmail(email);
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .limit(1);

  if (error) {
    return { exists: false, lookupError: error.message };
  }

  return { exists: (data?.length ?? 0) > 0 };
}
