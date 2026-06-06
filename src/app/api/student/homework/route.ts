import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Student homework for the active workspace — verifies studentId belongs to auth user. */
export async function GET(request: Request): Promise<NextResponse> {
  const studentId = new URL(request.url).searchParams.get("studentId")?.trim();
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: enrollment, error: enrollmentErr } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (enrollmentErr) {
    return NextResponse.json({ error: enrollmentErr.message }, { status: 500 });
  }

  if (!enrollment) {
    return NextResponse.json(
      { error: "This class workspace is not linked to your account." },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("homework_assignments")
    .select("*")
    .eq("student_id", studentId)
    .order("assigned_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: data ?? [] });
}
