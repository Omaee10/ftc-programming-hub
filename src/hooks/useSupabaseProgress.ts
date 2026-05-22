"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

interface ProgressRecord {
  challenge_id: number;
  completed: boolean;
  code_snapshot: string | null;
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "student") {
      setHydrated(true);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("student_challenge_progress")
        .select("challenge_id, completed, code_snapshot")
        .eq("student_id", session.id);

      if (data) {
        setRecords(data as ProgressRecord[]);
        if (challengeId !== undefined) {
          const rec = data.find((r) => r.challenge_id === challengeId);
          setLoadedCode((rec as ProgressRecord | undefined)?.code_snapshot ?? null);
        }
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

      await supabase.from("student_challenge_progress").upsert(
        {
          student_id: session.id,
          challenge_id: challengeId,
          code_snapshot: code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,challenge_id" }
      );
    },
    [challengeId]
  );

  const markComplete = useCallback(
    async (id: number): Promise<void> => {
      const session = getSession();
      if (!session || session.role !== "student") return;

      await supabase.from("student_challenge_progress").upsert(
        {
          student_id: session.id,
          challenge_id: id,
          completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,challenge_id" }
      );

      setRecords((prev) => {
        const exists = prev.find((r) => r.challenge_id === id);
        if (exists) {
          return prev.map((r) =>
            r.challenge_id === id ? { ...r, completed: true } : r
          );
        }
        return [...prev, { challenge_id: id, completed: true, code_snapshot: null }];
      });
    },
    []
  );

  return {
    isCompleted,
    completedIds,
    completedCount: completedIds.length,
    attemptedIds,
    loadedCode,
    hydrated,
    saveCode,
    markComplete,
  };
}
