"use client";

import { useSyncExternalStore, useEffect, useCallback } from "react";
import { supabase, type HomeworkAssignmentRow } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { useWorkspaceSession } from "@/lib/useWorkspaceSession";
import { TAB_LOADER_TIMEOUT_MS } from "@/lib/useWorkspaceSession";
import { formatLoadError, withTimeout } from "@/lib/withTimeout";

import { classOwner } from "@/lib/classChallenges";

type HomeworkCacheKey = string;

interface HomeworkStoreSnapshot {
  assignments: HomeworkAssignmentRow[];
  hydrated: boolean;
  loadError: string | null;
  cacheKey: HomeworkCacheKey | null;
}

const EMPTY_SNAPSHOT: HomeworkStoreSnapshot = {
  assignments: [],
  hydrated: false,
  loadError: null,
  cacheKey: null,
};

let storeSnapshot: HomeworkStoreSnapshot = EMPTY_SNAPSHOT;
let loadInFlight: Promise<void> | null = null;
const storeListeners = new Set<() => void>();

function publishStore(next: HomeworkStoreSnapshot): void {
  if (
    storeSnapshot.assignments === next.assignments &&
    storeSnapshot.hydrated === next.hydrated &&
    storeSnapshot.loadError === next.loadError &&
    storeSnapshot.cacheKey === next.cacheKey
  ) {
    return;
  }
  storeSnapshot = next;
  storeListeners.forEach((cb) => cb());
}

function getStoreSnapshot(): HomeworkStoreSnapshot {
  return storeSnapshot;
}

function getServerStoreSnapshot(): HomeworkStoreSnapshot {
  return EMPTY_SNAPSHOT;
}

function subscribeToStore(callback: () => void): () => void {
  storeListeners.add(callback);
  return () => storeListeners.delete(callback);
}

const SESSION_CACHE_PREFIX = "ftc-homework-cache:";

function readSessionCache(key: HomeworkCacheKey): HomeworkAssignmentRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as HomeworkAssignmentRow[];
  } catch {
    return null;
  }
}

