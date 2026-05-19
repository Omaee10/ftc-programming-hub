"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";

interface MarkCompleteButtonProps {
  challengeId: number;
  xp: number;
}

export default function MarkCompleteButton({
  challengeId,
  xp,
}: MarkCompleteButtonProps) {
  const { isCompleted, markComplete, markIncomplete, hydrated } =
    useChallengeProgress();

  const [justCompleted, setJustCompleted] = useState(false);

  // Reset animation flag when it plays through
  useEffect(() => {
    if (!justCompleted) return;
    const t = setTimeout(() => setJustCompleted(false), 2500);
    return () => clearTimeout(t);
  }, [justCompleted]);

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading progress…
      </div>
    );
  }

  const done = isCompleted(challengeId);

  if (done) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Completed badge */}
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-emerald-400">
              Challenge Completed!
            </span>
            <span className="text-xs text-emerald-600">
              +{xp} XP earned
            </span>
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={() => markIncomplete(challengeId)}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-xs font-medium text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset progress
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        markComplete(challengeId);
        setJustCompleted(true);
      }}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
        justCompleted
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10"
      }`}
    >
      {/* Shimmer effect on hover */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      {justCompleted ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}

      <span>
        {justCompleted ? `+${xp} XP earned!` : "Mark as Complete"}
      </span>

      {!justCompleted && (
        <span className="ml-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold">
          +{xp} XP
        </span>
      )}
    </button>
  );
}
