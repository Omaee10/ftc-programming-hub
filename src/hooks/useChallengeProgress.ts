"use client";

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "ftc-hub-challenge-progress-v1";

/** Map of challenge id → completion ISO timestamp */
export type ProgressMap = Record<number, string>;

// ─── Snapshot cache ────────────────────────────────────────────────────────
// useSyncExternalStore requires stable object references — only create a new
// object when the raw JSON string actually changes.

let cachedJson: string | null = null;
let cachedMap: ProgressMap = {};

function invalidateCache() {
  cachedJson = null;
}

function getSnapshot(): ProgressMap {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "{}";
  if (raw === cachedJson) return cachedMap;
  cachedJson = raw;
  try {
    cachedMap = JSON.parse(raw) as ProgressMap;
  } catch {
    cachedMap = {};
  }
  return cachedMap;
}

/** On the server there is no localStorage — return empty map. */
function getServerSnapshot(): ProgressMap {
  return cachedMap;
}

// ─── Subscriber management ────────────────────────────────────────────────

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  // Keep in sync when a different browser tab writes to the same key
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      invalidateCache();
      callback();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function notifyAll() {
  invalidateCache();
  listeners.forEach((cb) => cb());
}

// ─── Write helpers ────────────────────────────────────────────────────────

function writeStorage(map: ProgressMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota / private-browsing errors
  }
}

// ─── Hydration detector ───────────────────────────────────────────────────
// useSyncExternalStore runs getServerSnapshot on the server and getSnapshot
// on the client. By returning false server-side and true client-side we get a
// reliable, effect-free way to know whether we've hydrated.

function noopSubscribe(): () => void {
  return () => {};
}
const clientTrue = () => true;
const serverFalse = () => false;

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useChallengeProgress() {
  const progress = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // true on the client, false during SSR/static rendering
  const hydrated = useSyncExternalStore(noopSubscribe, clientTrue, serverFalse);

  const markComplete = useCallback(
    (id: number) => {
      const next: ProgressMap = { ...progress, [id]: new Date().toISOString() };
      writeStorage(next);
      notifyAll();
    },
    [progress]
  );

  const markIncomplete = useCallback(
    (id: number) => {
      const next = { ...progress };
      delete next[id];
      writeStorage(next);
      notifyAll();
    },
    [progress]
  );

  const isCompleted = useCallback(
    (id: number): boolean => hydrated && id in progress,
    [progress, hydrated]
  );

  const completedIds: number[] = hydrated
    ? Object.keys(progress).map(Number)
    : [];

  const completedAt = useCallback(
    (id: number): string | null => progress[id] ?? null,
    [progress]
  );

  return {
    progress,
    hydrated,
    isCompleted,
    completedIds,
    completedCount: completedIds.length,
    completedAt,
    markComplete,
    markIncomplete,
  };
}
