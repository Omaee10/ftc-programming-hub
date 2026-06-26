import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { fetchUserWorkspaces } from "@/lib/supabase/workspaces";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = hasServiceRoleKey() ? createAdminClient() : supabase;
  const { data, error } = await fetchUserWorkspaces(db, user.id);

  if (error || !data) {
    return NextResponse.json({ error: error ?? "Failed to load workspaces." }, { status: 500 });
  }

  return NextResponse.json({
    profileName: data.profileName,
    studentCount: data.students.length,
    mentorCount: data.mentors.length,
    students: data.students,
    mentors: data.mentors,
  });
}
