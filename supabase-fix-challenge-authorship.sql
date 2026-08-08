-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge authorship: mentors own what they create
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Until now `challengeCreatedBy()` stamped every custom challenge with the CLASS
-- OWNER's mentor id, whoever actually wrote it. Three other places were written
-- as though co-mentor-authored challenges exist — classChallengeAuthorIds(),
-- leaveClass.ts and delete-member/route.ts all handle them — so the codebase
-- supported a model it never produced. The client now stamps the creating
-- mentor's own row id, and these policies make the database agree.
--
-- What rls_mentor_scope_ids() permits today, and why it cannot stay:
--
--   Owner      -> {own id}              (their created_by IS NULL, so the second
--                                        UNION arm of that function is empty)
--   Co-mentor  -> {own id, owner id}
--   Student    -> {owner id}            (via rls_student_mentor_ids)
--
-- Both halves of that are wrong for real authorship. The OWNER cannot touch a
-- co-mentor's challenge even though they own the class, while a CO-MENTOR can
-- edit and delete the owner's. And a STUDENT cannot read a co-mentor's challenge
-- at all — which matters because two read paths bypass the API and hit RLS
-- directly (homework/[id]/page.tsx and HomeworkWorkspace.tsx). Without this
-- migration, homework on a co-mentor's challenge renders a permanent spinner.
--
-- Verified before writing this (2026-08-08): 0 challenges are co-mentor-authored,
-- so no data migration is required. 10 co-mentor rows exist, which is why the
-- application deploy should follow this file promptly — see the note on the
-- INSERT policy below.
--
-- rls_mentor_scope_ids() is UNCHANGED and still correct for students, progress,
-- submissions and homework. Only the `challenges` policies move off it.

-- ─── Write scope ─────────────────────────────────────────────────────────────
-- Mentor ids whose challenges the current user may INSERT, UPDATE or DELETE:
-- their own mentor rows, plus every co-mentor of a class they OWN.
--
--   Owner      -> {own id} + {every co-mentor of their class}
--   Co-mentor  -> {own id}   (they own no class, so the second arm is empty)
--
-- The co-mentor case is a deliberate REVOCATION: rls_mentor_scope_ids() included
-- the owner's id, so co-mentors could edit and delete the owner's challenges.
-- Nothing exercises it — the UI only ever wrote owner-attributed rows — but it
-- is not access worth keeping by accident.
CREATE OR REPLACE FUNCTION public.rls_challenge_author_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM mentors WHERE user_id = auth.uid()
  UNION
  SELECT co.id FROM mentors co
   WHERE co.created_by IN (
     SELECT id FROM mentors WHERE user_id = auth.uid() AND created_by IS NULL
   );
$$;

-- ─── Read scope ──────────────────────────────────────────────────────────────
-- Mentor ids whose challenges the current user may SELECT: every mentor in every
-- class they belong to, as owner, co-mentor or student. A class challenge is
-- visible to the whole class regardless of which mentor wrote it.
--
-- This replaces the three-clause OR on the old select policy. The student arm is
-- what unblocks the two RLS-backed homework reads: students.mentor_id always
-- points at the OWNER (see joinClass), so the previous scope of {owner id} made
-- a co-mentor's challenge unreadable. Solo students match no class and read
-- nothing here, unchanged.
CREATE OR REPLACE FUNCTION public.rls_class_challenge_reader_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH my_class_owners AS (
    SELECT COALESCE(created_by, id) AS owner_id
      FROM mentors
     WHERE user_id = auth.uid()
    UNION
    SELECT s.mentor_id AS owner_id
      FROM students s
     WHERE s.user_id = auth.uid() AND s.mentor_id IS NOT NULL
  )
  SELECT owner_id FROM my_class_owners
  UNION
  SELECT m.id
    FROM mentors m
   INNER JOIN my_class_owners c ON m.created_by = c.owner_id;
$$;

-- Both are SECURITY DEFINER so their internal reads of `mentors` and `students`
-- are not themselves subject to RLS — the same shape as the existing helpers,
-- and why they cannot reintroduce the recursion supabase-fix-rls-recursion.sql
-- was written to fix. Neither is referenced from a `mentors` policy.
REVOKE ALL ON FUNCTION public.rls_challenge_author_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_class_challenge_reader_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_challenge_author_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_class_challenge_reader_ids() TO authenticated;

-- ─── Policies ────────────────────────────────────────────────────────────────
-- The four policy NAMES are deliberately unchanged from supabase-setup.sql,
-- supabase-fix-rls-recursion.sql and supabase-performance-optimization.sql.
-- Postgres ORs permissive policies together, so introducing new names alongside
-- the old ones would silently restore the co-mentor write access this file
-- revokes. Same names means a stale re-run overwrites rather than layers.
-- The challenge blocks in those two older files are commented out for the same
-- reason; this file is the one source of truth for `challenges` policies.
DROP POLICY IF EXISTS challenges_select_mentor ON challenges;
DROP POLICY IF EXISTS challenges_insert_mentor ON challenges;
DROP POLICY IF EXISTS challenges_update_mentor ON challenges;
DROP POLICY IF EXISTS challenges_delete_mentor ON challenges;

CREATE POLICY challenges_select_mentor ON challenges FOR SELECT USING (
  created_by IN (SELECT rls_class_challenge_reader_ids())
);

-- NOTE ON DEPLOY ORDER: this is the one policy that is stricter than the client
-- shipping today. The old MentorChallengeEditor inserts with
-- created_by = <owner id>, which is no longer in a co-mentor's write scope — so
-- between running this file and deploying the matching code, a co-mentor
-- creating a challenge gets a policy violation. Owners are unaffected. With 10
-- co-mentors and no co-mentor-authored challenges on record the window is very
-- unlikely to be hit, but keep it short.
CREATE POLICY challenges_insert_mentor ON challenges FOR INSERT WITH CHECK (
  created_by IN (SELECT rls_challenge_author_ids())
);

-- No WITH CHECK: Postgres reuses USING for the post-update row when it is
-- omitted, which is what we want. An owner may reassign a challenge to any
-- author in their own scope (that is what leaveClass and delete-member do), and
-- may not move one outside it.
CREATE POLICY challenges_update_mentor ON challenges FOR UPDATE USING (
  created_by IN (SELECT rls_challenge_author_ids())
);

CREATE POLICY challenges_delete_mentor ON challenges FOR DELETE USING (
  created_by IN (SELECT rls_challenge_author_ids())
);

-- rls_student_class_owner_ids() is now unreferenced — it only ever fed the old
-- challenges_select_mentor, and its condition (m.created_by IS NOT NULL on a row
-- reached through students.mentor_id) could not match anyway, since students are
-- always attached to the class owner. Left defined rather than dropped so this
-- file stays reversible; safe to remove once this has settled.

-- ─── Verification ────────────────────────────────────────────────────────────
-- Run as the mentor/student in question (not service_role, which bypasses RLS):
--
--   -- co-mentor sees their own challenge and the owner's, cannot write the owner's
--   SELECT id, created_by FROM challenges;
--   UPDATE challenges SET xp = xp WHERE created_by = '<owner id>';   -- expect 0 rows
--
--   -- owner sees and can write every challenge in the class
--   UPDATE challenges SET xp = xp WHERE created_by = '<co-mentor id>'; -- expect >0
--
--   -- student sees co-mentor-authored challenges in their class
--   SELECT id, created_by FROM challenges;
--
-- Confirm exactly four policies exist afterwards:
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'challenges';
