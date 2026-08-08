/**
 * localStorage layout for per-challenge editor drafts.
 *
 * Deliberately dependency-free, for the same reason as `@/lib/progressStorage`:
 * both `@/lib/auth` (which migrates drafts when a session's identity changes)
 * and the per-mode draft modules (`challengeCodeDrafts`, `challengeBlockDrafts`)
 * import from here. Having auth import those modules instead would make
 * auth → drafts → auth a circular import, since they read `getSession()` to
 * resolve the active owner.
 *
 * Drafts are keyed by session id, exactly like progress: a solo session's id is
 * the auth user id, a class session's is the `students` row id.
 */

export const CODE_DRAFT_BASE_KEY = "ftc-hub-challenge-code-v1";
export const BLOCK_DRAFT_BASE_KEY = "ftc-hub-challenge-blocks-v1";

/** Owner id used when no session is active. */
export const GUEST_DRAFT_OWNER = "guest";

/** Map of challenge id (as string) → draft. */
export type DraftMap<T> = Record<string, T>;

export function draftStorageKey(baseKey: string, ownerId: string): string {
  return `${baseKey}:${ownerId}`;
}

export function readDraftMap<T>(baseKey: string, ownerId: string): DraftMap<T> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(
      localStorage.getItem(draftStorageKey(baseKey, ownerId)) ?? "{}"
    ) as DraftMap<T>;
  } catch {
    return {};
  }
}

export function writeDraftMap<T>(
  baseKey: string,
  ownerId: string,
  map: DraftMap<T>
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftStorageKey(baseKey, ownerId), JSON.stringify(map));
  } catch {
    // Ignore quota / private-browsing errors
  }
}

/**
 * Merge `additions` into `ownerId`'s drafts without overwriting drafts already
 * stored there. Mirrors mergeIntoLocalProgress: returns true when something
 * actually changed, so callers can skip work on a no-op.
 *
 * Not-overwriting matters on a re-join — a student who left a class and came
 * back should keep whatever they wrote most recently under the class id rather
 * than have it replaced by an older solo draft.
 */
export function mergeIntoDraftMap<T>(
  baseKey: string,
  ownerId: string,
  additions: DraftMap<T>
): boolean {
  if (typeof window === "undefined") return false;
  const entries = Object.entries(additions);
  if (entries.length === 0) return false;

  const current = readDraftMap<T>(baseKey, ownerId);
  const next: DraftMap<T> = { ...current };
  let changed = false;
  for (const [challengeId, draft] of entries) {
    if (!(challengeId in next)) {
      next[challengeId] = draft;
      changed = true;
    }
  }
  if (!changed) return false;

  writeDraftMap(baseKey, ownerId, next);
  return true;
}
