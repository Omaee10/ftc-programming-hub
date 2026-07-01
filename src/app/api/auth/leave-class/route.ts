import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  getSupabaseEnvStatus,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { leaveClass } from "@/lib/supabase/leaveClass";

interface LeaveClassBody {
  kind?: "student" | "mentor";
  id?: string;
}

export async function POST(request: Request) {
  const envStatus = getSupabaseEnvStatus();

  if (!hasServiceRoleKey() || envStatus.keyLikelyTruncated || envStatus.refsMatch === false) {
    return NextResponse.json(
      { error: "Leave class is not configured on the server." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: LeaveClassBody;
  try {
    body = (await request.json()) as LeaveClassBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.kind !== "student" && body.kind !== "mentor") {
    return NextResponse.json({ error: "Invalid membership type." }, { status: 400 });
  }

  const membershipId = body.id?.trim();
  if (!membershipId) {
    return NextResponse.json({ error: "Missing membership id." }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await leaveClass(admin, user.id, body.kind, membershipId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  return NextResponse.json({ ok: true });
}
