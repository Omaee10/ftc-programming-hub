"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, type HomeworkAssignmentRow } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

function classOwner(session: { id: string; parentMentorId?: string } | null): string {
  return session?.parentMentorId ?? session?.id ?? "";
}

export function useHomeworkAssignments() {
  const [assignments, setAssignments] = useState<HomeworkAssignmentRow[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setAssignments([]);
      setHydrated(true);
      return;
    }

    if (session.role === "student") {
      const { data, error } = await supabase
        .from("homework_assignments")
        .select("*")
        .eq("student_id", session.id)
        .order("assigned_at", { ascending: false });

      if (error) {
        console.error("Failed to load homework assignments:", error.message);
        setAssignments([]);
      } else {
        setAssignments((data ?? []) as HomeworkAssignmentRow[]);
      }
    } else if (session.role === "mentor") {
      const ownerId = classOwner(session);
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("mentor_id", ownerId);

      const studentIds = ((students ?? []) as { id: string }[]).map((s) => s.id);
      if (studentIds.length === 0) {
        setAssignments([]);
        setHydrated(true);
        return;
      }

      const { data, error } = await supabase
        .from("homework_assignments")
        .select("*")
        .in("student_id", studentIds)
        .order("assigned_at", { ascending: false });

      if (error) {
        console.error("Failed to load class homework:", error.message);
        setAssignments([]);
      } else {
        setAssignments((data ?? []) as HomeworkAssignmentRow[]);
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

      setAssignments((prev) =>
        prev.map((a) =>
          a.challenge_id === challengeId
            ? { ...a, completed: true, completed_at: now, code_snapshot: code }
            : a
        )
      );
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

      await load();
      return { error: null };
    },
    [load]
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

      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      return { error: null };
    },
    []
  );

  const refresh = load;

  return {
    assignments,
    assignedIds,
    hydrated,
    isAssigned,
    getAssignment,
    isHomeworkComplete,
    markHomeworkComplete,
    assignHomework,
    unassignHomework,
    refresh,
  };
}
