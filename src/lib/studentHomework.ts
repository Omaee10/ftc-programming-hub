import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomeworkAssignmentRow } from "@/lib/supabase";

/** Load homework for a student workspace. RLS ensures only the signed-in owner can read rows. */
export async function fetchStudentHomework(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ assignments: HomeworkAssignmentRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("homework_assignments")
    .select("*")
    .eq("student_id", studentId)
    .order("assigned_at", { ascending: false });

  if (error) {
    return { assignments: [], error: error.message };
  }

  return { assignments: (data ?? []) as HomeworkAssignmentRow[], error: null };
}
