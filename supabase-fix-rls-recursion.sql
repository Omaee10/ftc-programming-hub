-- ─────────────────────────────────────────────────────────────────────────────
-- FTC Programming Hub — Fix RLS infinite recursion (students ↔ mentors)
-- Run this entire file in the Supabase SQL Editor. Safe to run multiple times.
--
-- Problem: RLS policies on mentors and students cross-reference each other via
-- inline subqueries (e.g. SELECT id FROM mentors WHERE user_id = auth.uid()).
-- PostgreSQL re-applies RLS inside those subqueries, causing infinite recursion
-- on INSERT … RETURNING (create-class), enrollment listing, and mentor queries.
--
-- Fix: SECURITY DEFINER helper functions bypass RLS for cross-table lookups.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Helper functions (SECURITY DEFINER — bypass RLS for lookups) ────────────

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

-- Class-owner mentor ids reachable from the current user's student enrollments
CREATE OR REPLACE FUNCTION public.rls_student_class_owner_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.created_by
  FROM students s
  INNER JOIN mentors m ON m.id = s.mentor_id
  WHERE s.user_id = auth.uid()
    AND m.created_by IS NOT NULL;
$$;

-- Student ids in classes owned/co-mentored by the current user
CREATE OR REPLACE FUNCTION public.rls_mentor_scope_student_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.id
  FROM students s
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

-- ─── Profiles (no cross-table recursion; use initplan form) ──────────────────

DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;

CREATE POLICY profiles_select_own ON profiles FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING ((select auth.uid()) = id);

-- ─── Students ────────────────────────────────────────────────────────────────

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

-- ─── Mentors ─────────────────────────────────────────────────────────────────
-- mentors_select_own / mentors_insert_own satisfy create-class (INSERT + RETURNING).
-- Co-mentor / student-side SELECT policies must not inline-query mentors or students.

DROP POLICY IF EXISTS mentors_select_own ON mentors;
DROP POLICY IF EXISTS mentors_insert_own ON mentors;
DROP POLICY IF EXISTS mentors_update_own ON mentors;
DROP POLICY IF EXISTS mentors_select_student ON mentors;
DROP POLICY IF EXISTS mentors_select_class_members ON mentors;
DROP POLICY IF EXISTS mentors_insert_co_mentor ON mentors;
DROP POLICY IF EXISTS mentors_delete_co_mentor ON mentors;
DROP POLICY IF EXISTS mentors_select_class_owner ON mentors;
-- mentors_select_class_code unchanged (no auth / cross-table subqueries)

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

-- ─── Challenges ──────────────────────────────────────────────────────────────

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

-- ─── Progress ────────────────────────────────────────────────────────────────

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

-- ─── Submissions ─────────────────────────────────────────────────────────────

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

-- ─── Homework ────────────────────────────────────────────────────────────────

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

ANALYZE students;
ANALYZE mentors;
ANALYZE challenges;
ANALYZE student_challenge_progress;
ANALYZE challenge_submissions;
ANALYZE homework_assignments;
