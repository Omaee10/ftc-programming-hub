export { supabase, createClient } from "@/lib/supabase/client";

// ─── Row types ────────────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface MentorRow {
  id: string;
  name: string;
  class_name?: string | null;
  mentor_name?: string | null;
  code: string;
  class_code?: string | null;
  created_by?: string | null;
  user_id?: string | null;
  created_at: string;
}

export interface StudentRow {
  id: string;
  name: string;
  code: string;
  mentor_id?: string | null;
  user_id?: string | null;
  created_at: string;
}

/** Shape of a single mentor-authored rubric rule, mirrored on the Java side. */
export interface MentorRubricRule {
  kind:
    | "callsMethod"
    | "declaresField"
    | "containsLiteral"
    | "extendsClass"
    | "hasAnnotation"
    | "instantiates"
    | "forbidsCall";
  arg: string;
  label?: string;
  description?: string;
  tip?: string;
  tier?: "required" | "improvement" | "style";
}

export interface ChallengeRow {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  xp: number;
  estimated_time: string;
  tags: string[];
  objectives: string[];
  instructions: string;
  starter_code: string;
  hints: string[];
  concepts_covered: string[];
  /** Optional mentor rubric, evaluated by the Java grader. */
  rubric_json: MentorRubricRule[] | null;
  created_by: string | null;
  created_at: string;
}

export interface ProgressRow {
  id: string;
  student_id: string;
  challenge_id: number;
  completed: boolean;
  code_snapshot: string | null;
  updated_at: string;
}

export interface SubmissionRow {
  id: string;
  student_id: string;
  challenge_id: number;
  code_snapshot: string;
  submitted_at: string;
  status: "pending" | "graded";
  grade: "pass" | "needs-work" | "redo" | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
}

export interface HomeworkAssignmentRow {
  id: string;
  student_id: string;
  challenge_id: number;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  code_snapshot: string | null;
}
