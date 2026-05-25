import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily initialised so build-time module evaluation doesn't throw when
// env vars haven't been inlined yet (e.g. during static page data collection).
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  _client = createClient(url || "https://placeholder.supabase.co", key || "placeholder");
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── Row types ────────────────────────────────────────────────────────────────

export interface MentorRow {
  id: string;
  name: string;
  class_name?: string | null;
  mentor_name?: string | null;
  code: string;
  created_at: string;
}

export interface StudentRow {
  id: string;
  name: string;
  code: string;
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
