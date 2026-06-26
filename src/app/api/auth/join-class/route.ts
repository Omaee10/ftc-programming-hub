import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  getSupabaseEnvStatus,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { joinClassByCode } from "@/lib/supabase/joinClass";

interface JoinClassBody {
  classCode?: string;
}

export async function POST(request: Request) {
  const envStatus = getSupabaseEnvStatus();

  if (!hasServiceRoleKey() || envStatus.keyLikelyTruncated || envStatus.refsMatch === false) {
    return NextResponse.json(
      {
        error:
          "Join class is not configured on the server. Check SUPABASE_SERVICE_ROLE_KEY on Vercel and redeploy.",
      },
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

  let body: JoinClassBody;
  try {
    body = (await request.json()) as JoinClassBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const classCode = body.classCode?.trim() ?? "";
  if (classCode.length !== 6) {
    return NextResponse.json(
      { error: "Please enter the full 6-digit class code." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const result = await joinClassByCode(admin, user.id, classCode);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    studentId: result.studentId,
    studentCode: result.studentCode,
    displayName: result.displayName,
    teamName: result.teamName,
    mentorId: result.mentorId,
    className: result.className ?? null,
  });
}
