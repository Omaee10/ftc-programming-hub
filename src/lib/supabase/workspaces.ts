import type { SupabaseClient } from "@supabase/supabase-js";

export interface StudentWorkspaceItem {
  kind: "student";
  id: string;
  name: string;
  mentorId: string;
  teamName: string;
  className?: string;
}

export interface MentorWorkspaceItem {
  kind: "mentor";
  id: string;
  name: string;
  teamName: string;
  className?: string;
  parentMentorId?: string;
  isOwner: boolean;
}

export interface UserWorkspacesResult {
  profileName: string | null;
  students: StudentWorkspaceItem[];
  mentors: MentorWorkspaceItem[];
}

export async function fetchUserWorkspaces(
  admin: SupabaseClient,
  userId: string
): Promise<{ data: UserWorkspacesResult | null; error: string | null }> {
  const [profileRes, studentsRes, mentorsRes] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    admin.from("students").select("id, name, mentor_id").eq("user_id", userId),
    admin
      .from("mentors")
      .select("id, name, mentor_name, class_name, created_by")
      .eq("user_id", userId),
  ]);

  if (studentsRes.error) {
    return { data: null, error: studentsRes.error.message };
  }
  if (mentorsRes.error) {
    return { data: null, error: mentorsRes.error.message };
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
    const { data: mentorRows, error: mentorLookupErr } = await admin
      .from("mentors")
      .select("id, name, class_name")
      .in("id", [...mentorIds]);

    if (mentorLookupErr) {
      return { data: null, error: mentorLookupErr.message };
    }

    for (const row of mentorRows ?? []) {
      mentorInfoById.set(row.id as string, {
        name: row.name as string,
        class_name: (row.class_name as string | null) ?? null,
      });
    }
  }

  const studentItems: StudentWorkspaceItem[] = students.map((row) => {
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

  const mentorItems: MentorWorkspaceItem[] = mentors.map((row) => {
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

  return {
    data: {
      profileName,
      students: studentItems,
      mentors: mentorItems,
    },
    error: null,
  };
}
