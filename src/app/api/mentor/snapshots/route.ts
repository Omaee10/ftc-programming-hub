import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  authorizeMentorWorkspace,
  studentBelongsToClass,
} from "@/lib/supabase/mentorWorkspaceAuth";

type SnapshotKind = "progress" | "homework" | "submission";

interface SnapshotBody {
  kind?: SnapshotKind;
  workspaceId?: string;
  parentMentorId?: string;
  studentId?: string;
  challengeId?: number;
  assignmentId?: string;
  submissionId?: string;
  part?: "code" | "blocks" | "all";
}

async function loadProgressBlocks(
  supabase: SupabaseClient,
  studentId: string,
  challengeId: number
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("student_challenge_progress")
    .select("blocks_snapshot")
    .eq("student_id", studentId)
    .eq("challenge_id", challengeId)
    .maybeSingle();
  return (data?.blocks_snapshot as Record<string, unknown> | null) ?? null;
}

/** Lazy-load saved code for mentor views — one snapshot at a time. */
export async function POST(req: Request): Promise<NextResponse> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY for mentor snapshots." },
      { status: 500 }
    );
  }

  let body: SnapshotBody;
  try {
    body = (await req.json()) as SnapshotBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { kind, workspaceId, parentMentorId, studentId, challengeId, assignmentId, submissionId, part } =
    body;

  if (!kind || !workspaceId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const access = await authorizeMentorWorkspace(user.id, workspaceId, parentMentorId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ownerId, admin: supabase } = access;

  if (kind === "progress") {
    if (!studentId || typeof challengeId !== "number") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    if (!(await studentBelongsToClass(supabase, ownerId, studentId))) {
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

    if (!(await studentBelongsToClass(supabase, ownerId, data.student_id as string))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ code: (data.code_snapshot as string | null) ?? null });
  }

  if (kind === "submission") {
    if (!submissionId) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const loadPart = part ?? "all";

    const { data: row, error: rowError } = await supabase
      .from("challenge_submissions")
      .select("code_snapshot, blocks_snapshot, student_id, challenge_id")
      .eq("id", submissionId)
      .maybeSingle();

    if (rowError?.message.includes("blocks_snapshot")) {
      const fallback = await supabase
        .from("challenge_submissions")
        .select("code_snapshot, student_id, challenge_id")
        .eq("id", submissionId)
        .maybeSingle();
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      if (!fallback.data) {
        return NextResponse.json({ code: null, blocks: null });
      }
      if (!(await studentBelongsToClass(supabase, ownerId, fallback.data.student_id as string))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (loadPart === "blocks") {
        const progressBlocks = await loadProgressBlocks(
          supabase,
          fallback.data.student_id as string,
          fallback.data.challenge_id as number
        );
        return NextResponse.json({ blocks: progressBlocks });
      }
      return NextResponse.json({
        code: (fallback.data.code_snapshot as string) ?? "",
        blocks: null,
      });
    }

    if (rowError) {
      return NextResponse.json({ error: rowError.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ code: null, blocks: null });
    }

    if (!(await studentBelongsToClass(supabase, ownerId, row.student_id as string))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (loadPart === "code") {
      return NextResponse.json({
        code: (row.code_snapshot as string) ?? "",
      });
    }

    if (loadPart === "blocks") {
      let blocks = (row.blocks_snapshot as Record<string, unknown> | null) ?? null;
      if (!blocks) {
        blocks = await loadProgressBlocks(
          supabase,
          row.student_id as string,
          row.challenge_id as number
        );
      }
      return NextResponse.json({ blocks });
    }

    let blocks = (row.blocks_snapshot as Record<string, unknown> | null) ?? null;
    if (!blocks) {
      blocks = await loadProgressBlocks(
        supabase,
        row.student_id as string,
        row.challenge_id as number
      );
    }

    return NextResponse.json({
      code: (row.code_snapshot as string) ?? "",
      blocks,
    });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
