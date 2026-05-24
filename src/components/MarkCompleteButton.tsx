"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import { getSession } from "@/lib/auth";

interface MarkCompleteButtonProps {
  challengeId: number;
  xp: number;
  /** The last grade returned by the grader, or null if code hasn't been submitted yet. */
  lastGrade?: "good" | "needs-improvement" | "wrong" | null;
}

export default function MarkCompleteButton({
  challengeId,
  xp,
  lastGrade,
}: MarkCompleteButtonProps) {
  const local = useChallengeProgress();
  const db = useSupabaseProgress(challengeId);

  const [justCompleted, setJustCompleted] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIsMentor(getSession()?.role === "mentor");
  }, []);

  // Reset animation flag when it plays through
  useEffect(() => {
    if (!justCompleted) return;
    const t = setTimeout(() => setJustCompleted(false), 2500);
    return () => clearTimeout(t);
  }, [justCompleted]);

  // Mentors don't track personal progress — hide the button entirely
  if (isMentor) return null;

  const hydrated = local.hydrated && db.hydrated;

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  const done = local.isCompleted(challengeId) || db.isCompleted(challengeId);

  if (done) {
    return (
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/15 bg-emerald-500/5 px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-emerald-400">Completed</span>
            <span className="text-xs text-emerald-700">+{xp} XP earned</span>
          </div>
        </div>
        <button
          onClick={async () => {
            setBusy(true);
            local.markIncomplete(challengeId);
            await db.markIncomplete(challengeId);
            setBusy(false);
          }}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          Reset
        </button>
      </div>
    );
  }

  const handleMarkComplete = async () => {
    if (lastGrade !== "good") {
      const confirmed = window.confirm(
        lastGrade == null
          ? "You haven't submitted your code to the grader yet. Mark this challenge complete anyway?"
          : "Your code hasn't passed all checks yet. Mark this challenge complete anyway?"
      );
      if (!confirmed) return;
    }
    setBusy(true);
    local.markComplete(challengeId);
    await db.markComplete(challengeId);
    setBusy(false);
    setJustCompleted(true);
  };

  return (
    <button
      onClick={handleMarkComplete}
      disabled={busy}
      className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-60 ${
        justCompleted
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
          : "btn-primary border border-transparent"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      <span>{justCompleted ? `+${xp} XP earned!` : "Mark as Complete"}</span>
      {!justCompleted && (
        <span className="ml-0.5 text-xs text-white/70 font-normal">+{xp} XP</span>
      )}
    </button>
  );
}
