"use client";

import { useSyncExternalStore, useEffect, useCallback } from "react";
import { supabase, type HomeworkAssignmentRow } from "@/lib/supabase";
import { HOMEWORK_LIST_COLUMNS } from "@/lib/supabase/progressColumns";
import { fetchAllRows } from "@/lib/supabase/queryHelpers";
import { getSession, isSoloSession } from "@/lib/auth";
import { useWorkspaceSession } from "@/lib/useWorkspaceSession";
import { TAB_LOADER_TIMEOUT_MS } from "@/lib/useWorkspaceSession";
import { fetchWithTimeout, formatLoadError, withTimeout } from "@/lib/withTimeout";

import { classOwner } from "@/lib/classChallenges";

type HomeworkCacheKey = string;

interface HomeworkStoreSnapshot {
  assignments: HomeworkAssignmentRow[];
  hydrated: boolean;
  loadError: string | null;
  cacheKey: HomeworkCacheKey | null;
}

/**
 * Stable empty list for sessions with no homework workspace.
 *
 * Must be a shared constant, not a fresh `[]` per render: it feeds `assignedIds`
 * and the `useCallback` deps below, and a new identity each render would make
 * `isAssigned` unstable — re-firing the effects in ChallengeRedirectGuard and
 * HomeworkWorkspace that depend on it.
 */
const NO_ASSIGNMENTS: HomeworkAssignmentRow[] = [];

const EMPTY_SNAPSHOT: HomeworkStoreSnapshot = {
  assignments: NO_ASSIGNMENTS,
  hydrated: false,
  loadError: null,
  cacheKey: null,
};

let storeSnapshot: HomeworkStoreSnapshot = EMPTY_SNAPSHOT;
let loadInFlight: Promise<void> | null = null;
/** Bumped per load so a superseded (older) load can't publish stale results. */
let loadGeneration = 0;
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
  if (!session?.id || isSoloSession(session)) return null;
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
  const res = await fetchWithTimeout(`/api/student/homework?studentId=${encodeURIComponent(studentId)}`, {
    credentials: "include",
  },
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

/** fetchAllRows types its error as `unknown`; Supabase returns a plain object. */
function queryErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

/**
 * Every read here goes through {@link fetchAllRows}.
 *
 * PostgREST caps a response at 1000 rows and truncates SILENTLY. Homework rows
 * scale as students x challenges, so a class of 30 students with 40 assignments
 * each is already past the cap — and the missing rows render as "not assigned"
 * with no visible failure. The server route (/api/mentor/dashboard-data) has
 * always paged its equivalent reads; this client hook never did.
 *
 * Both queries carry an explicit `.order()` so paging stays deterministic —
 * `id` is the tiebreaker on homework, where several rows share an assigned_at.
 */
async function fetchMentorHomework(ownerId: string): Promise<HomeworkAssignmentRow[]> {
  const { data: students, error: studentsError } = await withTimeout(
    fetchAllRows<{ id: string }>((from, to) =>
      supabase
        .from("students")
        .select("id")
        .eq("mentor_id", ownerId)
        .order("id")
        .range(from, to)
    ),
    TAB_LOADER_TIMEOUT_MS,
    "Loading students"
  );

  // Discarding this error turned an RLS rejection into `data: null` -> no
  // student ids -> an empty homework list, so a class with plenty of homework
  // rendered "no homework assigned" with no error anywhere.
  if (studentsError) {
    throw new Error(queryErrorMessage(studentsError, "Failed to load students."));
  }

  const studentIds = students.map((s) => s.id);
  if (studentIds.length === 0) return [];

  const { data, error } = await withTimeout(
    fetchAllRows((from, to) =>
      supabase
        .from("homework_assignments")
        .select(HOMEWORK_LIST_COLUMNS)
        .in("student_id", studentIds)
        .order("assigned_at", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    TAB_LOADER_TIMEOUT_MS,
    "Loading homework"
  );

  if (error) {
    throw new Error(queryErrorMessage(error, "Failed to load homework."));
  }

  return data as unknown as HomeworkAssignmentRow[];
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
  const myGen = ++loadGeneration;
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

      // Drop if a newer load superseded this one (same key, concurrent refresh)
      // or the session's key changed while we were fetching.
      if (storeSnapshot.cacheKey !== loadKey || myGen !== loadGeneration) return;

      writeSessionCache(loadKey, assignments);
      publishStore({
        assignments,
        hydrated: true,
        loadError: null,
        cacheKey: loadKey,
      });
    } catch (error) {
      console.error("Failed to load homework assignments:", error);
      if (storeSnapshot.cacheKey !== loadKey || myGen !== loadGeneration) return;

      publishStore({
        assignments: [],
        hydrated: true,
        loadError: formatLoadError(error),
        cacheKey: loadKey,
      });
    } finally {
      // Only clear the guard if no newer load superseded this one — a
      // concurrent refresh may have already installed its own promise.
      if (myGen === loadGeneration) loadInFlight = null;
    }
  })();

  await loadInFlight;
}

