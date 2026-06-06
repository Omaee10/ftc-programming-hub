import { NextResponse } from "next/server";
import { classChallengeAuthorIds, classOwner } from "@/lib/classChallenges";
import type { Session } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { repairItkanOwnerSlotOnce } from "@/lib/supabase/mentorClaim";
import type { MentorDashboardScope } from "@/lib/mentorDashboardApi";

const SCOPES: MentorDashboardScope[] = [
  "overview",
  "progress",
  "homework",
  "mentors",
  "students",
  "challenges",
  "submissions",
];

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    scope?: MentorDashboardScope;
    workspaceId?: string;
    parentMentorId?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { scope, workspaceId, parentMentorId } = body;

  if (!scope || !workspaceId || !SCOPES.includes(scope)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { data: mentorRow, error: mentorErr } = await supabase
    .from("mentors")
    .select("id, user_id, created_by")
    .eq("id", workspaceId)
    .single();

  if (mentorErr || !mentorRow?.user_id || mentorRow.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  if (!ownerId) {
    return NextResponse.json({ error: "No class owner" }, { status: 400 });
  }

  switch (scope) {
    case "overview": {
      const authorIds = classChallengeAuthorIds(session);

      const { data: classStudents } = await supabase
        .from("students")
        .select("id")
        .eq("mentor_id", ownerId);

      const studentIds = (classStudents ?? []).map((row) => row.id as string);

      const [
        { count: studentCount },
        { count: challengeCount },
        { count: pendingCount },
        { data: ownerMentor },
      ] = await Promise.all([
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("mentor_id", ownerId),
        authorIds.length > 0
          ? supabase
              .from("challenges")
              .select("id", { count: "exact", head: true })
              .in("created_by", authorIds)
          : Promise.resolve({ count: 0, error: null }),
        studentIds.length > 0
          ? supabase
              .from("challenge_submissions")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending")
              .in("student_id", studentIds)
          : Promise.resolve({ count: 0, error: null }),
        supabase
          .from("mentors")
          .select("class_name, name")
          .eq("id", ownerId)
          .single(),
      ]);

      const className =
        (ownerMentor?.class_name as string | null)?.trim()
        || (ownerMentor?.name as string | null)?.trim()
        || null;

      return NextResponse.json({
        className,
        studentCount: studentCount ?? 0,
        pendingCount: pendingCount ?? 0,
        challengeCount: challengeCount ?? 0,
      });
    }

    case "progress": {
      const authorIds = classChallengeAuthorIds(session);
      const [{ data: students }, { data: progress }, { data: homework }, { data: challenges }] =
        await Promise.all([
          supabase.from("students").select("*").eq("mentor_id", ownerId).order("name"),
          supabase.from("student_challenge_progress").select("*"),
          supabase.from("homework_assignments").select("*"),
          authorIds.length > 0
            ? supabase.from("challenges").select("*").in("created_by", authorIds).order("id")
            : Promise.resolve({ data: [], error: null }),
        ]);

      return NextResponse.json({
        students: students ?? [],
        progress: progress ?? [],
        homework: homework ?? [],
        challenges: challenges ?? [],
      });
    }

    case "homework": {
      const authorIds = classChallengeAuthorIds(session);
      const [{ data: students }, { data: homework }, { data: challenges }] =
        await Promise.all([
          supabase.from("students").select("*").eq("mentor_id", ownerId).order("name"),
          supabase
            .from("homework_assignments")
            .select("*")
            .order("assigned_at", { ascending: false }),
          authorIds.length > 0
            ? supabase.from("challenges").select("*").in("created_by", authorIds).order("id")
            : Promise.resolve({ data: [], error: null }),
        ]);

      return NextResponse.json({
        students: students ?? [],
        homework: homework ?? [],
        challenges: challenges ?? [],
      });
    }

    case "mentors": {
      if (hasServiceRoleKey()) {
        const admin = createAdminClient();
        await repairItkanOwnerSlotOnce(admin, ownerId);
      }

      const { data: rows, error } = await supabase
        .from("mentors")
        .select("id, name, mentor_name, code, created_at, created_by, user_id")
        .or(`id.eq.${ownerId},created_by.eq.${ownerId}`)
        .order("name");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ rows: rows ?? [] });
    }

    case "students": {
      const { data: rows, error } = await supabase
        .from("students")
        .select("*")
        .eq("mentor_id", ownerId)
        .order("name");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ rows: rows ?? [] });
    }

    case "challenges": {
      const authorIds = classChallengeAuthorIds(session);
      if (authorIds.length === 0) {
        return NextResponse.json({ rows: [] });
      }

      const { data: rows, error } = await supabase
        .from("challenges")
        .select("*")
        .in("created_by", authorIds)
        .order("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ rows: rows ?? [] });
    }

    case "submissions": {
      const { data: students } = await supabase
        .from("students")
        .select("id, name")
        .eq("mentor_id", ownerId);

      if (!students || students.length === 0) {
        return NextResponse.json({
          students: [],
          submissions: [],
          challenges: [],
        });
      }

      const studentIds = students.map((s) => s.id as string);
      const [{ data: submissions }, { data: challenges }] = await Promise.all([
        supabase
          .from("challenge_submissions")
          .select("*")
          .in("student_id", studentIds)
          .order("submitted_at", { ascending: false }),
        supabase.from("challenges").select("id, title"),
      ]);

      return NextResponse.json({
        students,
        submissions: submissions ?? [],
        challenges: challenges ?? [],
      });
    }

    default:
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
