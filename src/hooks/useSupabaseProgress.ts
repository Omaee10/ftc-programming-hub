"use client";

import { useSyncExternalStore, useEffect, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { mergeLocalProgress, readLocalProgress } from "@/hooks/useChallengeProgress";
import { TAB_LOADER_TIMEOUT_MS } from "@/lib/useWorkspaceSession";
import { withTimeout } from "@/lib/withTimeout";

interface ProgressRecord {
  challenge_id: number;
  completed: boolean;
  code_snapshot: string | null;
  updated_at: string | null;
}

/** Merge local completions into cloud records so UI stays correct when cloud sync lags. */
function mergeLocalIntoRecords(
  dbRecords: ProgressRecord[],
  studentId: string
): ProgressRecord[] {
  const local = readLocalProgress(studentId);
  const byId = new Map(dbRecords.map((r) => [r.challenge_id, { ...r }]));

  for (const [idStr, ts] of Object.entries(local)) {
    const id = Number(idStr);
    const existing = byId.get(id);
    if (existing) {
      if (!existing.completed) {
        byId.set(id, {
          ...existing,
          completed: true,
          updated_at: existing.updated_at ?? ts,
        });
      }
    } else {
      byId.set(id, {
        challenge_id: id,
        completed: true,
        code_snapshot: null,
        updated_at: ts,
      });
    }
  }

  return Array.from(byId.values());
}

function isLocallyCompleted(studentId: string, challengeId: number): boolean {
  return challengeId in readLocalProgress(studentId);
}

/**
 * Bidirectional sync between localStorage and Supabase for a student session.
 * - Pushes local completions that never reached the cloud (e.g. localhost-only work)
 * - Pulls cloud completions into this browser's localStorage
 */
async function syncProgressWithLocal(studentId: string): Promise<ProgressRecord[]> {
  const { data, error } = await supabase
    .from("student_challenge_progress")
    .select("challenge_id, completed, code_snapshot, updated_at")
    .eq("student_id", studentId);

  if (error) {
    console.error("Failed to load progress from cloud:", error.message);
    return mergeLocalIntoRecords([], studentId);
  }

  const dbRecords = (data ?? []) as ProgressRecord[];
  const local = readLocalProgress(studentId);

  // Local → cloud: upload completions that exist in this browser but not in DB
  const localToPush = Object.entries(local).filter(([idStr]) => {
    const id = Number(idStr);
    const rec = dbRecords.find((r) => r.challenge_id === id);
    return !rec?.completed;
  });

  if (localToPush.length > 0) {
    const { error: pushError } = await supabase
      .from("student_challenge_progress")
      .upsert(
        localToPush.map(([idStr, ts]) => ({
          student_id: studentId,
          challenge_id: Number(idStr),
          completed: true,
          updated_at: ts,
        })),
        { onConflict: "student_id,challenge_id" }
      );

    if (pushError) {
      console.error("Failed to sync local progress to cloud:", pushError.message);
    } else {
      const { data: refreshed } = await supabase
        .from("student_challenge_progress")
        .select("challenge_id, completed, code_snapshot, updated_at")
        .eq("student_id", studentId);
      if (refreshed) {
        return mergeLocalIntoRecords(refreshed as ProgressRecord[], studentId);
      }
    }
  }

  // Cloud → local: download completions missing from this browser
  const cloudCompletions: Record<number, string> = {};
  for (const rec of dbRecords) {
    if (rec.completed && !(rec.challenge_id in local)) {
      cloudCompletions[rec.challenge_id] =
        rec.updated_at ?? new Date().toISOString();
    }
  }
  if (Object.keys(cloudCompletions).length > 0) {
    mergeLocalProgress(studentId, cloudCompletions);
  }

  return mergeLocalIntoRecords(dbRecords, studentId);
}

// ─── Shared store — one sync per student, shared across all hook instances ───

interface ProgressStoreSnapshot {
  records: ProgressRecord[];
  hydrated: boolean;
}

let storeStudentId: string | null = null;
let storeRecords: ProgressRecord[] = [];
let storeHydrated = false;
let syncInFlight: Promise<void> | null = null;
const storeListeners = new Set<() => void>();

function notifyStore() {
  storeListeners.forEach((cb) => cb());
}

function getStoreSnapshot(): ProgressStoreSnapshot {
  return { records: storeRecords, hydrated: storeHydrated };
}

function getServerStoreSnapshot(): ProgressStoreSnapshot {
  return { records: [], hydrated: false };
}

function subscribeToStore(callback: () => void): () => void {
  storeListeners.add(callback);
  return () => storeListeners.delete(callback);
}

function patchStoreRecord(id: number, patch: Partial<ProgressRecord>): void {
  const exists = storeRecords.find((r) => r.challenge_id === id);
  if (exists) {
    storeRecords = storeRecords.map((r) =>
      r.challenge_id === id ? { ...r, ...patch, challenge_id: id } : r
    );
  } else {
    storeRecords = [
      ...storeRecords,
      {
        challenge_id: id,
        completed: false,
        code_snapshot: null,
        updated_at: null,
        ...patch,
      },
    ];
  }
  notifyStore();
}

async function ensureProgressLoaded(studentId: string): Promise<void> {
  if (storeStudentId !== studentId) {
    storeStudentId = studentId;
    storeRecords = [];
    storeHydrated = false;
    syncInFlight = null;
  }

  if (storeHydrated) return;
  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = (async () => {
    try {
      const synced = await withTimeout(
        syncProgressWithLocal(studentId),
        TAB_LOADER_TIMEOUT_MS,
        "Loading progress"
      );
      storeRecords = synced;
    } catch (error) {
      console.error("Failed to sync progress:", error);
      storeRecords = mergeLocalIntoRecords([], studentId);
    } finally {
      storeHydrated = true;
      syncInFlight = null;
      notifyStore();
    }
  })();

  await syncInFlight;
}

/**
 * Supabase-backed progress hook.
 *
 * When no student session exists every function is a no-op and `isCompleted`
 * always returns false, so the existing localStorage hook can take over.
 */
export function useSupabaseProgress(challengeId?: number) {
  const [studentId, setStudentId] = useState<string | null>(null);

  const { records, hydrated: storeHydrated } = useSyncExternalStore(
    subscribeToStore,
    getStoreSnapshot,
    getServerStoreSnapshot
  );

  useEffect(() => {
    const syncStudentId = () => {
      const session = getSession();
      setStudentId(session?.role === "student" ? session.id : null);
    };

    syncStudentId();
    window.addEventListener("ftc-session-updated", syncStudentId);
    return () => window.removeEventListener("ftc-session-updated", syncStudentId);
  }, []);

  useEffect(() => {
    if (!studentId) return;
    void ensureProgressLoaded(studentId);
  }, [studentId]);

  const hydrated = studentId ? storeHydrated : true;

  const isCompleted = useCallback(
    (id: number): boolean => {
      if (!hydrated && studentId) return false;
      return records.some((r) => r.challenge_id === id && r.completed);
    },
    [records, hydrated, studentId]
  );

  const completedIds: number[] = records
    .filter((r) => r.completed)
    .map((r) => r.challenge_id);

  const attemptedIds: number[] = records.map((r) => r.challenge_id);

  const challengeRecord =
    challengeId !== undefined
      ? records.find((r) => r.challenge_id === challengeId)
      : undefined;
  const loadedCode = challengeRecord?.code_snapshot ?? null;
  const loadedCodeUpdatedAt = challengeRecord?.updated_at ?? null;

  const saveCode = useCallback(
    async (code: string): Promise<void> => {
      const activeSession = getSession();
      if (
        !activeSession ||
        activeSession.role !== "student" ||
        challengeId === undefined
      ) {
        return;
      }

      const existing = records.find((r) => r.challenge_id === challengeId);
      const completed =
        existing?.completed ||
        isLocallyCompleted(activeSession.id, challengeId);

      const now = new Date().toISOString();
      const { error } = await supabase.from("student_challenge_progress").upsert(
        {
          student_id: activeSession.id,
          challenge_id: challengeId,
          code_snapshot: code,
          completed,
          updated_at: now,
        },
        { onConflict: "student_id,challenge_id" }
      );

      if (error) {
        console.error("Failed to save code:", error.message);
        return;
      }

      patchStoreRecord(challengeId, {
        code_snapshot: code,
        completed,
        updated_at: now,
      });
    },
    [challengeId, records]
  );

  const markComplete = useCallback(async (id: number): Promise<void> => {
    const activeSession = getSession();
    if (!activeSession || activeSession.role !== "student") return;

    const now = new Date().toISOString();
    const existing = records.find((r) => r.challenge_id === id);

    const { error } = await supabase.from("student_challenge_progress").upsert(
      {
        student_id: activeSession.id,
        challenge_id: id,
        completed: true,
        code_snapshot: existing?.code_snapshot ?? null,
        updated_at: now,
      },
      { onConflict: "student_id,challenge_id" }
    );

    if (error) {
      console.error("Failed to save completion to cloud:", error.message);
    }

    patchStoreRecord(id, {
      completed: true,
      updated_at: now,
      code_snapshot: existing?.code_snapshot ?? null,
    });
  }, [records]);

  const markIncomplete = useCallback(async (id: number): Promise<void> => {
    const activeSession = getSession();
    if (!activeSession || activeSession.role !== "student") return;

    const now = new Date().toISOString();
    const existing = records.find((r) => r.challenge_id === id);

    const { error } = await supabase.from("student_challenge_progress").upsert(
      {
        student_id: activeSession.id,
        challenge_id: id,
        completed: false,
        code_snapshot: existing?.code_snapshot ?? null,
        updated_at: now,
      },
      { onConflict: "student_id,challenge_id" }
    );

    if (error) {
      console.error("Failed to reset completion in cloud:", error.message);
    }

    patchStoreRecord(id, {
      completed: false,
      updated_at: now,
      code_snapshot: existing?.code_snapshot ?? null,
    });
  }, [records]);

  return {
    isCompleted,
    completedIds,
    completedCount: completedIds.length,
    attemptedIds,
    loadedCode,
    loadedCodeUpdatedAt,
    hydrated,
    saveCode,
    markComplete,
    markIncomplete,
  };
}
