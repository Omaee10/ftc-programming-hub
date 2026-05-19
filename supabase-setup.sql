-- ─────────────────────────────────────────────────────────────────────────────
-- FTC Programming Hub — Supabase Setup
-- Run this entire file in the Supabase SQL Editor (dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Mentors
CREATE TABLE IF NOT EXISTS mentors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  code       char(6) UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  code       char(6) UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Challenges (mirrors the Challenge interface in src/data/challenges.ts)
CREATE TABLE IF NOT EXISTS challenges (
  id               serial PRIMARY KEY,
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
  created_by       uuid REFERENCES mentors(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

-- Student progress
CREATE TABLE IF NOT EXISTS student_challenge_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id  integer NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  completed     boolean NOT NULL DEFAULT false,
  code_snapshot text,
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (student_id, challenge_id)
);

-- ─── Disable RLS (internal tool — enable & add policies before going public) ──
ALTER TABLE mentors                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE students                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenges                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_challenge_progress DISABLE ROW LEVEL SECURITY;

