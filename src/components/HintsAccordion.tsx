"use client";

import { useState } from "react";
import { Lightbulb, ChevronDown, Eye, EyeOff } from "lucide-react";

interface HintsAccordionProps {
  hints: string[];
}

export default function HintsAccordion({ hints }: HintsAccordionProps) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const revealHint = (i: number) => {
    setRevealed((prev) => new Set(prev).add(i));
  };

  const allRevealed = revealed.size === hints.length;

  return (
    <div className="rounded-xl border border-amber-500/15 bg-amber-500/3 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/4"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-4 w-4 text-zinc-100 shrink-0" />
          <span className="text-sm font-semibold text-zinc-200">
            Hints
          </span>
          <span className="rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] font-bold text-zinc-100">
            {hints.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-200/60">
            {open ? "Hide" : "Show hints"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-zinc-200/60 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Hints list */}
      {open && (
        <div className="border-t border-amber-500/10 divide-y divide-amber-500/8">
          {hints.map((hint, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3.5">
              {/* Number badge */}
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-white/8 text-[10px] font-bold text-zinc-100 mt-0.5">
                {i + 1}
              </span>

              <div className="flex-1 min-w-0">
                {revealed.has(i) ? (
                  <p className="break-words text-sm text-slate-300 leading-relaxed">
                    {hint}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-600 italic select-none flex-1">
                      Hint {i + 1} — click to reveal
                    </p>
                    <button
                      onClick={() => revealHint(i)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:border-white/20 hover:text-zinc-100 transition-all"
                    >
                      <Eye className="h-3 w-3" />
                      Reveal
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Footer actions */}
          <div className="flex items-center justify-between px-5 py-3 bg-amber-500/3">
            {!allRevealed ? (
              <button
                onClick={() =>
                  setRevealed(new Set(hints.map((_, i) => i)))
                }
                className="text-xs text-zinc-200/60 hover:text-zinc-100 transition-colors"
              >
                Reveal all hints
              </button>
            ) : (
              <button
                onClick={() => setRevealed(new Set())}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <EyeOff className="h-3 w-3" />
                Hide all
              </button>
            )}
            <span className="text-[10px] text-zinc-200/40">
              {revealed.size} / {hints.length} revealed
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
