-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge authorship: mentors own what they create
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ALREADY APPLIED, and PARTLY SUPERSEDED. This file now owns only
-- challenges_select_mentor and rls_class_challenge_reader_ids. The three write
-- policies and their scope function moved to
-- supabase-fix-challenge-write-scope.sql, which widened editing and deleting to
-- every mentor in the class; the superseded blocks below are commented out
-- rather than deleted so the reasoning that led there stays readable. Attribution
-- itself is unchanged — everything below about challengeCreatedBy() stamping the
-- real author still holds.
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
--
-- SUPERSEDED — do not reinstate. supabase-fix-challenge-write-scope.sql replaces
-- this function with rls_class_challenge_writer_ids() and DROPs it. Writes are
-- now scoped to class membership: any mentor in a class may edit and delete any
-- challenge in it, while INSERT is limited to your own mentor rows so authorship
-- cannot be forged. The scope below restricted a co-mentor to challenges they
-- personally authored, which stopped them fixing a typo in the owner's — the
-- wrong default for people who co-run a class.
--
-- CREATE OR REPLACE FUNCTION public.rls_challenge_author_ids()
-- RETURNS SETOF uuid
-- LANGUAGE sql
-- SECURITY DEFINER
-- SET search_path = public
-- STABLE
-- AS $$
--   SELECT id FROM mentors WHERE user_id = auth.uid()
--   UNION
--   SELECT co.id FROM mentors co
--    WHERE co.created_by IN (
--      SELECT id FROM mentors WHERE user_id = auth.uid() AND created_by IS NULL
--    );
-- $$;

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

-- SECURITY DEFINER so internal reads of `mentors` and `students` are not
-- themselves subject to RLS — the same shape as the existing helpers, and why
-- this cannot reintroduce the recursion supabase-fix-rls-recursion.sql was
-- written to fix. It is not referenced from a `mentors` policy.
REVOKE ALL ON FUNCTION public.rls_class_challenge_reader_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_class_challenge_reader_ids() TO authenticated;
-- The rls_challenge_author_ids grants that stood here are gone with the function.

-- ─── Policies ────────────────────────────────────────────────────────────────
-- The four policy NAMES are deliberately unchanged from supabase-setup.sql,
-- supabase-fix-rls-recursion.sql and supabase-performance-optimization.sql.
-- Postgres ORs permissive policies together, so introducing new names alongside
-- the old ones would silently restore the co-mentor write access this file
-- revokes. Same names means a stale re-run overwrites rather than layers.
-- The challenge blocks in those two older files are commented out for the same
-- reason.
--
-- This file owns challenges_select_mentor ONLY. The three write policies moved to
-- supabase-fix-challenge-write-scope.sql; their DROPs came out of the block below
-- so that re-running this file cannot leave the table with no write policies at
-- all, which would deny every mentor write until the other file was run again.
DROP POLICY IF EXISTS challenges_select_mentor ON challenges;

CREATE POLICY challenges_select_mentor ON challenges FOR SELECT USING (
  created_by IN (SELECT rls_class_challenge_reader_ids())
);

-- SUPERSEDED — do not reinstate. All three write policies now live in
-- supabase-fix-challenge-write-scope.sql, which widens UPDATE and DELETE to any
-- mentor in the class and narrows INSERT to rls_own_mentor_ids so authorship
-- cannot be forged. Same policy names, so running the block below would drop the
-- current versions and reinstate the narrow ones in place. The function it
-- references no longer exists, so this would also fail outright.
--
-- CREATE POLICY challenges_insert_mentor ON challenges FOR INSERT WITH CHECK (
--   created_by IN (SELECT rls_challenge_author_ids())
-- );
--
-- CREATE POLICY challenges_update_mentor ON challenges FOR UPDATE USING (
--   created_by IN (SELECT rls_challenge_author_ids())
-- );
--
-- CREATE POLICY challenges_delete_mentor ON challenges FOR DELETE USING (
--   created_by IN (SELECT rls_challenge_author_ids())
-- );

-- rls_student_class_owner_ids() is now unreferenced — it only ever fed the old
-- challenges_select_mentor, and its condition (m.created_by IS NOT NULL on a row
-- reached through students.mentor_id) could not match anyway, since students are
-- always attached to the class owner. Left defined rather than dropped so this
-- file stays reversible; safe to remove once this has settled.

-- ─── Verification ────────────────────────────────────────────────────────────
-- Only the read half is still this file's to verify. Run as a real user, not
-- service_role, which bypasses RLS:
--
--   -- a student sees co-mentor-authored challenges in their class
--   SELECT id, created_by FROM challenges;
--
-- The write expectations that stood here are obsolete: they asserted a co-mentor
-- could NOT edit the owner's challenge, which is now exactly what
-- supabase-fix-challenge-write-scope.sql allows. See that file's verification
-- block for the current expectations.
