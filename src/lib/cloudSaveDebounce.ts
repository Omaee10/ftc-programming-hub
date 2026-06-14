/** Delay before upserting editor drafts to `student_challenge_progress` (ms). */
export const PROGRESS_UPSERT_DEBOUNCE_MS = 30_000;

type PendingUpsert = {
  timer: ReturnType<typeof setTimeout>;
  run: () => Promise<void>;
};

const pendingUpserts = new Map<string, PendingUpsert>();

export function progressUpsertKey(
  studentId: string,
  challengeId: number,
  kind: "code" | "blocks"
): string {
  return `${studentId}:${challengeId}:${kind}`;
}

export function hasPendingUpsert(key: string): boolean {
  return pendingUpserts.has(key);
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function scheduleDebouncedUpsert(
  key: string,
  run: () => Promise<void>,
  ms: number = PROGRESS_UPSERT_DEBOUNCE_MS
): void {
  const existing = pendingUpserts.get(key);
  if (existing) clearTimeout(existing.timer);
  pendingUpserts.set(key, {
    timer: setTimeout(() => {
      pendingUpserts.delete(key);
      void run();
    }, ms),
    run,
  });
}

export async function flushDebouncedUpsert(
  key: string,
  run: () => Promise<void>
): Promise<void> {
  const existing = pendingUpserts.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    pendingUpserts.delete(key);
  }
  await run();
}

export function cancelAllDebouncedUpserts(): void {
  for (const pending of pendingUpserts.values()) {
    clearTimeout(pending.timer);
  }
  pendingUpserts.clear();
}
