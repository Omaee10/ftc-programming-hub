-- ─────────────────────────────────────────────────────────────────────────────
-- FTC Programming Hub — Supabase Setup
-- Run this entire file in the Supabase SQL Editor (dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Auth: email confirmation (required for signup) ─────────────────────────
-- Signup creates users with email_confirm = false and sends a confirmation
-- email via Supabase Auth. Configure in the Supabase dashboard:
--   1. Authentication → Providers → Email → enable "Confirm email"
--   2. Authentication → URL Configuration → Site URL = your production URL
--      (e.g. https://your-app.vercel.app) and add /login to Redirect URLs
--   3. Authentication → SMTP Settings → enable custom SMTP (Resend, SendGrid,
--      etc.). Supabase's built-in mailer is rate-limited and often blocked.
--   4. Set NEXT_PUBLIC_SITE_URL on Vercel to the same Site URL (used in
--      confirmation links). Optional: customize templates under Email Templates.
-- Until SMTP works, new users stay unconfirmed and cannot sign in.

-- Mentors
-- `name`        = robotics team name  (e.g. "Iron Wolves #12345")
-- `class_name`  = class label         (e.g. "Period 3 Robotics")
-- `mentor_name` = personal name       (e.g. "Coach Smith")
CREATE TABLE IF NOT EXISTS mentors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  class_name  text,
  mentor_name text,
  code        char(6) UNIQUE NOT NULL,
  class_code  char(6) UNIQUE,
  created_by  uuid REFERENCES mentors(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- ─── Migration: add created_by to existing mentors table ─────────────────────
-- Run this if the table already exists:
-- ALTER TABLE mentors ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES mentors(id) ON DELETE SET NULL;

-- ─── Migration: add mentor_name (personal name) to existing mentors table ────
-- The `name` column stores the robotics team name; `mentor_name` stores the
-- individual mentor's real name (e.g. "Coach Smith" vs "Iron Wolves #12345").
-- Run this in the Supabase SQL Editor if the table already exists:
-- ALTER TABLE mentors ADD COLUMN IF NOT EXISTS mentor_name text;

-- ─── Migration: add class_name to existing mentors table ─────────────────────
-- The `class_name` column stores the class label (e.g. "Period 3 Robotics").
-- Run this in the Supabase SQL Editor if the table already exists:
-- ALTER TABLE mentors ADD COLUMN IF NOT EXISTS class_name text;

-- ─── Migration: add class_code to existing mentors table ─────────────────────
-- Separate 6-digit code for students to join a class (class owners only).
-- Run this in the Supabase SQL Editor if the table already exists:
-- ALTER TABLE mentors ADD COLUMN IF NOT EXISTS class_code char(6) UNIQUE;
-- Backfill owner rows (created_by IS NULL) with unique codes as needed.

-- Students
CREATE TABLE IF NOT EXISTS students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  code       char(6) UNIQUE NOT NULL,
  mentor_id  uuid REFERENCES mentors(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- ─── Migration: fix challenge ID sequence to start at 1000 ──────────────────
-- Run this if the challenges table already exists:
-- ALTER SEQUENCE challenges_id_seq RESTART WITH 1000;

-- ─── Migration: add mentor_id to existing students table ──────────────────────
-- Run this if the table already exists:
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES mentors(id) ON DELETE CASCADE;

-- Challenges (mirrors the Challenge interface in src/data/challenges.ts)
-- IDs start at 1000 to avoid collisions with static challenge IDs (1–53)
CREATE TABLE IF NOT EXISTS challenges (
  id               integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000),
  title            text NOT NULL,
  difficulty       text NOT NULL DEFAULT 'Beginner',
  description      text NOT NULL DEFAULT '',
  xp               integer NOT NULL DEFAULT 100,
  estimated_time   text NOT NULL DEFAULT '30 min',
  tags             text[] NOT NULL DEFAULT '{}',
  objectives       text[] NOT NULL DEFAULT '{}',
  instructions     text NOT NULL DEFAULT '',
  starter_code     text NOT NULL DEFAULT '',
  hints            text[] NOT NULL DEFAULT '{}',
  concepts_covered text[] NOT NULL DEFAULT '{}',
  -- Mentor-authored rubric rules, evaluated by the Java grader (see
  -- grader/src/.../rubric/mentor/JsonRule.java). Each entry is a small DSL:
  --   { "kind": "callsMethod", "arg": "DcMotor.setDirection",
  --     "label": "Sets motor direction", "tier": "improvement" }
  rubric_json      jsonb,
  -- Authorship AND class membership, in one column. Read that twice before
  -- touching anything that deletes a `mentors` row.
  --
  -- There is no `classes` table — a class IS the `mentors` row with
  -- created_by IS NULL, and co-mentors are `mentors` rows pointing at it. A
  -- challenge therefore belongs to a class only transitively, through the mentor
  -- who wrote it, and every read resolves the class by expanding owner ->
  -- co-mentors and filtering `created_by IN (...)`: see the two /api/challenges/class
  -- routes and all five scopes of /api/mentor/dashboard-data.
  --
  -- Which makes ON DELETE SET NULL a trap. `created_by IN (...)` is never true
  -- for NULL, so a nulled row matches no RLS policy and no read filter — it does
  -- not lose its author, it silently leaves its class. Invisible to the owner,
  -- the co-mentors and the students, unwritable by anyone, and still there.
  --
  -- Two paths delete a mentor row, and BOTH reassign challenges to the class
  -- owner first, specifically to avoid that:
  --   src/lib/supabase/leaveClass.ts            (co-mentor removes themselves)
  --   src/app/api/mentor/delete-member/route.ts (owner removes a co-mentor)
  -- Any third such path must do the same. Nothing in the schema enforces it.
  --
  -- The structural fix is a NOT NULL challenges.class_id, splitting membership
  -- from attribution so SET NULL becomes harmless and the invariant is enforced
  -- by the database instead of by remembering. Considered and deferred 2026-08-08:
  -- ~20 code sites, two migrations, and a backfill that cannot derive a class for
  -- any already-nulled row. Revisit when a third deletion path appears, when
  -- `select count(*) from challenges where created_by is null` stops returning 0
  -- (verified 0 on 2026-08-08), or when one mentor needs two classes — that last
  -- one wants a real `classes` table rather than this half-step.
  created_by       uuid REFERENCES mentors(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

-- ─── Migration: add rubric_json to existing challenges table ─────────────
-- Run this in the Supabase SQL Editor if your challenges table predates rubric_json:
-- ALTER TABLE challenges ADD COLUMN IF NOT EXISTS rubric_json jsonb;

-- Student progress
-- NOTE: challenge_id is a plain integer with NO foreign key constraint so that
-- both static challenges (IDs 1–999) and DB-created challenges (IDs 1000+) can
-- be stored here without a FK violation.
CREATE TABLE IF NOT EXISTS student_challenge_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id      integer NOT NULL,
  completed         boolean NOT NULL DEFAULT false,
  code_snapshot     text,
  blocks_snapshot   jsonb,
  blocks_updated_at timestamptz,
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (student_id, challenge_id)
);

-- ─── Migration: add blocks_snapshot to existing student_challenge_progress ────
-- Run this in the Supabase SQL Editor if the table already exists:
-- ALTER TABLE student_challenge_progress ADD COLUMN IF NOT EXISTS blocks_snapshot jsonb;
-- ALTER TABLE student_challenge_progress ADD COLUMN IF NOT EXISTS blocks_updated_at timestamptz;

-- Mentor-created challenge submissions (manual grading)
CREATE TABLE IF NOT EXISTS challenge_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id  integer NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  code_snapshot text NOT NULL,
  blocks_snapshot   jsonb,
  submitted_at  timestamptz DEFAULT now(),
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'graded'
  grade         text,                             -- 'pass' | 'needs-work' | 'redo'
  feedback      text,
  graded_at     timestamptz,
  graded_by     uuid REFERENCES mentors(id) ON DELETE SET NULL,
  UNIQUE (student_id, challenge_id)               -- one active submission per student per challenge
);

-- ─── Migration: add blocks_snapshot to challenge_submissions ────────────────
-- Run this in the Supabase SQL Editor if your submissions table predates blocks:
-- ALTER TABLE challenge_submissions ADD COLUMN IF NOT EXISTS blocks_snapshot jsonb;

-- ─── Migration: add challenge_submissions to existing databases ───────────────
-- Run this if the other tables already exist:
-- CREATE TABLE IF NOT EXISTS challenge_submissions (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
--   challenge_id integer NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
--   code_snapshot text NOT NULL,
--   submitted_at timestamptz DEFAULT now(),
--   status text NOT NULL DEFAULT 'pending',
--   grade text,
--   feedback text,
--   graded_at timestamptz,
--   graded_by uuid REFERENCES mentors(id) ON DELETE SET NULL,
--   UNIQUE (student_id, challenge_id)
-- );
-- ALTER TABLE challenge_submissions DISABLE ROW LEVEL SECURITY;

-- Homework assignments (mentor assigns challenges to individual students)
-- challenge_id is a plain integer (no FK) so static IDs 1–53 and custom 1000+ work.
CREATE TABLE IF NOT EXISTS homework_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id  integer NOT NULL,
  assigned_by   uuid REFERENCES mentors(id) ON DELETE SET NULL,
  assigned_at   timestamptz DEFAULT now(),
  due_date      timestamptz,
  completed     boolean NOT NULL DEFAULT false,
  completed_at  timestamptz,
  code_snapshot text,
  UNIQUE (student_id, challenge_id)
);

-- ─── Migration: add homework_assignments to existing databases ────────────────
-- Run this if the other tables already exist:
-- CREATE TABLE IF NOT EXISTS homework_assignments (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
--   challenge_id integer NOT NULL,
--   assigned_by uuid REFERENCES mentors(id) ON DELETE SET NULL,
--   assigned_at timestamptz DEFAULT now(),
--   due_date timestamptz,
--   completed boolean NOT NULL DEFAULT false,
--   completed_at timestamptz,
--   code_snapshot text,
--   UNIQUE (student_id, challenge_id)
-- );
-- ALTER TABLE homework_assignments DISABLE ROW LEVEL SECURITY;

-- ─── Auth: profiles + user_id links ─────────────────────────────────────────
-- Run these migrations if tables already exist:
-- CREATE TABLE IF NOT EXISTS profiles (...);
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
-- ALTER TABLE mentors  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
-- CREATE UNIQUE INDEX IF NOT EXISTS students_user_mentor_unique ON students (user_id, mentor_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  display_name  text NOT NULL,
  account_type  text CHECK (account_type IN ('student', 'mentor')),
  created_at    timestamptz DEFAULT now()
);

-- Migration for existing profiles table:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type text CHECK (account_type IN ('student', 'mentor'));
-- CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique ON profiles (lower(email));

ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE mentors  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS students_user_mentor_unique
  ON students (user_id, mentor_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique
  ON profiles (lower(email));

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_assignments       ENABLE ROW LEVEL SECURITY;

-- RLS helper functions (SECURITY DEFINER — bypass RLS for cross-table lookups).
-- Without these, mentors ↔ students policy subqueries recurse infinitely.
CREATE OR REPLACE FUNCTION public.rls_own_mentor_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT id FROM mentors WHERE user_id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.rls_mentor_scope_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT id FROM mentors WHERE user_id = auth.uid()
  UNION
  SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.rls_class_owner_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL; $$;

CREATE OR REPLACE FUNCTION public.rls_own_student_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT id FROM students WHERE user_id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.rls_student_mentor_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT mentor_id FROM students WHERE user_id = auth.uid() AND mentor_id IS NOT NULL; $$;

CREATE OR REPLACE FUNCTION public.rls_student_class_owner_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT m.created_by FROM students s
  INNER JOIN mentors m ON m.id = s.mentor_id
  WHERE s.user_id = auth.uid() AND m.created_by IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.rls_mentor_scope_student_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT s.id FROM students s
  WHERE s.mentor_id IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.rls_own_mentor_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_mentor_scope_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_class_owner_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_own_student_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_student_mentor_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_student_class_owner_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_mentor_scope_student_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_own_mentor_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_mentor_scope_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_class_owner_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_own_student_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_student_mentor_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_student_class_owner_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_mentor_scope_student_ids() TO authenticated;

-- Profiles: users read/update own row
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING ((select auth.uid()) = id);

-- Students: users manage own enrollments; mentors read students in their class
CREATE POLICY students_select_own ON students FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY students_insert_own ON students FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY students_update_own ON students FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY students_select_mentor ON students FOR SELECT USING (
  mentor_id IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY students_insert_mentor ON students FOR INSERT WITH CHECK (
  mentor_id IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY students_delete_mentor ON students FOR DELETE USING (
  mentor_id IN (SELECT rls_mentor_scope_ids())
);

-- Mentors: users manage own rows; students read their class mentor
CREATE POLICY mentors_select_own ON mentors FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY mentors_insert_own ON mentors FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY mentors_update_own ON mentors FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY mentors_select_student ON mentors FOR SELECT USING (
  id IN (SELECT rls_student_mentor_ids())
  OR created_by IN (SELECT rls_student_mentor_ids())
);
-- Class owners can see/manage co-mentor rows they created
CREATE POLICY mentors_select_class_members ON mentors FOR SELECT USING (
  created_by IN (SELECT rls_own_mentor_ids())
);
CREATE POLICY mentors_insert_co_mentor ON mentors FOR INSERT WITH CHECK (
  created_by IN (SELECT rls_own_mentor_ids())
);
CREATE POLICY mentors_delete_co_mentor ON mentors FOR DELETE USING (
  created_by IN (SELECT rls_own_mentor_ids())
);
-- Co-mentors can read the class owner row (class_code lives on the owner)
CREATE POLICY mentors_select_class_owner ON mentors FOR SELECT USING (
  id IN (SELECT rls_class_owner_ids())
);
-- REMOVED — do not reinstate. `mentors_select_class_code` allowed lookup by
-- class_code for joining a class:
--
--   CREATE POLICY mentors_select_class_code ON mentors FOR SELECT USING (
--     created_by IS NULL AND class_code IS NOT NULL
--   );
--
-- It has no auth.uid() reference and no column restriction, so it exposed every
-- unclaimed class-owner row IN FULL to every caller — including `class_code`
-- (the student join code) and `code` (the mentor's personal sign-in credential,
-- which /api/auth/link-mentor accepts to claim a workspace). Any signed-in user
-- could read every class's codes; combined with account deletion releasing owner
-- rows (user_id -> NULL), that chained into full class takeover.
--
-- Nothing needs it: joining a class goes through /api/auth/join-class, which
-- uses the service-role client and bypasses RLS entirely. If a client-side class
-- lookup is ever needed, expose a VIEW over (id, name, class_name) only —
-- never `code` or `class_code`.
--
-- Already dropped in production (verified against pg_policies 2026-08-07).
-- See supabase-fix-cross-tenant-rls.sql.

-- Challenges: mentors manage own; students read class challenges
--
-- SUPERSEDED on an existing database — supabase-fix-challenge-authorship.sql
-- replaces all four of these, scoping writes by real authorship (owner writes
-- anything in their class, co-mentor only their own) and making co-mentor
-- challenges readable by the class. These definitions predate co-mentors owning
-- what they create; keep them here so a fresh database has working policies from
-- this file alone, but RUN supabase-fix-challenge-authorship.sql immediately
-- after this one. Until you do, a co-mentor can edit and delete the owner's
-- challenges, the owner cannot touch theirs, and students cannot see them.
CREATE POLICY challenges_select_mentor ON challenges FOR SELECT USING (
  created_by IN (SELECT rls_mentor_scope_ids())
  OR created_by IN (SELECT rls_student_mentor_ids())
  OR created_by IN (SELECT rls_student_class_owner_ids())
);
CREATE POLICY challenges_insert_mentor ON challenges FOR INSERT WITH CHECK (
  created_by IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY challenges_update_mentor ON challenges FOR UPDATE USING (
  created_by IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY challenges_delete_mentor ON challenges FOR DELETE USING (
  created_by IN (SELECT rls_mentor_scope_ids())
);

-- Progress: students manage own; mentors read class students' progress
CREATE POLICY progress_select_own ON student_challenge_progress FOR SELECT USING (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY progress_insert_own ON student_challenge_progress FOR INSERT WITH CHECK (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY progress_update_own ON student_challenge_progress FOR UPDATE USING (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY progress_select_mentor ON student_challenge_progress FOR SELECT USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);

-- Submissions: students manage own; mentors grade class submissions
CREATE POLICY submissions_select_own ON challenge_submissions FOR SELECT USING (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY submissions_insert_own ON challenge_submissions FOR INSERT WITH CHECK (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY submissions_update_own ON challenge_submissions FOR UPDATE USING (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY submissions_select_mentor ON challenge_submissions FOR SELECT USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);
CREATE POLICY submissions_update_mentor ON challenge_submissions FOR UPDATE USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);

-- Homework: students read own; mentors manage class assignments
CREATE POLICY homework_select_own ON homework_assignments FOR SELECT USING (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY homework_update_own ON homework_assignments FOR UPDATE USING (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY homework_select_mentor ON homework_assignments FOR SELECT USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);
-- SUPERSEDED on an existing database — supabase-fix-homework-insert-scope.sql
-- adds the missing student_id scope, without which a mentor can write homework
-- for a student in another class. Kept here so a fresh database has a working
-- policy from this file alone; RUN that file immediately after this one.
CREATE POLICY homework_insert_mentor ON homework_assignments FOR INSERT WITH CHECK (
  assigned_by IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY homework_update_mentor ON homework_assignments FOR UPDATE USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);
CREATE POLICY homework_delete_mentor ON homework_assignments FOR DELETE USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);

-- ─── Migration: drop FK on challenge_id so static challenges (IDs 1–999) ────
-- can be stored alongside DB-created challenges (IDs 1000+).
-- Run this in the Supabase SQL Editor if the table already exists:
-- ALTER TABLE student_challenge_progress
--   DROP CONSTRAINT IF EXISTS student_challenge_progress_challenge_id_fkey;

