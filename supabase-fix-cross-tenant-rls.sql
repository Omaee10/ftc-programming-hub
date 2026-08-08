-- ─────────────────────────────────────────────────────────────────────────────
-- Fix cross-tenant RLS hole on `students`
--
-- Live policy set verified against pg_policies on 2026-08-07. Findings:
--
--   mentors_select_class_code  ALREADY DROPPED in production. The repo's .sql
--                              files had drifted and still described it as live.
--                              Section 1 below is a no-op safety net so a fresh
--                              environment or a restore can never reintroduce it.
--
--   students_insert_own        LIVE. WITH CHECK ((select auth.uid()) = user_id)
--   students_update_own        LIVE. USING ((select auth.uid()) = user_id),
--                              with_check NULL -> Postgres reuses USING as the
--                              check. Neither constrains mentor_id.
--
-- Every statement is idempotent and safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 1. mentors: no-op on production, guard for fresh environments ───────────
--
-- Confirmed absent from the live database. supabase-setup.sql used to recreate
-- it, so any fresh setup or restore would have reintroduced the leak — that
-- definition is now commented out at its original location. This DROP stays as
-- belt-and-braces for environments provisioned from an older copy of the file.

DROP POLICY IF EXISTS mentors_select_class_code ON mentors;


-- ─── 2. students: stop self-service enrolment into arbitrary classes ─────────
--
-- Both policies gate only on user_id and never constrain mentor_id, so a signed-
-- in user can insert or update a students row to attach themselves to any class
-- whose mentor UUID they know — bypassing the class-code check in joinClass.ts
-- and the "mentors can't join their own class" guard.

-- 2a. INSERT: no client path needs this policy. Verified write paths:
--       * student joins a class   -> /api/auth/join-class, service role (RLS bypassed)
--       * signup with student code -> service role UPDATE of user_id, not INSERT
--       * mentor adds a student    -> students_insert_mentor
--     Dropping it removes the self-enrolment path entirely.
DROP POLICY IF EXISTS students_insert_own ON students;

-- 2b. UPDATE: students_update_own MUST stay. src/app/account/page.tsx:151 relies
--     on it so a student can rename themselves:
--         supabase.from("students").update({ name }).eq("user_id", userId)
--     Dropping it would break account renames.
--
--     Expressing "mentor_id may not change" inside the policy needs a self-join
--     in WITH CHECK, which reads a pre-update snapshot under READ COMMITTED and
--     is fragile. Column privileges are the right tool: RLS keeps scoping WHICH
--     ROWS, the grant scopes WHICH COLUMNS. `name` is the only column a student
--     ever updates, so mentor_id (and code) become untouchable from the client.
REVOKE UPDATE ON students FROM anon, authenticated;
GRANT  UPDATE (name) ON students TO authenticated;

-- students_update_own is deliberately left in place, unchanged, as the row filter:
--   FOR UPDATE USING ((select auth.uid()) = user_id)


-- ─── 3. Post-change verification ─────────────────────────────────────────────
--
-- Expect on `students`: insert_mentor, select_mentor, select_own, update_own,
-- delete_mentor. students_insert_own gone. On `mentors`: no select_class_code.

--   SELECT tablename, policyname, cmd, roles
--     FROM pg_policies
--    WHERE tablename IN ('mentors','students')
--    ORDER BY tablename, cmd, policyname;

-- Expect exactly one row: authenticated / UPDATE / name.

--   SELECT grantee, privilege_type, column_name
--     FROM information_schema.column_privileges
--    WHERE table_name = 'students'
--      AND grantee IN ('anon','authenticated')
--      AND privilege_type = 'UPDATE'
--    ORDER BY grantee, column_name;
