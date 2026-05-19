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
  code: string;
  created_at: string;
}

export interface StudentRow {
  id: string;
  name: string;
  code: string;
  created_at: string;
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
