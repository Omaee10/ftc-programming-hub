import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function hasServiceRoleKey(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return key.length > 0 && key !== "your-service-role-key-here";
}

export function getSupabaseProjectRef(url: string): string | null {
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

export function getJwtProjectRef(key: string): string | null {
  try {
    const payload = key.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      ref?: string;
    };
    return decoded.ref ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseEnvStatus(): {
  url: string;
  urlProjectRef: string | null;
  jwtProjectRef: string | null;
  keyLooksJwt: boolean;
  refsMatch: boolean | null;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const urlProjectRef = getSupabaseProjectRef(url);
  const keyLooksJwt = key.startsWith("eyJ");
  const jwtProjectRef = keyLooksJwt ? getJwtProjectRef(key) : null;
  const refsMatch =
    urlProjectRef && jwtProjectRef ? urlProjectRef === jwtProjectRef : null;

  return { url, urlProjectRef, jwtProjectRef, keyLooksJwt, refsMatch };
}

/** Service-role client — server-side API routes only. Never import in client components. */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
