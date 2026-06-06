import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchStudentHomework } from "@/lib/studentHomework";

/** Student homework for the active workspace. */
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

  const { assignments, error } = await fetchStudentHomework(supabase, studentId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ assignments });
}
