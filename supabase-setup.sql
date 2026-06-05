-- ─────────────────────────────────────────────────────────────────────────────
-- FTC Programming Hub — Supabase Setup
-- Run this entire file in the Supabase SQL Editor (dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

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
  created_by       uuid REFERENCES mentors(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

-- ─── Migration: add rubric_json to existing challenges table ─────────────
-- Run this if the table already exists:
-- ALTER TABLE challenges ADD COLUMN IF NOT EXISTS rubric_json jsonb;

-- Student progress
-- NOTE: challenge_id is a plain integer with NO foreign key constraint so that
-- both static challenges (IDs 1–999) and DB-created challenges (IDs 1000+) can
-- be stored here without a FK violation.
CREATE TABLE IF NOT EXISTS student_challenge_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id  integer NOT NULL,
  completed     boolean NOT NULL DEFAULT false,
  code_snapshot text,
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (student_id, challenge_id)
);

-- Mentor-created challenge submissions (manual grading)
CREATE TABLE IF NOT EXISTS challenge_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id  integer NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  code_snapshot text NOT NULL,
  submitted_at  timestamptz DEFAULT now(),
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'graded'
  grade         text,                             -- 'pass' | 'needs-work' | 'redo'
  feedback      text,
  graded_at     timestamptz,
  graded_by     uuid REFERENCES mentors(id) ON DELETE SET NULL,
  UNIQUE (student_id, challenge_id)               -- one active submission per student per challenge
);

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

ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE mentors  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS students_user_mentor_unique
  ON students (user_id, mentor_id)
  WHERE user_id IS NOT NULL;

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_assignments       ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update own row
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id);

-- Students: users manage own enrollments; mentors read students in their class
CREATE POLICY students_select_own ON students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY students_insert_own ON students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY students_update_own ON students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY students_select_mentor ON students FOR SELECT USING (
  mentor_id IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  )
);
CREATE POLICY students_insert_mentor ON students FOR INSERT WITH CHECK (
  mentor_id IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  )
);
CREATE POLICY students_delete_mentor ON students FOR DELETE USING (
  mentor_id IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  )
);

-- Mentors: users manage own rows; students read their class mentor
CREATE POLICY mentors_select_own ON mentors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY mentors_insert_own ON mentors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mentors_update_own ON mentors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY mentors_select_student ON mentors FOR SELECT USING (
  id IN (SELECT mentor_id FROM students WHERE user_id = auth.uid())
  OR created_by IN (SELECT mentor_id FROM students WHERE user_id = auth.uid())
);
-- Class owners can see/manage co-mentor rows they created
CREATE POLICY mentors_select_class_members ON mentors FOR SELECT USING (
  created_by IN (SELECT id FROM mentors WHERE user_id = auth.uid())
);
CREATE POLICY mentors_insert_co_mentor ON mentors FOR INSERT WITH CHECK (
  created_by IN (SELECT id FROM mentors WHERE user_id = auth.uid())
);
CREATE POLICY mentors_delete_co_mentor ON mentors FOR DELETE USING (
  created_by IN (SELECT id FROM mentors WHERE user_id = auth.uid())
);
-- Allow lookup by class_code for joining a class
CREATE POLICY mentors_select_class_code ON mentors FOR SELECT USING (
  created_by IS NULL AND class_code IS NOT NULL
);

-- Challenges: mentors manage own; students read class challenges
CREATE POLICY challenges_select_mentor ON challenges FOR SELECT USING (
  created_by IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  )
  OR created_by IN (
    SELECT mentor_id FROM students WHERE user_id = auth.uid()
    UNION
    SELECT m.created_by FROM students s
      JOIN mentors m ON s.mentor_id = m.id
      WHERE s.user_id = auth.uid() AND m.created_by IS NOT NULL
  )
);
CREATE POLICY challenges_insert_mentor ON challenges FOR INSERT WITH CHECK (
  created_by IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  )
);
CREATE POLICY challenges_update_mentor ON challenges FOR UPDATE USING (
  created_by IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  )
);
CREATE POLICY challenges_delete_mentor ON challenges FOR DELETE USING (
  created_by IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  )
);

-- Progress: students manage own; mentors read class students' progress
CREATE POLICY progress_select_own ON student_challenge_progress FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY progress_insert_own ON student_challenge_progress FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY progress_update_own ON student_challenge_progress FOR UPDATE USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY progress_select_mentor ON student_challenge_progress FOR SELECT USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (
      SELECT id FROM mentors WHERE user_id = auth.uid()
      UNION
      SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
    )
  )
);

-- Submissions: students manage own; mentors grade class submissions
CREATE POLICY submissions_select_own ON challenge_submissions FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY submissions_insert_own ON challenge_submissions FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY submissions_update_own ON challenge_submissions FOR UPDATE USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY submissions_select_mentor ON challenge_submissions FOR SELECT USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (
      SELECT id FROM mentors WHERE user_id = auth.uid()
      UNION
      SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
    )
  )
);
CREATE POLICY submissions_update_mentor ON challenge_submissions FOR UPDATE USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (
      SELECT id FROM mentors WHERE user_id = auth.uid()
      UNION
      SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
    )
  )
);

-- Homework: students read own; mentors manage class assignments
CREATE POLICY homework_select_own ON homework_assignments FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY homework_update_own ON homework_assignments FOR UPDATE USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY homework_select_mentor ON homework_assignments FOR SELECT USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (
      SELECT id FROM mentors WHERE user_id = auth.uid()
      UNION
      SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
    )
  )
);
CREATE POLICY homework_insert_mentor ON homework_assignments FOR INSERT WITH CHECK (
  assigned_by IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
    UNION
    SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
  )
);
CREATE POLICY homework_update_mentor ON homework_assignments FOR UPDATE USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (
      SELECT id FROM mentors WHERE user_id = auth.uid()
      UNION
      SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
    )
  )
);
CREATE POLICY homework_delete_mentor ON homework_assignments FOR DELETE USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (
      SELECT id FROM mentors WHERE user_id = auth.uid()
      UNION
      SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL
    )
  )
);

-- ─── Migration: drop FK on challenge_id so static challenges (IDs 1–999) ────
-- can be stored alongside DB-created challenges (IDs 1000+).
-- Run this in the Supabase SQL Editor if the table already exists:
-- ALTER TABLE student_challenge_progress
--   DROP CONSTRAINT IF EXISTS student_challenge_progress_challenge_id_fkey;

