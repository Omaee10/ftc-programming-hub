import { NextResponse } from "next/server";
import { classChallengeAuthorIds } from "@/lib/classChallenges";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { authorizeMentorWorkspace } from "@/lib/supabase/mentorWorkspaceAuth";
import { ensureClassCodeForOwner } from "@/lib/supabase/classCodeBackfill";
import { repairClassMentorLinks, repairItkanOwnerSlotOnce } from "@/lib/supabase/mentorClaim";
import type { MentorDashboardScope } from "@/lib/mentorDashboardApi";
import {
  CHALLENGE_LIST_COLUMNS,
  HOMEWORK_LIST_COLUMNS,
  STUDENT_LIST_COLUMNS,
  SUBMISSION_LIST_COLUMNS,
} from "@/lib/supabase/progressColumns";
import { hasMorePages, parsePagination } from "@/lib/supabase/queryHelpers";

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
    page?: number;
    pageSize?: number;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { scope, workspaceId, parentMentorId, page, pageSize } = body;

  if (!scope || !workspaceId || !SCOPES.includes(scope)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY for mentor dashboard." },
      { status: 500 }
    );
  }

  const access = await authorizeMentorWorkspace(user.id, workspaceId, parentMentorId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { session, ownerId, admin: db } = access;

  await repairClassMentorLinks(db, ownerId);
  await repairItkanOwnerSlotOnce(db, ownerId);
  const backfilledClassCode = await ensureClassCodeForOwner(db, ownerId);

  switch (scope) {
    case "overview": {
      const authorIds = classChallengeAuthorIds(session);

      const { data: classStudents } = await db
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
        db
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("mentor_id", ownerId),
        authorIds.length > 0
          ? db
              .from("challenges")
              .select("id", { count: "exact", head: true })
              .in("created_by", authorIds)
          : Promise.resolve({ count: 0, error: null }),
        studentIds.length > 0
          ? db
              .from("challenge_submissions")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending")
              .in("student_id", studentIds)
          : Promise.resolve({ count: 0, error: null }),
        db
          .from("mentors")
          .select("class_name, name, class_code")
          .eq("id", ownerId)
          .single(),
      ]);

      const className =
        (ownerMentor?.class_name as string | null)?.trim()
        || (ownerMentor?.name as string | null)?.trim()
        || null;

      return NextResponse.json({
        className,
        classCode:
          backfilledClassCode
          ?? (ownerMentor?.class_code as string | null)
          ?? null,
        studentCount: studentCount ?? 0,
        pendingCount: pendingCount ?? 0,
        challengeCount: challengeCount ?? 0,
      });
    }

    case "progress": {
      const authorIds = classChallengeAuthorIds(session);

      const { data: students } = await db
        .from("students")
        .select(STUDENT_LIST_COLUMNS)
        .eq("mentor_id", ownerId)
        .order("name");

      const studentIds = (students ?? []).map((row) => row.id as string);

      // Completions only — the progress tab treats missing rows as incomplete.
      const [{ data: progress }, { data: homework }, { data: challenges }] =
        await Promise.all([
          studentIds.length > 0
            ? db
                .from("student_challenge_progress")
                .select("id, student_id, challenge_id, completed, updated_at")
                .in("student_id", studentIds)
                .eq("completed", true)
            : Promise.resolve({ data: [], error: null }),
          studentIds.length > 0
            ? db
                .from("homework_assignments")
                .select(HOMEWORK_LIST_COLUMNS)
                .in("student_id", studentIds)
            : Promise.resolve({ data: [], error: null }),
          authorIds.length > 0
            ? db
                .from("challenges")
                .select(CHALLENGE_LIST_COLUMNS)
                .in("created_by", authorIds)
                .order("id")
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

      const { data: students } = await db
        .from("students")
        .select(STUDENT_LIST_COLUMNS)
        .eq("mentor_id", ownerId)
        .order("name");

      const studentIds = (students ?? []).map((row) => row.id as string);

      const [{ data: homework }, { data: challenges }] = await Promise.all([
        studentIds.length > 0
          ? db
              .from("homework_assignments")
              .select(HOMEWORK_LIST_COLUMNS)
              .in("student_id", studentIds)
              .order("assigned_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        authorIds.length > 0
          ? db
              .from("challenges")
              .select(CHALLENGE_LIST_COLUMNS)
              .in("created_by", authorIds)
              .order("id")
          : Promise.resolve({ data: [], error: null }),
      ]);

      return NextResponse.json({
        students: students ?? [],
        homework: homework ?? [],
        challenges: challenges ?? [],
      });
    }

    case "mentors": {
      const { data: rows, error } = await db
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
      const { data: rows, error } = await db
        .from("students")
        .select(STUDENT_LIST_COLUMNS)
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

      const { data: rows, error } = await db
        .from("challenges")
        .select(CHALLENGE_LIST_COLUMNS)
        .in("created_by", authorIds)
        .order("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ rows: rows ?? [] });
    }

    case "submissions": {
      const authorIds = classChallengeAuthorIds(session);
      const pagination = parsePagination(page, pageSize);

      const { data: students } = await db
        .from("students")
        .select("id, name")
        .eq("mentor_id", ownerId);

      if (!students || students.length === 0) {
        return NextResponse.json({
          students: [],
          submissions: [],
          challenges: [],
          totalCount: 0,
          pendingCount: 0,
          hasMore: false,
          page: pagination.page,
          pageSize: pagination.pageSize,
        });
      }

      const studentIds = students.map((s) => s.id as string);

      const [
        { count: totalCount, error: countError },
        { count: pendingCount, error: pendingError },
      ] = await Promise.all([
        db
          .from("challenge_submissions")
          .select("id", { count: "exact", head: true })
          .in("student_id", studentIds),
        db
          .from("challenge_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .in("student_id", studentIds),
      ]);

      if (countError || pendingError) {
        return NextResponse.json(
          { error: countError?.message ?? pendingError?.message ?? "Count failed" },
          { status: 500 }
        );
      }

      const { data: submissions, error: submissionsError } = await db
        .from("challenge_submissions")
        .select(SUBMISSION_LIST_COLUMNS)
        .in("student_id", studentIds)
        .order("submitted_at", { ascending: false })
        .range(pagination.from, pagination.to);

      if (submissionsError) {
        return NextResponse.json({ error: submissionsError.message }, { status: 500 });
      }

      const submissionRows = submissions ?? [];
      const customChallengeIds = [
        ...new Set(
          submissionRows
            .map((row) => row.challenge_id as number)
            .filter((id) => id >= 1000)
        ),
      ];

      let challenges: { id: number; title: string }[] = [];
      if (customChallengeIds.length > 0 && authorIds.length > 0) {
        const { data: challengeRows, error: challengesError } = await db
          .from("challenges")
          .select("id, title")
          .in("id", customChallengeIds)
          .in("created_by", authorIds);

        if (challengesError) {
          return NextResponse.json({ error: challengesError.message }, { status: 500 });
        }

        challenges = (challengeRows ?? []) as { id: number; title: string }[];
      }

      const total = totalCount ?? 0;

      return NextResponse.json({
        students,
        submissions: submissionRows,
        challenges,
        totalCount: total,
        pendingCount: pendingCount ?? 0,
        hasMore: hasMorePages(total, pagination),
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
    }

    default:
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
