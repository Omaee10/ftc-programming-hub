import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  getSupabaseEnvStatus,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { clearMentorAccountLink } from "@/lib/supabase/mentorClaim";

interface ResetMentorLinkBody {
  mentorRowId?: string;
}

export async function POST(request: Request) {
  const envStatus = getSupabaseEnvStatus();

  if (!hasServiceRoleKey() || envStatus.keyLikelyTruncated || envStatus.refsMatch === false) {
    return NextResponse.json(
      { error: "Reset mentor link is not configured on the server." },
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

  let body: ResetMentorLinkBody;
  try {
    body = (await request.json()) as ResetMentorLinkBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const mentorRowId = body.mentorRowId?.trim() ?? "";
  if (!mentorRowId) {
    return NextResponse.json({ error: "mentorRowId is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await clearMentorAccountLink(admin, user.id, mentorRowId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to reset link." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
