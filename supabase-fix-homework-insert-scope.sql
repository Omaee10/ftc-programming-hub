-- ─────────────────────────────────────────────────────────────────────────────
-- homework_insert_mentor: scope the target student, not just the assigner
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The INSERT policy only ever checked WHO was assigning:
--
--   CREATE POLICY homework_insert_mentor ON homework_assignments FOR INSERT
--   WITH CHECK (assigned_by IN (SELECT rls_mentor_scope_ids()));
--
-- Every sibling policy scopes the TARGET as well — select, update and delete all
-- gate on student_id IN (SELECT rls_mentor_scope_student_ids()). Insert was the
-- one that did not, so any mentor could write a homework row for a student in
-- someone else's class, as long as assigned_by was their own mentor id.
--
-- Exploitability is limited: the attacker needs the victim student's UUID, which
-- is not exposed to them, and homework_select_mentor stops them reading the row
-- back. But the write lands, and the victim sees homework in their list that
-- nobody in their class assigned — with a due date and a challenge they were
-- never given. There is no cross-tenant read here, only a cross-tenant write.
--
-- Adding the student scope makes INSERT agree with the other three. A mentor may
-- now only assign homework to students in classes they mentor, which is what the
-- application has always done anyway: the assign flow in the mentor dashboard
-- builds its student list from the class roster, so no legitimate call changes
-- behaviour.
--
-- Policy NAME is unchanged, deliberately. Postgres ORs permissive policies
-- together, so a second insert policy under a new name would leave the
-- unscoped one live and change nothing. Same name means a stale re-run of
-- supabase-setup.sql / supabase-fix-rls-recursion.sql /
-- supabase-performance-optimization.sql overwrites rather than layers — and the
-- homework blocks in the latter two are commented out for that reason.

DROP POLICY IF EXISTS homework_insert_mentor ON homework_assignments;

CREATE POLICY homework_insert_mentor ON homework_assignments FOR INSERT WITH CHECK (
  assigned_by IN (SELECT rls_mentor_scope_ids())
  AND student_id IN (SELECT rls_mentor_scope_student_ids())
);

-- ─── Verification ────────────────────────────────────────────────────────────
-- Before and after, the five homework policies and their expressions:
--
--   SELECT policyname, cmd, qual, with_check
--     FROM pg_policies
--    WHERE tablename = 'homework_assignments'
--    ORDER BY cmd, policyname;
--
-- Expect exactly five rows, with homework_insert_mentor's with_check naming BOTH
-- rls_mentor_scope_ids and rls_mentor_scope_student_ids. More than five, or an
-- insert policy that mentions only assigned_by, means an older file layered or
-- overwrote this one.
--
-- Then confirm a legitimate assignment still works, as a mentor (not
-- service_role): assign a challenge to a student in your own class from the
-- mentor dashboard's Homework tab and check the row appears for that student.
