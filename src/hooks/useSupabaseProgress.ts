"use client";

import { useSyncExternalStore, useEffect, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSession, isSoloSession } from "@/lib/auth";
import { mergeLocalProgress, readLocalProgress } from "@/hooks/useChallengeProgress";
import type { BlockState } from "@/lib/challengeBlockDrafts";
import {
  PROGRESS_META_COLUMNS,
  PROGRESS_SNAPSHOT_COLUMNS,
} from "@/lib/supabase/progressColumns";
import { TAB_LOADER_TIMEOUT_MS } from "@/lib/useWorkspaceSession";
import { withTimeout } from "@/lib/withTimeout";
import { digestJson, digestText } from "@/lib/contentHash";
import {
  cancelAllDebouncedUpserts,
  flushDebouncedUpsert,
  scheduleDebouncedUpsert,
} from "@/lib/cloudSaveDebounce";

interface ProgressMetaRecord {
  challenge_id: number;
  completed: boolean;
  blocks_updated_at: string | null;
  updated_at: string | null;
}

interface ProgressSnapshot {
  code_snapshot: string | null;
  blocks_snapshot: BlockState | null;
  blocks_updated_at: string | null;
  updated_at: string | null;
}

/** Merge local completions into cloud records so UI stays correct when cloud sync lags. */
function mergeLocalIntoRecords(
  dbRecords: ProgressMetaRecord[],
  studentId: string
): ProgressMetaRecord[] {
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
        blocks_updated_at: null,
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
 * Metadata only — code/blocks snapshots load lazily per open challenge.
 */
async function syncProgressWithLocal(studentId: string): Promise<ProgressMetaRecord[]> {
  const { data, error } = await supabase
    .from("student_challenge_progress")
    .select(PROGRESS_META_COLUMNS)
    .eq("student_id", studentId);

  if (error) {
    console.error("Failed to load progress from cloud:", error.message);
    return mergeLocalIntoRecords([], studentId);
  }

  const dbRecords = (data ?? []) as ProgressMetaRecord[];
  const local = readLocalProgress(studentId);

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
        .select(PROGRESS_META_COLUMNS)
        .eq("student_id", studentId);
      if (refreshed) {
        return mergeLocalIntoRecords(refreshed as ProgressMetaRecord[], studentId);
      }
    }
  }

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
  records: ProgressMetaRecord[];
  snapshotsByChallenge: Record<number, ProgressSnapshot>;
  snapshotStatusByChallenge: Record<number, "loading" | "done">;
  hydrated: boolean;
}

let storeStudentId: string | null = null;
let syncInFlight: Promise<void> | null = null;
const snapshotLoadsInFlight = new Map<string, Promise<void>>();
const storeListeners = new Set<() => void>();

const EMPTY_SNAPSHOT: ProgressStoreSnapshot = {
  records: [],
  snapshotsByChallenge: {},
  snapshotStatusByChallenge: {},
  hydrated: false,
};
let storeSnapshot: ProgressStoreSnapshot = EMPTY_SNAPSHOT;

/** Last pushed snapshot digests — skip Supabase upsert when unchanged. */
const lastSavedCodeHash = new Map<string, string>();
const lastSavedBlocksHash = new Map<string, string>();

function snapshotKey(studentId: string, challengeId: number, kind: "code" | "blocks"): string {
  return `${studentId}:${challengeId}:${kind}`;
}

function publishStore(next: ProgressStoreSnapshot): void {
  if (
    storeSnapshot.records === next.records &&
    storeSnapshot.snapshotsByChallenge === next.snapshotsByChallenge &&
    storeSnapshot.snapshotStatusByChallenge === next.snapshotStatusByChallenge &&
    storeSnapshot.hydrated === next.hydrated
  ) {
    return;
  }
  storeSnapshot = next;
  storeListeners.forEach((cb) => cb());
}

function getStoreSnapshot(): ProgressStoreSnapshot {
  return storeSnapshot;
}

function getServerStoreSnapshot(): ProgressStoreSnapshot {
  return EMPTY_SNAPSHOT;
}

function subscribeToStore(callback: () => void): () => void {
  storeListeners.add(callback);
  return () => storeListeners.delete(callback);
}

