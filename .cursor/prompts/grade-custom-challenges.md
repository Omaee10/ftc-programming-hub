# Feature: Manual Grading for Mentor-Created Challenges

## Context

This is an FTC (FIRST Tech Challenge) programming education platform built with Next.js (App Router) and Supabase. Read `node_modules/next/dist/docs/` for any Next.js API questions before writing code.

The app has:
- **53 static challenges** in `src/data/challenges.ts` (IDs 1–53) — these are auto-graded by `src/lib/codeValidator.ts`
- **Mentor-created challenges** stored in the Supabase `challenges` table with a non-null `created_by` UUID — these have NO automated grading because `codeValidator.ts` has no rules for them
- Students write Java code in a Monaco editor (`src/components/ChallengeWorkspace.tsx`) and their progress is saved to `student_challenge_progress`
- The mentor dashboard is at `src/app/mentor/dashboard/page.tsx` and has four tabs: Student Progress, Manage Mentors, Manage Students, Create Challenge

**Current gap:** When a student works on a mentor-created challenge, they can save their code but there's no way to submit it for review, and the mentor has no dedicated grading UI.

---

## What to Build

### 1. New Supabase Table — `challenge_submissions`

Add to `supabase-setup.sql`:

```sql
CREATE TABLE IF NOT EXISTS challenge_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id integer NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  code_snapshot text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  status       text NOT NULL DEFAULT 'pending',   -- 'pending' | 'graded'
  grade        text,                               -- 'pass' | 'needs-work' | 'redo'
  feedback     text,
  graded_at    timestamptz,
  graded_by    uuid REFERENCES mentors(id) ON DELETE SET NULL,
  UNIQUE (student_id, challenge_id)               -- one active submission per student per challenge
);

ALTER TABLE challenge_submissions DISABLE ROW LEVEL SECURITY;
```

Also add a migration comment block for existing databases (same style as the existing `mentor_id` migration comment already in the file).

### 2. Update `src/lib/supabase.ts` — Add `SubmissionRow` type

```ts
export interface SubmissionRow {
  id: string;
  student_id: string;
  challenge_id: number;
  code_snapshot: string;
  submitted_at: string;
  status: "pending" | "graded";
  grade: "pass" | "needs-work" | "redo" | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
}
```

### 3. Student Side — "Submit for Review" Button in `ChallengeWorkspace`

In `src/components/ChallengeWorkspace.tsx`:

- Detect whether the current challenge is mentor-created by checking if the challenge's `id` is NOT found in the static `challenges` array imported from `src/data/challenges.ts` (i.e., `!staticChallenges.find(c => c.id === challenge.id)`). Alternatively, if the `ChallengeWorkspace` already receives a `createdBy` prop, use that.
- If the challenge IS mentor-created and the student has an active session (`getSession()` returns a student role), show a **"Submit for Review"** button in the editor toolbar alongside the existing Run button.
- The button should be disabled if `code_snapshot` is empty or if the submission `status` is already `"graded"` (show "Submitted ✓" in that case).
- On click: upsert into `challenge_submissions`:
  ```ts
  await supabase.from("challenge_submissions").upsert({
    student_id: session.id,
    challenge_id: challenge.id,
    code_snapshot: currentCode,
    status: "pending",
    grade: null,
    feedback: null,
    graded_at: null,
    graded_by: null,
  }, { onConflict: "student_id,challenge_id" });
  ```
- Show a brief success toast/banner: "Submitted for mentor review!" and disable the button until the mentor grades it.
- Load existing submission on mount to reflect current status (pending/graded).

### 4. Mentor Side — New "Grade Submissions" Tab

In `src/app/mentor/dashboard/page.tsx`:

#### 4a. Add the tab

- Add `"grade"` to the `Tab` type union.
- Add a new `TabButton` with a `ClipboardCheck` icon (from lucide-react) and label `"Grade Submissions"`.
- Show a **badge** on the tab button with the count of pending submissions scoped to this mentor's students. Fetch this count on page mount. The badge should use an amber background, disappear when count is 0.

#### 4b. New `GradeSubmissionsTab` component

Create this as a new function component in the same file (before the `MentorDashboardPage` default export):

**Data loading:**
- On mount, fetch:
  1. `students` scoped to `mentor_id = session.id`
  2. All `challenge_submissions` where `student_id` is in that student list — join with student name and challenge title by fetching `challenges` too
  3. Merge challenge titles from both static challenges and DB challenges (same pattern as `ProgressTab`)
- Separate into two sections: **Pending** (status = 'pending') and **Previously Graded** (status = 'graded')

**UI layout:**

```
─ Pending Reviews (N)  ────────────────────────────────
  [submission card]
  [submission card]

─ Previously Graded ───────────────────────────────────
  [graded card]
  [graded card]
```

**Pending submission card:**
- Student avatar (first letter, same style as ProgressTab)
- Student name + challenge title + submitted timestamp ("2 hours ago" style using `Date` diff)
- Collapsed by default; click to expand
- Expanded view shows:
  - The submitted code in a `<pre>` block with monospace font (same dark styling as the existing code snapshot display in ProgressTab)
  - A `<select>` for grade: "Pass", "Needs Work", "Redo" (values: `pass`, `needs-work`, `redo`)
  - A `<textarea>` for feedback (placeholder: "Write feedback for the student…", min 3 rows)
  - A "Submit Grade" button (amber, disabled while saving)
- On submit: update `challenge_submissions` set `status = 'graded'`, `grade`, `feedback`, `graded_at = new Date().toISOString()`, `graded_by = session.id`; then reload the data

**Graded card:**
- Collapsed list showing student name, challenge title, grade badge (green for pass, yellow for needs-work, red for redo), and graded date
- Can expand to re-read feedback and code but cannot re-grade (read-only)

### 5. Student Feedback View

In the challenge workspace or on the challenges list page, when a student has a graded submission for a mentor-created challenge:
- Show a **"Mentor Feedback"** banner/card below the editor (or in a collapsible section)
- Display: grade badge + feedback text + "Graded by your mentor"
- Load this on workspace mount by querying `challenge_submissions` where `student_id = session.id AND challenge_id = challenge.id`

---

## Style Conventions (match existing code exactly)

- Dark theme: `bg-slate-900`, `border-slate-800`, text `text-slate-200 / slate-400 / slate-500`
- Accent: `amber-500` / `amber-400` for primary actions
- Danger: `red-500/10` bg with `red-400` text
- Success: `emerald-500/10` bg with `emerald-300` text
- All cards: `rounded-xl border border-slate-800 bg-slate-900`
- All inputs: `rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30`
- Loading spinners: `<Loader2 className="h-5 w-5 animate-spin text-amber-400" />`
- Use lucide-react icons only — check what's already imported before adding new ones

## Files to Modify

1. `supabase-setup.sql` — add `challenge_submissions` table + migration comment
2. `src/lib/supabase.ts` — add `SubmissionRow` type
3. `src/components/ChallengeWorkspace.tsx` — add Submit for Review button (mentor-created challenges only, student session only)
4. `src/app/mentor/dashboard/page.tsx` — add Grade tab + `GradeSubmissionsTab` component

Do NOT create new files unless absolutely necessary. Do NOT modify the static challenge data or `codeValidator.ts`.

## Do Not Break

- Existing auto-grading for static challenges (IDs 1–53) must still work exactly as before
- The `student_challenge_progress` table and existing progress hooks are untouched
- Mentor-created challenge detection must use the same ID comparison already used in `ProgressTab` (static IDs 1–53 via the imported `challenges` array)
