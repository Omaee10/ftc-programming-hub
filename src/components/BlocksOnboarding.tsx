"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { readBlocksPrefs, saveBlocksPrefs } from "@/lib/blocksPrefs";

const STEPS = [
  {
    title: "Toolbox",
    body: "Drag blocks from the left toolbox into the runOpMode stack.",
  },
  {
    title: "runOpMode",
    body: "All robot code lives inside the purple runOpMode block — init first, then waitForStart, then your loop.",
  },
  {
    title: "Generated Java",
    body: "Your blocks translate to OnBot Java on the right. Run always grades this Java with the real compiler.",
  },
  {
    title: "Run",
    body: "Press Run to compile and check requirements. Fix blocks or Java errors shown in the console.",
  },
] as const;

interface BlocksOnboardingProps {
  active: boolean;
  onDismiss: () => void;
}

export default function BlocksOnboarding({ active, onDismiss }: BlocksOnboardingProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (active) setStep(0);
  }, [active]);

  const finish = () => {
    saveBlocksPrefs({ onboardingDone: true });
    onDismiss();
  };

  if (!active || typeof document === "undefined") return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[100002] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocks-onboarding-title"
    >
      <div
        className="absolute inset-0 bg-black/55"
        onClick={finish}
        aria-hidden
      />
      <div className="relative max-w-md w-full rounded-lg border border-indigo-500/30 bg-slate-900 p-4 shadow-xl">
        <button
          type="button"
          onClick={finish}
          className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          aria-label="Dismiss guide"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-400 mb-1">
          FTC Blocks — step {step + 1} of {STEPS.length}
        </p>
        <h2
          id="blocks-onboarding-title"
          className="text-sm font-semibold text-slate-100"
        >
          {current.title}
        </h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">{current.body}</p>
        <div className="mt-4 flex justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              className="rounded bg-indigo-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Whether to show the first-run Blocks coach marks. */
export function shouldShowBlocksOnboarding(editorMode: string): boolean {
  if (editorMode !== "blocks") return false;
  return !readBlocksPrefs().onboardingDone;
}