function patchMetaRecord(id: number, patch: Partial<ProgressMetaRecord>): void {
  const records = storeSnapshot.records;
  const exists = records.find((r) => r.challenge_id === id);
  const nextRecords = exists
    ? records.map((r) =>
        r.challenge_id === id ? { ...r, ...patch, challenge_id: id } : r
      )
    : [
        ...records,
        {
          challenge_id: id,
          completed: false,
          blocks_updated_at: null,
          updated_at: null,
          ...patch,
        },
      ];
  publishStore({ ...storeSnapshot, records: nextRecords });
}

function patchSnapshot(id: number, patch: Partial<ProgressSnapshot>): void {
  const prev = storeSnapshot.snapshotsByChallenge[id] ?? {
    code_snapshot: null,
    blocks_snapshot: null,
    blocks_updated_at: null,
    updated_at: null,
  };
  publishStore({
    ...storeSnapshot,
    snapshotsByChallenge: {
      ...storeSnapshot.snapshotsByChallenge,
      [id]: { ...prev, ...patch },
    },
    snapshotStatusByChallenge: {
      ...storeSnapshot.snapshotStatusByChallenge,
      [id]: "done",
    },
  });
}

function resetProgressStore(): void {
  storeStudentId = null;
  syncInFlight = null;
  snapshotLoadsInFlight.clear();
  lastSavedCodeHash.clear();
  lastSavedBlocksHash.clear();
  cancelAllDebouncedUpserts();
  publishStore(EMPTY_SNAPSHOT);
}

async function ensureProgressLoaded(studentId: string): Promise<void> {
  if (storeStudentId !== studentId) {
    resetProgressStore();
    storeStudentId = studentId;
  }

  if (storeSnapshot.hydrated) return;
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
      publishStore({
        ...storeSnapshot,
        records: synced,
        hydrated: true,
      });
    } catch (error) {
      console.error("Failed to sync progress:", error);
      publishStore({
        ...storeSnapshot,
        records: mergeLocalIntoRecords([], studentId),
        hydrated: true,
      });
    } finally {
      syncInFlight = null;
    }
  })();

  await syncInFlight;
}

async function ensureSnapshotsLoaded(
  studentId: string,
  challengeId: number
): Promise<void> {
  if (storeStudentId !== studentId) {
    resetProgressStore();
    storeStudentId = studentId;
  }

  if (storeSnapshot.snapshotStatusByChallenge[challengeId] === "done") return;

  const loadKey = `${studentId}:${challengeId}`;
  const inFlight = snapshotLoadsInFlight.get(loadKey);
  if (inFlight) {
    await inFlight;
    return;
  }

  publishStore({
    ...storeSnapshot,
    snapshotStatusByChallenge: {
      ...storeSnapshot.snapshotStatusByChallenge,
      [challengeId]: "loading",
    },
  });

  const loadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("student_challenge_progress")
        .select(PROGRESS_SNAPSHOT_COLUMNS)
        .eq("student_id", studentId)
        .eq("challenge_id", challengeId)
        .maybeSingle();

      if (error) {
        console.error("Failed to load challenge snapshots:", error.message);
      }

      const row = data as ProgressSnapshot | null;
      const codeSnapshot = row?.code_snapshot ?? null;
      const blocksSnapshot = row?.blocks_snapshot ?? null;

      // Awaited rather than fire-and-forget. These were `void digest(...).then(set)`,
      // so a save landing between the select and the digest resolving had its fresh
      // hash overwritten by the hash of the older loaded snapshot — after which the
      // next save saw a false mismatch and did one redundant upsert. Awaiting makes
      // the ordering against publishStore deterministic.
      if (codeSnapshot !== null) {
        const hashKey = snapshotKey(studentId, challengeId, "code");
        lastSavedCodeHash.set(hashKey, await digestText(codeSnapshot));
      }
      if (blocksSnapshot !== null) {
        const hashKey = snapshotKey(studentId, challengeId, "blocks");
        lastSavedBlocksHash.set(hashKey, await digestJson(blocksSnapshot));
      }
      publishStore({
        ...getStoreSnapshot(),
        snapshotsByChallenge: {
          ...getStoreSnapshot().snapshotsByChallenge,
          [challengeId]: {
            code_snapshot: codeSnapshot,
            blocks_snapshot: blocksSnapshot,
            blocks_updated_at: row?.blocks_updated_at ?? null,
            updated_at: row?.updated_at ?? null,
          },
        },
        snapshotStatusByChallenge: {
          ...getStoreSnapshot().snapshotStatusByChallenge,
          [challengeId]: "done",
        },
      });
    } finally {
      snapshotLoadsInFlight.delete(loadKey);
    }
  })();

  snapshotLoadsInFlight.set(loadKey, loadPromise);
  await loadPromise;
}

