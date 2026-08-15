/**
 * Auth behaviour switches shared across the auth routes.
 *
 * Deliberately its own module with a single export: the confirmation switch is
 * read by both the signup route and the resend route, and two copies of a
 * boolean that must agree is exactly the sort of thing that silently stops
 * agreeing. Import it; do not redeclare it.
 */

/**
 * Require users to click an emailed confirmation link before they can sign in.
 *
 * Currently OFF, and turning it on is a bigger decision than it looks.
 *
 * It was on until 2026-08-01, when a class of students signed up together
 * minutes after their mentor created the class. The confirmation mail was slow
 * or went to spam; the post-signup screen said "check your email, then sign in"
 * and offered nothing else; and one after another they concluded it had not
 * worked and signed up again with different addresses. Five people ended up
 * holding eleven accounts, and the four who retried lost between twenty minutes
 * and two days getting into a class whose code was working the whole time. The
 * one student who happened to check his inbox within seventeen seconds got
 * straight in.
 *
 * Flipping this back to true is supported — the surrounding flow now has a
 * resend button, spam-folder guidance, and a class code field on the signup form
 * so enrollment is committed before confirmation rather than after it. But it
 * also depends on a setting outside this repository: "Confirm email" under
 * Authentication -> Providers -> Email in the Supabase dashboard. That toggle
 * can re-enable confirmation on its own, with no code change, and reproduce the
 * incident. Keep the two in step.
 */
export const REQUIRE_EMAIL_CONFIRMATION = false;