export function useHomeworkAssignments() {
  const workspaceSession = useWorkspaceSession();
  const {
    assignments: storeAssignments,
    hydrated: storeHydrated,
    loadError,
    cacheKey: storeCacheKey,
  } = useSyncExternalStore(subscribeToStore, getStoreSnapshot, getServerStoreSnapshot);

  const cacheKey = workspaceSession && !isSoloSession(workspaceSession)
    ? workspaceSession.role === "student"
      ? `student:${workspaceSession.id}`
      : workspaceSession.role === "mentor"
        ? `mentor:${classOwner(workspaceSession)}`
        : null
    : null;

  // Solo practice and signed-out sessions have no homework workspace, so there
  // is nothing to load and never will be. Report that as hydrated-with-zero
  // rather than never-hydrated: callers gate their first paint on `hydrated`
  // (ChallengeRedirectGuard, HomeworkWorkspace, HomeworkClient), so leaving it
  // false forever left solo students on a permanent spinner for every challenge.
  const hasWorkspace = cacheKey !== null;

  // Only serve rows that belong to the ACTIVE workspace. The store is a module
  // global, so without this a student leaving a class for solo would keep the
  // old class's assignments — and now that solo reports hydrated, `isAssigned`
  // would redirect them into /homework for challenges they're no longer
  // assigned. Also covers the render before ensureHomeworkLoaded re-keys.
  const assignments =
    hasWorkspace && storeCacheKey === cacheKey ? storeAssignments : NO_ASSIGNMENTS;
  const hydrated = hasWorkspace ? storeHydrated : true;

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
    async (
      challengeId: number,
      code: string
    ): Promise<{ ok: boolean; error: string | null }> => {
      const session = getSession();
      if (!session || session.role !== "student") {
        return { ok: false, error: "Sign in as a student to save homework." };
      }

      let res: Response;
      try {
        res = await fetch("/api/student/homework", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: session.id,
            challengeId,
            code,
          }),
        });
      } catch {
        return { ok: false, error: "Network error — could not save homework." };
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        completed_at?: string;
      };

      if (!res.ok) {
        const message = body.error ?? "Failed to mark homework complete.";
        console.error("Failed to mark homework complete:", message);
        return { ok: false, error: message };
      }

      const now = body.completed_at ?? new Date().toISOString();
      const current = getStoreSnapshot().assignments;
      const next = current.map((a) =>
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
      if (storeSnapshot.cacheKey) {
        writeSessionCache(storeSnapshot.cacheKey, next);
      }
      return { ok: true, error: null };
    },
    []
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

      const next = getStoreSnapshot().assignments.filter(
        (a) => a.id !== assignmentId
      );
      publishStore({
        assignments: next,
        hydrated: true,
        loadError: null,
        cacheKey: storeSnapshot.cacheKey,
      });
      if (storeSnapshot.cacheKey) {
        writeSessionCache(storeSnapshot.cacheKey, next);
      }
      return { error: null };
    },
    []
  );

  return {
    assignments,
    assignedIds,
    hydrated,
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
