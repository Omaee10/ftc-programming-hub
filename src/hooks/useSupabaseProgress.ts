"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { mergeLocalProgress, readLocalProgress } from "@/hooks/useChallengeProgress";

interface ProgressRecord {
  challenge_id: number;
  completed: boolean;
  code_snapshot: string | null;
  updated_at: string | null;
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
    return [];
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
      if (refreshed) return refreshed as ProgressRecord[];
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

  return dbRecords;
}

/**
 * Supabase-backed progress hook.
 *
 * When no student session exists every function is a no-op and `isCompleted`
 * always returns false, so the existing localStorage hook can take over.
 */
export function useSupabaseProgress(challengeId?: number) {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loadedCode, setLoadedCode] = useState<string | null>(null);
  const [loadedCodeUpdatedAt, setLoadedCodeUpdatedAt] = useState<string | null>(
    null
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "student") {
      setHydrated(true);
      return;
    }

    (async () => {
      const synced = await syncProgressWithLocal(session.id);
      setRecords(synced);
      if (challengeId !== undefined) {
        const rec = synced.find((r) => r.challenge_id === challengeId);
        setLoadedCode(rec?.code_snapshot ?? null);
        setLoadedCodeUpdatedAt(rec?.updated_at ?? null);
      }
      setHydrated(true);
    })();
  }, [challengeId]);

  const isCompleted = useCallback(
    (id: number): boolean => {
      if (!hydrated) return false;
      return records.some((r) => r.challenge_id === id && r.completed);
    },
    [records, hydrated]
  );

  const completedIds: number[] = records
    .filter((r) => r.completed)
    .map((r) => r.challenge_id);

  // All challenge IDs with any saved progress (attempted, not necessarily complete)
  const attemptedIds: number[] = records.map((r) => r.challenge_id);

  const saveCode = useCallback(
    async (code: string): Promise<void> => {
      const session = getSession();
      if (!session || session.role !== "student" || challengeId === undefined)
        return;

      const { error } = await supabase.from("student_challenge_progress").upsert(
        {
          student_id: session.id,
          challenge_id: challengeId,
          code_snapshot: code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,challenge_id" }
      );
      if (error) console.error("Failed to save code:", error.message);
      else {
        const now = new Date().toISOString();
        setRecords((prev) => {
          const exists = prev.find((r) => r.challenge_id === challengeId);
          if (exists) {
            return prev.map((r) =>
              r.challenge_id === challengeId
                ? { ...r, code_snapshot: code, updated_at: now }
                : r
            );
          }
          return [
            ...prev,
            {
              challenge_id: challengeId,
              completed: false,
              code_snapshot: code,
              updated_at: now,
            },
          ];
        });
        setLoadedCode(code);
        setLoadedCodeUpdatedAt(now);
      }
    },
    [challengeId]
  );

  const markComplete = useCallback(async (id: number): Promise<void> => {
    const session = getSession();
    if (!session || session.role !== "student") return;

    const { error } = await supabase.from("student_challenge_progress").upsert(
      {
        student_id: session.id,
        challenge_id: id,
        completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,challenge_id" }
    );

    if (error) {
      console.error("Failed to save completion to cloud:", error.message);
      return;
    }

    setRecords((prev) => {
      const exists = prev.find((r) => r.challenge_id === id);
      if (exists) {
        return prev.map((r) =>
          r.challenge_id === id ? { ...r, completed: true } : r
        );
      }
      return [
        ...prev,
        {
          challenge_id: id,
          completed: true,
          code_snapshot: null,
          updated_at: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const markIncomplete = useCallback(async (id: number): Promise<void> => {
    const session = getSession();
    if (!session || session.role !== "student") return;

    const { error } = await supabase.from("student_challenge_progress").upsert(
      {
        student_id: session.id,
        challenge_id: id,
        completed: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,challenge_id" }
    );

    if (error) {
      console.error("Failed to reset completion in cloud:", error.message);
      return;
    }

    setRecords((prev) =>
      prev.map((r) =>
        r.challenge_id === id ? { ...r, completed: false } : r
      )
    );
  }, []);

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
