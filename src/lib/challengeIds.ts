/** Built-in FTC challenges shipped with the grader (see src/data/challenges.ts). */
export const BUILTIN_CHALLENGE_MIN = 1;
export const BUILTIN_CHALLENGE_MAX = 53;

/** Mentor-authored challenges stored in Supabase (see classChallenges.ts). */
export const CUSTOM_CHALLENGE_MIN = 1000;

export function isValidGradeChallengeId(id: number): boolean {
  if (!Number.isInteger(id)) return false;
  if (id >= BUILTIN_CHALLENGE_MIN && id <= BUILTIN_CHALLENGE_MAX) return true;
  if (id >= CUSTOM_CHALLENGE_MIN) return true;
  return false;
}
