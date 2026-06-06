import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { repairClassMentorLinks } from "@/lib/supabase/mentorClaim";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const profileName = profile?.display_name?.trim() || null;

  const { data: students, error: studentsErr } = await supabase
    .from("students")
    .select("id, name, mentor_id, mentors(name, class_name)")
    .eq("user_id", user.id);

  if (studentsErr) {
    return NextResponse.json({ error: studentsErr.message }, { status: 500 });
  }

  const studentItems = (students ?? []).map((row) => {
    const mentor = row.mentors as unknown as {
      name: string;
      class_name?: string | null;
    } | null;
    return {
      kind: "student" as const,
      id: row.id as string,
      name: profileName ?? (row.name as string),
      mentorId: (row.mentor_id as string) ?? "",
      teamName: mentor?.name ?? "",
      className: mentor?.class_name?.trim() || undefined,
    };
  });

  const { data: mentors, error: mentorsErr } = await supabase
    .from("mentors")
    .select("id, name, mentor_name, class_name, created_by")
    .eq("user_id", user.id);

  if (mentorsErr) {
    return NextResponse.json({ error: mentorsErr.message }, { status: 500 });
  }

  if (hasServiceRoleKey()) {
    const admin = createAdminClient();
    const ownerIds = new Set<string>();
    for (const row of mentors ?? []) {
      const parentId = row.created_by as string | null;
      ownerIds.add(parentId ?? (row.id as string));
    }
    for (const ownerId of ownerIds) {
      await repairClassMentorLinks(admin, ownerId);
    }
  }

  const { data: refreshedMentors, error: refreshErr } = await supabase
    .from("mentors")
    .select("id, name, mentor_name, class_name, created_by")
    .eq("user_id", user.id);

  if (refreshErr) {
    return NextResponse.json({ error: refreshErr.message }, { status: 500 });
  }

  const mentorItems = [];
  for (const row of refreshedMentors ?? []) {
    const parentId = (row.created_by as string | null) ?? undefined;
    let personalName = (row.mentor_name as string | null) ?? (row.name as string);
    let teamName = row.name as string;
    let className = (row.class_name as string | null)?.trim() || undefined;

    if (parentId) {
      const { data: parent } = await supabase
        .from("mentors")
        .select("name, class_name")
        .eq("id", parentId)
        .single();
      if (parent) {
        teamName = parent.name as string;
        className = (parent.class_name as string | null)?.trim() || className;
      }
    }

    mentorItems.push({
      kind: "mentor" as const,
      id: row.id as string,
      name: profileName ?? personalName,
      teamName,
      className,
      parentMentorId: parentId,
      isOwner: !parentId,
    });
  }

  return NextResponse.json({
    profileName,
    studentCount: studentItems.length,
    mentorCount: mentorItems.length,
    students: studentItems,
    mentors: mentorItems,
  });
}
