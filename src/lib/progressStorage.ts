/**
 * localStorage layout for challenge progress.
 *
 * Deliberately dependency-free: both `@/lib/auth` (which migrates progress when
 * a session's identity changes) and `@/hooks/useChallengeProgress` (which layers
 * a reactive cache on top) import from here. Putting these helpers in the hook
 * instead would make auth → hook → auth a circular import.
 */

export const PROGRESS_BASE_KEY = "ftc-hub-challenge-progress-v1";

/** Map of challenge id → completion ISO timestamp */
export type ProgressMap = Record<number, string>;

export function studentStorageKey(studentId: string): string {
  return `${PROGRESS_BASE_KEY}:${studentId}`;
}

export function readLocalProgress(studentId: string): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(studentStorageKey(studentId)) ?? "{}";
    const parsed = JSON.parse(raw) as Record<string, string>;
    const map: ProgressMap = {};
    for (const [idStr, ts] of Object.entries(parsed)) {
      map[Number(idStr)] = ts;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Merge `additions` into `studentId`'s progress without overwriting completions
 * already recorded there. Returns true when something actually changed, so
 * callers can skip notifying subscribers on a no-op.
 */
export function mergeIntoLocalProgress(
  studentId: string,
  additions: ProgressMap
): boolean {
  if (typeof window === "undefined") return false;
  const current = readLocalProgress(studentId);
  const next: ProgressMap = { ...current };
  let changed = false;
  for (const [id, ts] of Object.entries(additions)) {
    const numId = Number(id);
    if (!(numId in next)) {
      next[numId] = ts;
      changed = true;
    }
  }
  if (!changed) return false;
  try {
    localStorage.setItem(studentStorageKey(studentId), JSON.stringify(next));
    return true;
  } catch {
    // Ignore quota / private-browsing errors
    return false;
  }
}
