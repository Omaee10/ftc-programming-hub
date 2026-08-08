-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge writes: any mentor in the class may edit and delete
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Widens UPDATE and DELETE from "challenges you authored" to "any challenge in a
-- class you mentor", and narrows INSERT to your own mentor rows.
--
-- supabase-fix-challenge-authorship.sql scoped all three writes to
-- rls_challenge_author_ids(): own rows, plus co-mentors for a class owner. That
-- made a co-mentor unable to fix a typo in the owner's challenge, or in another
-- co-mentor's, which is the wrong default for people who co-run a class. Mentors
-- in a class are mutually trusted; the restriction bought nothing.
--
-- Attribution is UNCHANGED. challengeCreatedBy() still stamps the creating
-- mentor's own id, so challenges.created_by still records who actually wrote a
-- challenge — it simply stops being the permission boundary for editing it.
--
-- INSERT moves the other way, to rls_own_mentor_ids(). The old author scope let a
-- class owner insert with created_by set to a co-mentor's id, forging authorship
-- for someone who never wrote the challenge; widening it class-wide would have
-- handed that to every mentor. "All mentors can edit" is about existing
-- challenges, not about creating them in a colleague's name, so this closes a gap
-- rather than widening one. No legitimate call changes: MentorChallengeEditor
-- always inserts with the caller's own session id.
--
-- SELECT is untouched. rls_class_challenge_reader_ids() already covers every
-- mentor in the class plus its students, which is the intended read scope.

-- ─── Write scope ─────────────────────────────────────────────────────────────
-- Every mentor id in every class the current user MENTORS, as owner or
-- co-mentor:
--
--   Owner      -> {own id} + {every co-mentor of their class}
--   Co-mentor  -> {the owner's id} + {every co-mentor, including themselves}
--
-- Renamed from rls_challenge_author_ids because this is no longer an authorship
-- set — it is class membership — and the old name would read as a guarantee it
-- no longer makes. Pairs with rls_class_challenge_reader_ids.
--
-- NOTE the deliberate difference from that reader function, which is why the two
-- cannot be collapsed even though they agree for most users: the reader scope has
-- a second arm sourced from `students`, so a user who mentors class A AND is
-- enrolled as a student in class B reads the challenges of both. Writing must
-- stay limited to A. Nothing stops a mentor joining someone else's class as a
-- student (joinClassByCode only blocks joining a class you already mentor), so
-- merging these would be a live cross-tenant escalation, not a theoretical one.
CREATE OR REPLACE FUNCTION public.rls_class_challenge_writer_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH my_mentor_classes AS (
    SELECT COALESCE(created_by, id) AS owner_id
      FROM mentors
     WHERE user_id = auth.uid()
  )
  SELECT owner_id FROM my_mentor_classes
  UNION
  SELECT m.id
    FROM mentors m
   INNER JOIN my_mentor_classes c ON m.created_by = c.owner_id;
$$;

REVOKE ALL ON FUNCTION public.rls_class_challenge_writer_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_class_challenge_writer_ids() TO authenticated;

-- ─── Policies ────────────────────────────────────────────────────────────────
-- Policy NAMES are unchanged, same discipline as the two migrations before this
-- one: Postgres ORs permissive policies together, so a new name alongside the old
-- would leave the narrow policy live and change nothing. Same names means a stale
-- re-run overwrites rather than layers.
--
-- The three policies are dropped before the function they reference — Postgres
-- refuses to drop a function a policy depends on, and DROP ... CASCADE would take
-- the policies with it silently.
DROP POLICY IF EXISTS challenges_insert_mentor ON challenges;
DROP POLICY IF EXISTS challenges_update_mentor ON challenges;
DROP POLICY IF EXISTS challenges_delete_mentor ON challenges;

DROP FUNCTION IF EXISTS public.rls_challenge_author_ids();

-- Your own mentor rows only. rls_own_mentor_ids is defined in
-- supabase-fix-rls-recursion.sql and unchanged by this file.
CREATE POLICY challenges_insert_mentor ON challenges FOR INSERT WITH CHECK (
  created_by IN (SELECT rls_own_mentor_ids())
);

-- No WITH CHECK, so Postgres reuses USING for the post-update row. One
-- consequence worth recording: a class mentor can now change a challenge's
-- created_by to any other mentor in the same class, i.e. reassign attribution.
-- Nothing in the app does — MentorChallengeEditor's payload omits created_by —
-- and RLS cannot express "this column may not change" anyway, since WITH CHECK
-- only sees the new row. The service-role reassignment in leaveClass and
-- delete-member bypasses RLS entirely and is unaffected either way.
CREATE POLICY challenges_update_mentor ON challenges FOR UPDATE USING (
  created_by IN (SELECT rls_class_challenge_writer_ids())
);

CREATE POLICY challenges_delete_mentor ON challenges FOR DELETE USING (
  created_by IN (SELECT rls_class_challenge_writer_ids())
);

-- The reassignment in leaveClass.ts and delete-member/route.ts still matters, for
-- a different reason than before. It used to move write access to the owner; now
-- every class mentor already has it. What has not changed is that
-- challenges.created_by is ON DELETE SET NULL, and `created_by IN (...)` is never
-- true for NULL — so a challenge left unreassigned when its author's mentor row
-- is deleted matches no policy at all and becomes invisible and unwritable to
-- everyone, including the class owner. Keep both reassignments.

-- ─── Verification ────────────────────────────────────────────────────────────
-- Four policies, and the two remaining scope functions:
--
--   SELECT policyname, cmd, qual, with_check
--     FROM pg_policies WHERE tablename = 'challenges' ORDER BY cmd, policyname;
--
--   SELECT proname FROM pg_proc
--    WHERE proname LIKE 'rls_%challenge%' ORDER BY proname;
--
-- Expect exactly four policies; insert naming rls_own_mentor_ids, update and
-- delete naming rls_class_challenge_writer_ids, select still naming
-- rls_class_challenge_reader_ids. Expect exactly two functions — reader and
-- writer — with rls_challenge_author_ids gone.
--
-- Then, as real users rather than service_role:
--   -- co-mentor can now edit the owner's challenge (0 rows before this file)
--   UPDATE challenges SET xp = xp WHERE created_by = '<owner id>';
--   -- and another co-mentor's
--   UPDATE challenges SET xp = xp WHERE created_by = '<other co-mentor id>';
--   -- but still cannot insert in someone else's name (expect a policy violation)
--   INSERT INTO challenges (title, created_by, ...) VALUES ('x', '<owner id>', ...);
--
-- Unrelated but worth checking while you are in here — past co-mentor removals
-- may have orphaned challenges before the reassignment paths went live:
--   SELECT count(*) FROM challenges WHERE created_by IS NULL;
-- Non-zero means challenges invisible to their class, recoverable by setting
-- created_by to the class owner.
