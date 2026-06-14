import { NextResponse } from "next/server";
import { classOwner } from "@/lib/classChallenges";
import type { Session } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type SnapshotKind = "progress" | "homework" | "submission";

interface SnapshotBody {
  kind?: SnapshotKind;
  workspaceId?: string;
  parentMentorId?: string;
  studentId?: string;
  challengeId?: number;
  assignmentId?: string;
  submissionId?: string;
}

async function authorizeMentor(
  workspaceId: string,
  parentMentorId: string | undefined,
  userId: string
): Promise<{ session: Session; ownerId: string } | null> {
  const supabase = await createClient();
  const { data: mentorRow, error: mentorErr } = await supabase
    .from("mentors")
    .select("id, user_id, created_by")
    .eq("id", workspaceId)
    .single();

  if (mentorErr || !mentorRow?.user_id || mentorRow.user_id !== userId) {
    return null;
  }

  const session: Session = {
    role: "mentor",
    id: workspaceId,
    name: "",
    ...(parentMentorId
      ? { parentMentorId }
      : mentorRow.created_by
        ? { parentMentorId: mentorRow.created_by as string }
        : {}),
  };

  const ownerId = classOwner(session);
  if (!ownerId) return null;

  return { session, ownerId };
}

async function studentInClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  studentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("mentor_id", ownerId)
    .maybeSingle();
  return Boolean(data);
}

/** Lazy-load saved code for mentor views — one snapshot at a time. */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SnapshotBody;
  try {
    body = (await req.json()) as SnapshotBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { kind, workspaceId, parentMentorId, studentId, challengeId, assignmentId, submissionId } =
    body;

  if (!kind || !workspaceId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const auth = await authorizeMentor(workspaceId, parentMentorId, user.id);
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ownerId } = auth;

  if (kind === "progress") {
    if (!studentId || typeof challengeId !== "number") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    if (!(await studentInClass(supabase, ownerId, studentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("student_challenge_progress")
      .select("code_snapshot")
      .eq("student_id", studentId)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ code: (data?.code_snapshot as string | null) ?? null });
  }

  if (kind === "homework") {
    if (!assignmentId) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("homework_assignments")
      .select("code_snapshot, student_id")
      .eq("id", assignmentId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ code: null });
    }

    if (!(await studentInClass(supabase, ownerId, data.student_id as string))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ code: (data.code_snapshot as string | null) ?? null });
  }

  if (kind === "submission") {
    if (!submissionId) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    let data: Record<string, unknown> | null = null;
    let error: { message: string } | null = null;

    ({ data, error } = await supabase
      .from("challenge_submissions")
      .select("code_snapshot, blocks_snapshot, student_id")
      .eq("id", submissionId)
      .maybeSingle());

    if (error?.message.includes("blocks_snapshot")) {
      ({ data, error } = await supabase
        .from("challenge_submissions")
        .select("code_snapshot, student_id")
        .eq("id", submissionId)
        .maybeSingle());
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ code: null, blocks: null });
    }

    if (!(await studentInClass(supabase, ownerId, data.student_id as string))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      code: (data.code_snapshot as string) ?? "",
      blocks: (data.blocks_snapshot as Record<string, unknown> | null) ?? null,
    });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
