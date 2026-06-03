"use client";

import { CheckCircle2, Circle } from "lucide-react";

interface BlocksGuideRailProps {
  steps: string[];
  completedStepIndex: number;
}

export default function BlocksGuideRail({
  steps,
  completedStepIndex,
}: BlocksGuideRailProps) {
  if (steps.length === 0) return null;

  return (
    <div className="shrink-0 w-52 border-l border-slate-800/80 bg-slate-900/40 p-3 overflow-y-auto hidden lg:block">
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">
        Blocks guide
      </p>
      <ol className="space-y-2">
        {steps.map((step, i) => {
          const done = i <= completedStepIndex;
          return (
            <li
              key={i}
              className={`flex gap-2 text-[11px] leading-snug ${
                done ? "text-slate-400" : "text-slate-200"
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500/80" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              )}
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
