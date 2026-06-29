-- ─────────────────────────────────────────────────────────────────────────────
-- FTC Programming Hub — Performance Optimization
-- Run this entire file in the Supabase SQL Editor (dashboard → SQL Editor).
-- Safe to run multiple times (idempotent).
--
-- Prerequisites: RLS helper functions from supabase-setup.sql (or run
-- supabase-fix-rls-recursion.sql first). Policies below use those helpers —
-- do NOT inline SELECT … FROM mentors/students or recursion returns.
--
-- Fixes two things flagged by Supabase's performance advisor:
--   1. auth_rls_initplan — policies call (select auth.uid()) once per query.
--   2. Missing indexes on columns used by RLS helpers and app filters.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Indexes for RLS helpers and app filters ──────────────────────────────

-- students.mentor_id: used by every "class roster" query and most policies
CREATE INDEX IF NOT EXISTS idx_students_mentor_id
  ON students (mentor_id);

-- mentors.user_id: used by every mentor-side policy subquery
CREATE INDEX IF NOT EXISTS idx_mentors_user_id
  ON mentors (user_id)
  WHERE user_id IS NOT NULL;

-- mentors.created_by: used by co-mentor / class-owner policy subqueries
CREATE INDEX IF NOT EXISTS idx_mentors_created_by
  ON mentors (created_by)
  WHERE created_by IS NOT NULL;

-- challenges.created_by: used by challenge list queries and policies
CREATE INDEX IF NOT EXISTS idx_challenges_created_by
  ON challenges (created_by);

-- challenge_submissions pending-count query on the mentor overview
CREATE INDEX IF NOT EXISTS idx_submissions_pending
  ON challenge_submissions (student_id)
  WHERE status = 'pending';

-- NOTE: student_challenge_progress, challenge_submissions and
-- homework_assignments already have a UNIQUE (student_id, challenge_id)
-- constraint, which doubles as an index for student_id lookups.
-- students.user_id is covered by the students_user_mentor_unique index.

-- ─── 2. Recreate RLS policies (helpers + initplan auth.uid()) ────────────────
-- Same semantics as supabase-fix-rls-recursion.sql; safe to re-run.

-- Profiles
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;

CREATE POLICY profiles_select_own ON profiles FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING ((select auth.uid()) = id);

-- Students
DROP POLICY IF EXISTS students_select_own ON students;
DROP POLICY IF EXISTS students_insert_own ON students;
DROP POLICY IF EXISTS students_update_own ON students;
DROP POLICY IF EXISTS students_select_mentor ON students;
DROP POLICY IF EXISTS students_insert_mentor ON students;
DROP POLICY IF EXISTS students_delete_mentor ON students;

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

-- Mentors
DROP POLICY IF EXISTS mentors_select_own ON mentors;
DROP POLICY IF EXISTS mentors_insert_own ON mentors;
DROP POLICY IF EXISTS mentors_update_own ON mentors;
DROP POLICY IF EXISTS mentors_select_student ON mentors;
DROP POLICY IF EXISTS mentors_select_class_members ON mentors;
DROP POLICY IF EXISTS mentors_insert_co_mentor ON mentors;
DROP POLICY IF EXISTS mentors_delete_co_mentor ON mentors;
DROP POLICY IF EXISTS mentors_select_class_owner ON mentors;
-- mentors_select_class_code does not use auth.uid() or cross-table subqueries; unchanged.

CREATE POLICY mentors_select_own ON mentors FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY mentors_insert_own ON mentors FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY mentors_update_own ON mentors FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY mentors_select_student ON mentors FOR SELECT USING (
  id IN (SELECT rls_student_mentor_ids())
  OR created_by IN (SELECT rls_student_mentor_ids())
);
CREATE POLICY mentors_select_class_members ON mentors FOR SELECT USING (
  created_by IN (SELECT rls_own_mentor_ids())
);
CREATE POLICY mentors_insert_co_mentor ON mentors FOR INSERT WITH CHECK (
  created_by IN (SELECT rls_own_mentor_ids())
);
CREATE POLICY mentors_delete_co_mentor ON mentors FOR DELETE USING (
  created_by IN (SELECT rls_own_mentor_ids())
);
CREATE POLICY mentors_select_class_owner ON mentors FOR SELECT USING (
  id IN (SELECT rls_class_owner_ids())
);

-- Challenges
DROP POLICY IF EXISTS challenges_select_mentor ON challenges;
DROP POLICY IF EXISTS challenges_insert_mentor ON challenges;
DROP POLICY IF EXISTS challenges_update_mentor ON challenges;
DROP POLICY IF EXISTS challenges_delete_mentor ON challenges;

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

-- Progress
DROP POLICY IF EXISTS progress_select_own ON student_challenge_progress;
DROP POLICY IF EXISTS progress_insert_own ON student_challenge_progress;
DROP POLICY IF EXISTS progress_update_own ON student_challenge_progress;
DROP POLICY IF EXISTS progress_select_mentor ON student_challenge_progress;

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

-- Submissions
DROP POLICY IF EXISTS submissions_select_own ON challenge_submissions;
DROP POLICY IF EXISTS submissions_insert_own ON challenge_submissions;
DROP POLICY IF EXISTS submissions_update_own ON challenge_submissions;
DROP POLICY IF EXISTS submissions_select_mentor ON challenge_submissions;
DROP POLICY IF EXISTS submissions_update_mentor ON challenge_submissions;

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

-- Homework
DROP POLICY IF EXISTS homework_select_own ON homework_assignments;
DROP POLICY IF EXISTS homework_update_own ON homework_assignments;
DROP POLICY IF EXISTS homework_select_mentor ON homework_assignments;
DROP POLICY IF EXISTS homework_insert_mentor ON homework_assignments;
DROP POLICY IF EXISTS homework_update_mentor ON homework_assignments;
DROP POLICY IF EXISTS homework_delete_mentor ON homework_assignments;

CREATE POLICY homework_select_own ON homework_assignments FOR SELECT USING (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY homework_update_own ON homework_assignments FOR UPDATE USING (
  student_id IN (SELECT rls_own_student_ids())
);
CREATE POLICY homework_select_mentor ON homework_assignments FOR SELECT USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);
CREATE POLICY homework_insert_mentor ON homework_assignments FOR INSERT WITH CHECK (
  assigned_by IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY homework_update_mentor ON homework_assignments FOR UPDATE USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);
CREATE POLICY homework_delete_mentor ON homework_assignments FOR DELETE USING (
  student_id IN (SELECT rls_mentor_scope_student_ids())
);

-- ─── 3. Refresh planner statistics ────────────────────────────────────────────
ANALYZE students;
ANALYZE mentors;
ANALYZE challenges;
ANALYZE student_challenge_progress;
ANALYZE challenge_submissions;
ANALYZE homework_assignments;
