import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profileRes, studentsRes, mentorsRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("students").select("id, name, mentor_id").eq("user_id", user.id),
    supabase
      .from("mentors")
      .select("id, name, mentor_name, class_name, created_by")
      .eq("user_id", user.id),
  ]);

  if (studentsRes.error) {
    return NextResponse.json({ error: studentsRes.error.message }, { status: 500 });
  }
  if (mentorsRes.error) {
    return NextResponse.json({ error: mentorsRes.error.message }, { status: 500 });
  }

  const profileName = profileRes.data?.display_name?.trim() || null;
  const students = studentsRes.data ?? [];
  const mentors = mentorsRes.data ?? [];

  const mentorIds = new Set<string>();
  for (const row of students) {
    const mentorId = row.mentor_id as string | null;
    if (mentorId) mentorIds.add(mentorId);
  }
  for (const row of mentors) {
    const parentId = row.created_by as string | null;
    if (parentId) mentorIds.add(parentId);
  }

  const mentorInfoById = new Map<string, { name: string; class_name: string | null }>();
  if (mentorIds.size > 0) {
    const { data: mentorRows, error: mentorLookupErr } = await supabase
      .from("mentors")
      .select("id, name, class_name")
      .in("id", [...mentorIds]);

    if (mentorLookupErr) {
      return NextResponse.json({ error: mentorLookupErr.message }, { status: 500 });
    }

    for (const row of mentorRows ?? []) {
      mentorInfoById.set(row.id as string, {
        name: row.name as string,
        class_name: (row.class_name as string | null) ?? null,
      });
    }
  }

  const studentItems = students.map((row) => {
    const mentor = row.mentor_id
      ? mentorInfoById.get(row.mentor_id as string)
      : undefined;
    return {
      kind: "student" as const,
      id: row.id as string,
      name: profileName ?? (row.name as string),
      mentorId: (row.mentor_id as string) ?? "",
      teamName: mentor?.name ?? "",
      className: mentor?.class_name?.trim() || undefined,
    };
  });

  const mentorItems = mentors.map((row) => {
    const parentId = (row.created_by as string | null) ?? undefined;
    const personalName = (row.mentor_name as string | null) ?? (row.name as string);
    let teamName = row.name as string;
    let className = (row.class_name as string | null)?.trim() || undefined;

    if (parentId) {
      const parent = mentorInfoById.get(parentId);
      if (parent) {
        teamName = parent.name;
        className = parent.class_name?.trim() || className;
      }
    }

    return {
      kind: "mentor" as const,
      id: row.id as string,
      name: profileName ?? personalName,
      teamName,
      className,
      parentMentorId: parentId,
      isOwner: !parentId,
    };
  });

  return NextResponse.json({
    profileName,
    studentCount: studentItems.length,
    mentorCount: mentorItems.length,
    students: studentItems,
    mentors: mentorItems,
  });
}
