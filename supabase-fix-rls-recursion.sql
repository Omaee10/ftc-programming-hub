-- ─────────────────────────────────────────────────────────────────────────────
-- FTC Programming Hub — Fix RLS infinite recursion (students ↔ mentors)
-- Run in Supabase SQL Editor. Safe to run multiple times.
--
-- Problem: students SELECT policies query mentors, and mentors SELECT policies
-- query students, causing "infinite recursion detected in policy for relation
-- 'students'" when listing enrollments after sign-in.
--
-- Fix: SECURITY DEFINER helper functions bypass RLS for cross-table lookups.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rls_own_mentor_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM mentors WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.rls_mentor_scope_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM mentors WHERE user_id = auth.uid()
  UNION
  SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.rls_class_owner_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT created_by FROM mentors WHERE user_id = auth.uid() AND created_by IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.rls_own_student_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM students WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.rls_student_mentor_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT mentor_id FROM students WHERE user_id = auth.uid() AND mentor_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.rls_own_mentor_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_mentor_scope_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_class_owner_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_own_student_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_student_mentor_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_own_mentor_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_mentor_scope_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_class_owner_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_own_student_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_student_mentor_ids() TO authenticated;

-- Students (mentor-side policies)
DROP POLICY IF EXISTS students_select_mentor ON students;
DROP POLICY IF EXISTS students_insert_mentor ON students;
DROP POLICY IF EXISTS students_delete_mentor ON students;

CREATE POLICY students_select_mentor ON students FOR SELECT USING (
  mentor_id IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY students_insert_mentor ON students FOR INSERT WITH CHECK (
  mentor_id IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY students_delete_mentor ON students FOR DELETE USING (
  mentor_id IN (SELECT rls_mentor_scope_ids())
);

-- Mentors (student-side and co-mentor policies)
DROP POLICY IF EXISTS mentors_select_student ON mentors;
DROP POLICY IF EXISTS mentors_select_class_members ON mentors;
DROP POLICY IF EXISTS mentors_insert_co_mentor ON mentors;
DROP POLICY IF EXISTS mentors_delete_co_mentor ON mentors;
DROP POLICY IF EXISTS mentors_select_class_owner ON mentors;

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

CREATE POLICY challenges_select_mentor ON challenges FOR SELECT USING (
  created_by IN (SELECT rls_mentor_scope_ids())
  OR created_by IN (SELECT rls_student_mentor_ids())
  OR created_by IN (
    SELECT m.created_by FROM mentors m
    WHERE m.id IN (SELECT rls_student_mentor_ids())
      AND m.created_by IS NOT NULL
  )
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
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (SELECT rls_mentor_scope_ids())
  )
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
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (SELECT rls_mentor_scope_ids())
  )
);
CREATE POLICY submissions_update_mentor ON challenge_submissions FOR UPDATE USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (SELECT rls_mentor_scope_ids())
  )
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
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (SELECT rls_mentor_scope_ids())
  )
);
CREATE POLICY homework_insert_mentor ON homework_assignments FOR INSERT WITH CHECK (
  assigned_by IN (SELECT rls_mentor_scope_ids())
);
CREATE POLICY homework_update_mentor ON homework_assignments FOR UPDATE USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (SELECT rls_mentor_scope_ids())
  )
);
CREATE POLICY homework_delete_mentor ON homework_assignments FOR DELETE USING (
  student_id IN (
    SELECT id FROM students WHERE mentor_id IN (SELECT rls_mentor_scope_ids())
  )
);

ANALYZE students;
ANALYZE mentors;
