import { NextResponse } from "next/server";
import {
  createAdminClient,
  getSupabaseEnvStatus,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";

export async function GET() {
  const envStatus = getSupabaseEnvStatus();

  if (!envStatus.urlProjectRef) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "NEXT_PUBLIC_SUPABASE_URL is missing or invalid on the server.",
      ...envStatus,
    });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is missing on the server.",
      ...envStatus,
    });
  }

  if (envStatus.refsMatch === false) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message:
        "SUPABASE_SERVICE_ROLE_KEY does not match NEXT_PUBLIC_SUPABASE_URL. Use the service_role secret from the same Supabase project.",
      ...envStatus,
    });
  }

  const admin = createAdminClient();
  const { count, error: countErr } = await admin
    .from("mentors")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    ok: !countErr,
    configured: true,
    databaseReachable: !countErr,
    mentorRows: count ?? 0,
    message: countErr?.message ?? "Auth signup is configured.",
    ...envStatus,
  });
}
