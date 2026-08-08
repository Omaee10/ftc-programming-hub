import { NextResponse } from "next/server";
import { challengeAuthorIdsForClass } from "@/lib/supabase/classChallengeAccess";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { authorizeMentorWorkspace } from "@/lib/supabase/mentorWorkspaceAuth";
import { ensureClassCodeForOwner } from "@/lib/supabase/classCodeBackfill";
import { repairClassMentorLinks } from "@/lib/supabase/mentorClaim";
import type { MentorDashboardScope } from "@/lib/mentorDashboardApi";
import {
  CHALLENGE_LIST_COLUMNS,
  HOMEWORK_LIST_COLUMNS,
  STUDENT_LIST_COLUMNS,
  SUBMISSION_LIST_COLUMNS,
} from "@/lib/supabase/progressColumns";
import { fetchAllRows, hasMorePages, parsePagination } from "@/lib/supabase/queryHelpers";

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

  // Author ids are resolved per scope from `ownerId` via challengeAuthorIdsForClass,
  // which reads the class's co-mentors. The session-derived list it replaced
  // resolved to owner-plus-self, so a class owner never saw a co-mentor's
  // challenges in any tab — harmless while every row was owner-authored, and a
  // hole the moment authorship became real.
  const { ownerId, admin: db } = access;

  switch (scope) {
    case "overview": {
      // Idempotent link repair + class-code backfill. Scoped to "overview"
      // because it is the only scope that consumes backfilledClassCode, and
      // the overview runs on every dashboard mount — so repair coverage is
      // unchanged while the other six scopes (and every "Load More" page)
      // no longer pay ~5 serialized round trips for it.
      await repairClassMentorLinks(db, ownerId);
      const backfilledClassCode = await ensureClassCodeForOwner(db, ownerId);

      const authorIds = await challengeAuthorIdsForClass(db, ownerId);

      // Paged: `studentIds` is the filter for the pending-submission count
      // below, so a truncated read here would undercount pending reviews on the
      // dashboard tile rather than showing up as a short list anywhere.
      const { data: classStudents } = await fetchAllRows((from, to) =>
        db
          .from("students")
          .select("id")
          .eq("mentor_id", ownerId)
          .order("id")
          .range(from, to)
      );

      const studentIds = classStudents.map((row) => row.id as string);

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
      const authorIds = await challengeAuthorIdsForClass(db, ownerId);

      // Paged like the reads below it: a class past PostgREST's 1000-row cap
      // would silently lose students here, and every per-student read below
      // filters on `studentIds` — so the truncation would cascade into missing
      // progress and homework rather than showing up as a short student list.
      // `id` is the paging tiebreaker; the display sort on `name` is unchanged.
      const { data: students } = await fetchAllRows((from, to) =>
        db
          .from("students")
          .select(STUDENT_LIST_COLUMNS)
          .eq("mentor_id", ownerId)
          .order("name")
          .order("id")
          .range(from, to)
      );

      const studentIds = students.map((row) => row.id as string);

      // Completions only — the progress tab treats missing rows as incomplete,
      // so a silently truncated read here would show finished work as unfinished.
      // Both per-student reads scale as students x challenges and can exceed
      // PostgREST's row cap, hence fetchAllRows rather than a bare select.
      const [{ data: progress }, { data: homework }, { data: challenges }] =
        await Promise.all([
          studentIds.length > 0
            ? fetchAllRows((from, to) =>
                db
                  .from("student_challenge_progress")
                  .select("id, student_id, challenge_id, completed, updated_at")
                  .in("student_id", studentIds)
                  .eq("completed", true)
                  .order("id")
                  .range(from, to)
              )
            : Promise.resolve({ data: [], error: null }),
          studentIds.length > 0
            ? fetchAllRows((from, to) =>
                db
                  .from("homework_assignments")
                  .select(HOMEWORK_LIST_COLUMNS)
                  .in("student_id", studentIds)
                  .order("id")
                  .range(from, to)
              )
            : Promise.resolve({ data: [], error: null }),
          authorIds.length > 0
            ? fetchAllRows((from, to) =>
                db
                  .from("challenges")
                  .select(CHALLENGE_LIST_COLUMNS)
                  .in("created_by", authorIds)
                  .order("id")
                  .range(from, to)
              )
            : Promise.resolve({ data: [], error: null }),
        ]);

      return NextResponse.json({
        students,
        progress: progress ?? [],
        homework: homework ?? [],
        challenges: challenges ?? [],
      });
    }

    case "homework": {
      const authorIds = await challengeAuthorIdsForClass(db, ownerId);

      // Paged for the same reason as the homework read below it: `studentIds`
      // filters that read, so losing students here silently drops their
      // homework too — the tab would render a short roster AND missing work.
      // `id` is the paging tiebreaker; the display sort on `name` is unchanged.
      const { data: students } = await fetchAllRows((from, to) =>
        db
          .from("students")
          .select(STUDENT_LIST_COLUMNS)
          .eq("mentor_id", ownerId)
          .order("name")
          .order("id")
          .range(from, to)
      );

      const studentIds = students.map((row) => row.id as string);

      const [{ data: homework }, { data: challenges }] = await Promise.all([
        studentIds.length > 0
          ? // `id` is the tiebreaker so paging stays deterministic when several
            // rows share an assigned_at; the primary sort is unchanged.
            fetchAllRows((from, to) =>
              db
                .from("homework_assignments")
                .select(HOMEWORK_LIST_COLUMNS)
                .in("student_id", studentIds)
                .order("assigned_at", { ascending: false })
                .order("id")
                .range(from, to)
            )
          : Promise.resolve({ data: [], error: null }),
        authorIds.length > 0
          ? fetchAllRows((from, to) =>
              db
                .from("challenges")
                .select(CHALLENGE_LIST_COLUMNS)
                .in("created_by", authorIds)
                .order("id")
                .range(from, to)
            )
          : Promise.resolve({ data: [], error: null }),
      ]);

      return NextResponse.json({
        students,
        homework: homework ?? [],
        challenges: challenges ?? [],
      });
    }

    case "mentors": {
      // The class owner row plus its co-mentors, as two equality filters rather
      // than one interpolated `.or("id.eq.${ownerId},created_by.eq.${ownerId}")`.
      // ownerId comes from authorizeMentorWorkspace so it is server-derived and
      // not attacker-supplied, but joinClass already refuses to build PostgREST
      // filter strings from values for exactly this reason, and one file doing it
      // the other way is how the pattern erodes. Two round trips in parallel;
      // `.order("name")` moves to the merge since it now spans both results.
      const [ownerResult, coMentorResult] = await Promise.all([
        db
          .from("mentors")
          .select("id, name, mentor_name, code, created_at, created_by, user_id")
          .eq("id", ownerId),
        db
          .from("mentors")
          .select("id, name, mentor_name, code, created_at, created_by, user_id")
          .eq("created_by", ownerId),
      ]);

      const error = ownerResult.error ?? coMentorResult.error;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const rows = [...(ownerResult.data ?? []), ...(coMentorResult.data ?? [])].sort(
        (a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""))
      );

      return NextResponse.json({ rows });
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
      const authorIds = await challengeAuthorIdsForClass(db, ownerId);
      if (authorIds.length === 0) {
        return NextResponse.json({ rows: [] });
      }

      // Manage Challenges lists every custom challenge in the class, so a
      // truncated read would hide the tail of the list with no indication.
      const { data: rows, error } = await fetchAllRows((from, to) =>
        db
          .from("challenges")
          .select(CHALLENGE_LIST_COLUMNS)
          .in("created_by", authorIds)
          .order("id")
          .range(from, to)
      );

      if (error) {
        return NextResponse.json(
          { error: (error as { message?: string }).message ?? "Failed to load challenges." },
          { status: 500 }
        );
      }

      return NextResponse.json({ rows });
    }

    case "submissions": {
      const authorIds = await challengeAuthorIdsForClass(db, ownerId);
      const pagination = parsePagination(page, pageSize);

      // Paged: `studentIds` filters both count queries AND the submission page
      // below, so truncation here would hide whole students' submissions while
      // still reporting a confident total — the pagination would look correct.
      const { data: students } = await fetchAllRows((from, to) =>
        db
          .from("students")
          .select("id, name")
          .eq("mentor_id", ownerId)
          .order("id")
          .range(from, to)
      );

      if (students.length === 0) {
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
