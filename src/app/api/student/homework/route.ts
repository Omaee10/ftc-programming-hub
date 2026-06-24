import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchStudentHomework } from "@/lib/studentHomework";
import { authorizeStudentWorkspace } from "@/lib/supabase/mentorWorkspaceAuth";

type CompleteBody = {
  studentId?: string;
  challengeId?: number;
  code?: string;
};

/** Mark a homework assignment complete (server auth — same path as GET). */
export async function PATCH(request: Request): Promise<NextResponse> {
  let body: CompleteBody;
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const studentId = body.studentId?.trim();
  const challengeId = body.challengeId;
  const code = body.code;

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }
  if (typeof challengeId !== "number" || !Number.isFinite(challengeId)) {
    return NextResponse.json({ error: "challengeId is required." }, { status: 400 });
  }
  if (typeof code !== "string") {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await authorizeStudentWorkspace(user.id, studentId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data, error } = await access.admin
    .from("homework_assignments")
    .update({
      completed: true,
      completed_at: now,
      code_snapshot: code,
    })
    .eq("student_id", studentId)
    .eq("challenge_id", challengeId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Homework assignment not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, completed_at: now });
}

/** Student homework for the active workspace. */
export async function GET(request: Request): Promise<NextResponse> {
  const studentId = new URL(request.url).searchParams.get("studentId")?.trim();
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await authorizeStudentWorkspace(user.id, studentId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assignments, error } = await fetchStudentHomework(access.admin, studentId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ assignments });
}