function writeSessionCache(key: HomeworkCacheKey, assignments: HomeworkAssignmentRow[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${key}`, JSON.stringify(assignments));
  } catch {
    // Ignore quota errors
  }
}

function cacheKeyForSession(): HomeworkCacheKey | null {
  const session = getSession();
  if (!session?.id) return null;
  if (session.role === "student") return `student:${session.id}`;
  if (session.role === "mentor") {
    return `mentor:${classOwner(session)}`;
  }
  return null;
}

/** Warm homework cache after sign-in (e.g. from AppShell). */
export function prefetchHomework(): void {
  const key = cacheKeyForSession();
  if (!key) return;
  void ensureHomeworkLoaded(key);
}

async function fetchStudentHomework(studentId: string): Promise<HomeworkAssignmentRow[]> {
  const res = await withTimeout(
    fetch(`/api/student/homework?studentId=${encodeURIComponent(studentId)}`, {
      credentials: "include",
    }),
    TAB_LOADER_TIMEOUT_MS,
    "Loading homework"
  );

  const body = (await res.json()) as {
    error?: string;
    assignments?: HomeworkAssignmentRow[];
  };

  if (!res.ok) {
    throw new Error(body.error ?? "Failed to load homework.");
  }

  return body.assignments ?? [];
}

async function fetchMentorHomework(ownerId: string): Promise<HomeworkAssignmentRow[]> {
  const { data: students } = await withTimeout(
    Promise.resolve(
      supabase.from("students").select("id").eq("mentor_id", ownerId)
    ),
    TAB_LOADER_TIMEOUT_MS,
    "Loading students"
  );

  const studentIds = ((students ?? []) as { id: string }[]).map((s) => s.id);
  if (studentIds.length === 0) return [];

  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from("homework_assignments")
        .select("*")
        .in("student_id", studentIds)
        .order("assigned_at", { ascending: false })
    ),
    TAB_LOADER_TIMEOUT_MS,
    "Loading homework"
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as HomeworkAssignmentRow[];
}

async function ensureHomeworkLoaded(key: HomeworkCacheKey): Promise<void> {
  if (storeSnapshot.cacheKey !== key) {
    const cached = readSessionCache(key);
    publishStore({
      assignments: cached ?? [],
      hydrated: cached !== null,
      loadError: null,
      cacheKey: key,
    });
    loadInFlight = null;
  }

  if (loadInFlight) {
    await loadInFlight;
    return;
  }

  const loadKey = key;
  loadInFlight = (async () => {
    try {
      let assignments: HomeworkAssignmentRow[] = [];

      if (loadKey.startsWith("student:")) {
        const studentId = loadKey.slice("student:".length);
        assignments = await fetchStudentHomework(studentId);
      } else if (loadKey.startsWith("mentor:")) {
        const ownerId = loadKey.slice("mentor:".length);
        assignments = await fetchMentorHomework(ownerId);
      }

      if (storeSnapshot.cacheKey !== loadKey) return;

      writeSessionCache(loadKey, assignments);
      publishStore({
        assignments,
        hydrated: true,
        loadError: null,
        cacheKey: loadKey,
      });
    } catch (error) {
      console.error("Failed to load homework assignments:", error);
      if (storeSnapshot.cacheKey !== loadKey) return;

      publishStore({
        assignments: [],
        hydrated: true,
        loadError: formatLoadError(error),
        cacheKey: loadKey,
      });
    } finally {
      if (loadInFlight) loadInFlight = null;
    }
  })();

  await loadInFlight;
}

export function useHomeworkAssignments() {
  const workspaceSession = useWorkspaceSession();
  const { assignments, hydrated, loadError } = useSyncExternalStore(
    subscribeToStore,
    getStoreSnapshot,
    getServerStoreSnapshot
  );

  const cacheKey = workspaceSession
    ? workspaceSession.role === "student"
      ? `student:${workspaceSession.id}`
      : workspaceSession.role === "mentor"
        ? `mentor:${classOwner(workspaceSession)}`
        : null
    : null;

  useEffect(() => {
    if (!cacheKey) return;
    void ensureHomeworkLoaded(cacheKey);
  }, [cacheKey]);

  const refresh = useCallback(async () => {
    const key = cacheKeyForSession();
    if (!key) return;
    publishStore({
      assignments: storeSnapshot.assignments,
      hydrated: false,
      loadError: null,
      cacheKey: key,
    });
    loadInFlight = null;
    await ensureHomeworkLoaded(key);
  }, []);

  const assignedIds = new Set(assignments.map((a) => a.challenge_id));

  const isAssigned = useCallback(
    (challengeId: number) => assignedIds.has(challengeId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignments]
  );

  const getAssignment = useCallback(
    (challengeId: number) =>
      assignments.find((a) => a.challenge_id === challengeId) ?? null,
    [assignments]
  );

  const isHomeworkComplete = useCallback(
    (challengeId: number) => {
      const a = assignments.find((x) => x.challenge_id === challengeId);
      return a?.completed ?? false;
    },
    [assignments]
  );

  const markHomeworkComplete = useCallback(
    async (challengeId: number, code: string) => {
      const session = getSession();
      if (!session || session.role !== "student") return;

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("homework_assignments")
        .update({
          completed: true,
          completed_at: now,
          code_snapshot: code,
        })
        .eq("student_id", session.id)
        .eq("challenge_id", challengeId);

      if (error) {
        console.error("Failed to mark homework complete:", error.message);
        return;
      }

      const next = assignments.map((a) =>
        a.challenge_id === challengeId
          ? { ...a, completed: true, completed_at: now, code_snapshot: code }
          : a
      );
      publishStore({
        assignments: next,
        hydrated: true,
        loadError: null,
        cacheKey: storeSnapshot.cacheKey,
      });
    },
    [assignments]
  );

  const assignHomework = useCallback(
    async (
      studentIds: string[],
      challengeId: number,
      dueDate: string | null,
      assignedBy: string
    ) => {
      if (studentIds.length === 0) return { error: "No students selected" };

      const rows = studentIds.map((studentId) => ({
        student_id: studentId,
        challenge_id: challengeId,
        assigned_by: assignedBy,
        due_date: dueDate,
        completed: false,
        completed_at: null,
        code_snapshot: null,
      }));

      const { error } = await supabase
        .from("homework_assignments")
        .upsert(rows, { onConflict: "student_id,challenge_id", ignoreDuplicates: true });

      if (error) {
        return { error: error.message };
      }

      await refresh();
      return { error: null };
    },
    [refresh]
  );

  const unassignHomework = useCallback(
    async (assignmentId: string) => {
      const { error } = await supabase
        .from("homework_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) {
        return { error: error.message };
      }

      const next = assignments.filter((a) => a.id !== assignmentId);
      publishStore({
        assignments: next,
        hydrated: true,
        loadError: null,
        cacheKey: storeSnapshot.cacheKey,
      });
      return { error: null };
    },
    [assignments]
  );

  return {
    assignments,
    assignedIds,
    hydrated: cacheKey ? hydrated : false,
    loadError,
    isAssigned,
    getAssignment,
    isHomeworkComplete,
    markHomeworkComplete,
    assignHomework,
    unassignHomework,
    refresh,
  };
}
