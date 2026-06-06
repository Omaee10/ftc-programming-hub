import { NextResponse } from "next/server";
import { classChallengeAuthorIds, classOwner } from "@/lib/classChallenges";
import type { Session } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { repairClassMentorLinks } from "@/lib/supabase/mentorClaim";
import type { MentorDashboardScope } from "@/lib/mentorDashboardApi";

const SCOPES: MentorDashboardScope[] = [
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
        await repairClassMentorLinks(admin, ownerId);
      }

      const { data: rows, error } = await supabase
        .from("mentors")
        .select("id, name, mentor_name, code, created_at, created_by, user_id")
        .or(`id.eq.${ownerId},created_by.eq.${ownerId}`)
        .order("name");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const mentorRows = rows ?? [];
      const linkedIds = mentorRows
        .map((row) => (row as { user_id?: string | null }).user_id)
        .filter((id): id is string => Boolean(id));

      let profileNames = new Map<string, string>();
      if (linkedIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", linkedIds);

        profileNames = new Map(
          (profiles ?? []).map((profile) => [
            profile.id as string,
            (profile.display_name as string)?.trim() || "",
          ])
        );
      }

      return NextResponse.json({
        rows: mentorRows.map((row) => {
          const userId = (row as { user_id?: string | null }).user_id;
          const linkedDisplayName = userId ? profileNames.get(userId) || null : null;
          return { ...row, linkedDisplayName };
        }),
      });
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
