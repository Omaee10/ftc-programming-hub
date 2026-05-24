"use client";

import { useSyncExternalStore, useCallback } from "react";
import { getSession } from "@/lib/auth";

const BASE_KEY = "ftc-hub-challenge-progress-v1";

/** Map of challenge id → completion ISO timestamp */
export type ProgressMap = Record<number, string>;

// ─── Per-user storage key ─────────────────────────────────────────────────
// Each student gets their own key so different users on the same device never
// share progress. Mentors always get an isolated key that is never written to,
// so they can never appear to have completed student challenges.

function getStorageKey(): string {
  try {
    const session = getSession();
    if (!session) return BASE_KEY;
    if (session.role === "mentor") return `${BASE_KEY}:mentor`; // read-only isolation
    return `${BASE_KEY}:${session.id}`;
  } catch {
    return BASE_KEY;
  }
}

// ─── Snapshot cache ────────────────────────────────────────────────────────
// useSyncExternalStore requires stable object references — only create a new
// object when the raw JSON string (or key) actually changes.

let cachedKey: string | null = null;
let cachedJson: string | null = null;
let cachedMap: ProgressMap = {};

function invalidateCache() {
  cachedJson = null;
  cachedKey = null;
}

function getSnapshot(): ProgressMap {
  const key = getStorageKey();
  const raw = localStorage.getItem(key) ?? "{}";
  if (key === cachedKey && raw === cachedJson) return cachedMap;
  cachedKey = key;
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

  // Keep in sync when a different browser tab writes to any progress key
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(BASE_KEY)) {
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
  const session = getSession();
  // Mentors never write progress — their key stays empty
  if (session?.role === "mentor") return;
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(map));
  } catch {
    // Ignore quota / private-browsing errors
  }
}

// ─── Exported helpers for cross-device sync ───────────────────────────────

export function studentStorageKey(studentId: string): string {
  return `${BASE_KEY}:${studentId}`;
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

/** Merge cloud completions into this browser's localStorage. */
export function mergeLocalProgress(studentId: string, additions: ProgressMap): void {
  if (typeof window === "undefined") return;
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
  if (!changed) return;
  try {
    localStorage.setItem(studentStorageKey(studentId), JSON.stringify(next));
    invalidateCache();
    notifyAll();
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

  // Mentors never have their own challenge progress
  const isMentor = hydrated && getSession()?.role === "mentor";

  const markComplete = useCallback(
    (id: number) => {
      if (isMentor) return;
      const next: ProgressMap = { ...progress, [id]: new Date().toISOString() };
      writeStorage(next);
      notifyAll();
    },
    [progress, isMentor]
  );

  const markIncomplete = useCallback(
    (id: number) => {
      if (isMentor) return;
      const next = { ...progress };
      delete next[id];
      writeStorage(next);
      notifyAll();
    },
    [progress, isMentor]
  );

  const isCompleted = useCallback(
    (id: number): boolean => !isMentor && hydrated && id in progress,
    [progress, hydrated, isMentor]
  );

  const completedIds: number[] = !isMentor && hydrated
    ? Object.keys(progress).map(Number)
    : [];

  const completedAt = useCallback(
    (id: number): string | null => (isMentor ? null : (progress[id] ?? null)),
    [progress, isMentor]
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