/**
 * Supabase-backed progress hook.
 *
 * When no student session exists every function is a no-op and `isCompleted`
 * always returns false, so the existing localStorage hook can take over.
 */
export function useSupabaseProgress(challengeId?: number) {
  const [studentId, setStudentId] = useState<string | null>(null);

  const store = useSyncExternalStore(
    subscribeToStore,
    getStoreSnapshot,
    getServerStoreSnapshot
  );

  const { records, snapshotsByChallenge, snapshotStatusByChallenge, hydrated: storeHydrated } =
    store;

  useEffect(() => {
    const syncStudentId = () => {
      const session = getSession();
      if (session?.role === "student" && !isSoloSession(session)) {
        setStudentId(session.id);
      } else {
        setStudentId(null);
      }
    };

    syncStudentId();
    window.addEventListener("ftc-session-updated", syncStudentId);
    return () => window.removeEventListener("ftc-session-updated", syncStudentId);
  }, []);

  useEffect(() => {
    if (!studentId) {
      if (storeStudentId !== null) {
        resetProgressStore();
      }
      return;
    }
    void ensureProgressLoaded(studentId);
  }, [studentId]);

  useEffect(() => {
    if (!studentId || challengeId === undefined) return;
    if (!storeHydrated) return;
    void ensureSnapshotsLoaded(studentId, challengeId);
  }, [studentId, challengeId, storeHydrated]);

  const hydrated = studentId ? storeHydrated : true;
  const snapshotsHydrated =
    !studentId ||
    challengeId === undefined ||
    snapshotStatusByChallenge[challengeId] === "done";

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

  const snapshot =
    challengeId !== undefined ? snapshotsByChallenge[challengeId] : undefined;
  const loadedCode = snapshot?.code_snapshot ?? null;
  const loadedCodeUpdatedAt = snapshot?.updated_at ?? null;
  const loadedBlocks = snapshot?.blocks_snapshot ?? null;
  const loadedBlocksUpdatedAt = snapshot?.blocks_updated_at ?? null;

  const saveCode = useCallback(
    async (code: string, options?: { flush?: boolean }): Promise<void> => {
      if (!studentId || challengeId === undefined) {
        return;
      }

      const activeSession = getSession();
      if (
        !activeSession ||
        activeSession.role !== "student" ||
        activeSession.id !== studentId
      ) {
        return;
      }

      const hashKey = snapshotKey(studentId, challengeId, "code");
      const upsertKey = snapshotKey(studentId, challengeId, "code");

      const performUpsert = async () => {
        const savedAt = new Date().toISOString();
        const hash = await digestText(code);
        if (lastSavedCodeHash.get(hashKey) === hash) {
          return;
        }

        // Read completion at run time, not schedule time: a markComplete() can
        // land during the debounce window, and a stale captured `false` would
        // otherwise revert it here.
        const liveRecord = getStoreSnapshot().records.find(
          (r) => r.challenge_id === challengeId
        );
        const completed =
          liveRecord?.completed || isLocallyCompleted(studentId, challengeId);

        const { error } = await supabase.from("student_challenge_progress").upsert(
          {
            student_id: studentId,
            challenge_id: challengeId,
            code_snapshot: code,
            completed,
            updated_at: savedAt,
          },
          { onConflict: "student_id,challenge_id" }
        );

        if (error) {
          console.error("Failed to save code:", error.message);
          return;
        }

        lastSavedCodeHash.set(hashKey, hash);
        patchMetaRecord(challengeId, { completed, updated_at: savedAt });
        patchSnapshot(challengeId, {
          code_snapshot: code,
          updated_at: savedAt,
        });
      };

      if (options?.flush) {
        await flushDebouncedUpsert(upsertKey, performUpsert);
        return;
      }

      scheduleDebouncedUpsert(upsertKey, performUpsert);
    },
    [challengeId, records, studentId]
  );

  const saveBlocks = useCallback(
    async (state: BlockState, options?: { flush?: boolean }): Promise<void> => {
      if (!studentId || challengeId === undefined) {
        return;
      }

      const activeSession = getSession();
      if (
        !activeSession ||
        activeSession.role !== "student" ||
        activeSession.id !== studentId
      ) {
        return;
      }

      const hashKey = snapshotKey(studentId, challengeId, "blocks");
      const upsertKey = snapshotKey(studentId, challengeId, "blocks");

      const performUpsert = async () => {
        const savedAt = new Date().toISOString();
        const hash = await digestJson(state);
        if (lastSavedBlocksHash.get(hashKey) === hash) {
          return;
        }

        // Read completion at run time, not schedule time: a markComplete() can
        // land during the debounce window, and a stale captured `false` would
        // otherwise revert it here.
        const liveRecord = getStoreSnapshot().records.find(
          (r) => r.challenge_id === challengeId
        );
        const completed =
          liveRecord?.completed || isLocallyCompleted(studentId, challengeId);

        const { error } = await supabase.from("student_challenge_progress").upsert(
          {
            student_id: studentId,
            challenge_id: challengeId,
            blocks_snapshot: state,
            blocks_updated_at: savedAt,
            completed,
          },
          { onConflict: "student_id,challenge_id" }
        );

        if (error) {
          console.error("Failed to save blocks:", error.message);
          return;
        }

        lastSavedBlocksHash.set(hashKey, hash);
        patchMetaRecord(challengeId, {
          completed,
          blocks_updated_at: savedAt,
        });
        patchSnapshot(challengeId, {
          blocks_snapshot: state,
          blocks_updated_at: savedAt,
        });
      };

      if (options?.flush) {
        await flushDebouncedUpsert(upsertKey, performUpsert);
        return;
      }

      scheduleDebouncedUpsert(upsertKey, performUpsert);
    },
    [challengeId, records, studentId]
  );

  const markComplete = useCallback(
    async (id: number, codeSnapshot?: string): Promise<void> => {
      if (!studentId) return;

      const activeSession = getSession();
      if (
        !activeSession ||
        activeSession.role !== "student" ||
        activeSession.id !== studentId
      ) {
        return;
      }

      const now = new Date().toISOString();
      const storeState = getStoreSnapshot();
      const existingSnapshot = storeState.snapshotsByChallenge[id];
      const snapshot = codeSnapshot ?? existingSnapshot?.code_snapshot ?? null;

      const payload: {
        student_id: string;
        challenge_id: number;
        completed: boolean;
        updated_at: string;
        code_snapshot?: string | null;
      } = {
        student_id: studentId,
        challenge_id: id,
        completed: true,
        updated_at: now,
      };
      if (snapshot !== null) {
        payload.code_snapshot = snapshot;
      }

      const { error } = await supabase
        .from("student_challenge_progress")
        .upsert(payload, { onConflict: "student_id,challenge_id" });

      if (error) {
        console.error("Failed to save completion to cloud:", error.message);
      }

      patchMetaRecord(id, { completed: true, updated_at: now });
      if (snapshot !== null) {
        patchSnapshot(id, { code_snapshot: snapshot, updated_at: now });
      }
    },
    [studentId]
  );

  const markIncomplete = useCallback(async (id: number): Promise<void> => {
    if (!studentId) return;

    const activeSession = getSession();
    if (
      !activeSession ||
      activeSession.role !== "student" ||
      activeSession.id !== studentId
    ) {
      return;
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("student_challenge_progress").upsert(
      {
        student_id: studentId,
        challenge_id: id,
        completed: false,
        updated_at: now,
      },
      { onConflict: "student_id,challenge_id" }
    );

    if (error) {
      console.error("Failed to reset completion in cloud:", error.message);
    }

    patchMetaRecord(id, { completed: false, updated_at: now });
  }, [studentId]);

  return {
    studentId,
    isCompleted,
    completedIds,
    completedCount: completedIds.length,
    attemptedIds,
    loadedCode,
    loadedCodeUpdatedAt,
    loadedBlocks,
    loadedBlocksUpdatedAt,
    hydrated,
    snapshotsHydrated,
    saveCode,
    saveBlocks,
    markComplete,
    markIncomplete,
  };
}
