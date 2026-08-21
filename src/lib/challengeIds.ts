import { builtinChallengeMeta } from "@/data/challengeMeta";

/**
 * Built-in FTC challenge id bounds, derived from the challenge catalog itself
 * (see src/data/challenges.ts, mirrored card-side in src/data/challengeMeta.ts).
 *
 * Derived rather than hardcoded: a literal ceiling goes stale the moment a
 * challenge is added, and the only symptom is a student getting
 * "Invalid challengeId." at submit time on the newest challenge.
 *
 * challengeMeta only imports types, so this stays out of the heavy starter-code
 * bundle in challenges.ts.
 */
export const BUILTIN_CHALLENGE_MIN = builtinChallengeMeta.reduce(
  (min, c) => (c.id < min ? c.id : min),
  Number.POSITIVE_INFINITY
);
export const BUILTIN_CHALLENGE_MAX = builtinChallengeMeta.reduce(
  (max, c) => (c.id > max ? c.id : max),
  Number.NEGATIVE_INFINITY
);

/** Mentor-authored challenges stored in Supabase (see classChallenges.ts). */
export const CUSTOM_CHALLENGE_MIN = 1000;

export function isValidGradeChallengeId(id: number): boolean {
  if (!Number.isInteger(id)) return false;
  if (id >= BUILTIN_CHALLENGE_MIN && id <= BUILTIN_CHALLENGE_MAX) return true;
  if (id >= CUSTOM_CHALLENGE_MIN) return true;
  return false;
}
