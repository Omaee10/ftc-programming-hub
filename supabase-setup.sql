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

-- ─── Disable RLS (internal tool — enable & add policies before going public) ──
ALTER TABLE mentors                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE students                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenges                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_challenge_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework_assignments       DISABLE ROW LEVEL SECURITY;

-- ─── Migration: drop FK on challenge_id so static challenges (IDs 1–999) ────
-- can be stored alongside DB-created challenges (IDs 1000+).
-- Run this in the Supabase SQL Editor if the table already exists:
-- ALTER TABLE student_challenge_progress
--   DROP CONSTRAINT IF EXISTS student_challenge_progress_challenge_id_fkey;

