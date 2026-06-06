"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import { getSession } from "@/lib/auth";
interface MarkCompleteButtonProps {
  challengeId: number;
  xp: number;
  /** The last grade returned by the grader, or null if code hasn't been submitted yet. */
  lastGrade?: "good" | "needs-improvement" | "wrong" | null;
  /** When set, overrides default progress-based completion check. */
  forceCompleted?: boolean;
  /** Parent-provided completion state (avoids duplicate progress hooks). */
  completed?: boolean;
  /** Parent-provided mark-complete handler. */
  onMarkComplete?: () => Promise<void>;
  /** Parent-provided reset handler for non-homework mode. */
  onMarkIncomplete?: () => Promise<void>;
  /** When false, show a loading placeholder. Defaults to local hydration. */
  progressReady?: boolean;
  /** Custom complete handler (e.g. homework assignments). */
  onComplete?: () => Promise<void>;
  /** Custom reset handler for homework mode. */
  onReset?: () => Promise<void>;
  completeLabel?: string;
}

export default function MarkCompleteButton({
  challengeId,
  xp,
  lastGrade,
  forceCompleted,
  completed: completedProp,
  onMarkComplete,
  onMarkIncomplete,
  progressReady,
  onComplete,
  onReset,
  completeLabel = "Mark as Complete",
}: MarkCompleteButtonProps) {
  const useOwnProgress =
    completedProp === undefined &&
    onMarkComplete === undefined &&
    forceCompleted === undefined;
  const local = useChallengeProgress();
  const db = useSupabaseProgress(useOwnProgress ? challengeId : undefined);

  const [justCompleted, setJustCompleted] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [busy, setBusy] = useState(false);
  const markButtonRef = useRef<HTMLButtonElement>(null);

  const canMarkComplete =
    lastGrade === "good" || lastGrade === "needs-improvement";

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

  const hydrated = progressReady ?? local.hydrated;

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  const done =
    forceCompleted !== undefined
      ? forceCompleted
      : completedProp ??
        (local.isCompleted(challengeId) || db.isCompleted(challengeId));

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
        {onReset && (
          <button
            onClick={async () => {
              setBusy(true);
              try {
                await onReset();
              } finally {
                setBusy(false);
              }
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
        )}
        {!onReset && (
          <button
            onClick={async () => {
              setBusy(true);
              try {
                if (onMarkIncomplete) {
                  await onMarkIncomplete();
                } else {
                  local.markIncomplete(challengeId);
                  await db.markIncomplete(challengeId);
                }
              } finally {
                setBusy(false);
              }
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
        )}
      </div>
    );
  }

  const blockedHint =
    lastGrade == null
      ? "Submit your code to the grader first."
      : lastGrade === "wrong"
        ? "Fix failing checks before marking complete."
        : null;

  const completeChallenge = async () => {
    setBusy(true);
    try {
      if (onComplete) {
        await onComplete();
      } else if (onMarkComplete) {
        await onMarkComplete();
      } else {
        local.markComplete(challengeId);
        await db.markComplete(challengeId);
      }
      setJustCompleted(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        ref={markButtonRef}
        onClick={() => void completeChallenge()}
        disabled={busy || !canMarkComplete}
        title={!canMarkComplete ? (blockedHint ?? undefined) : undefined}
        className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
          justCompleted
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
            : canMarkComplete
              ? "btn-primary border border-transparent"
              : "border border-slate-800 bg-slate-900/60 text-slate-500"
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        <span>{justCompleted ? `+${xp} XP earned!` : completeLabel}</span>
        {!justCompleted && (
          <span className="ml-0.5 text-xs text-white/70 font-normal">+{xp} XP</span>
        )}
      </button>
      {!canMarkComplete && blockedHint && (
        <p className="text-xs text-slate-500">{blockedHint}</p>
      )}
    </div>
  );
}
