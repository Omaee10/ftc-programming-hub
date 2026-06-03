"use client";

import type { EditorMode } from "@/lib/blockly/types";

interface EditorModeSwitchProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

export default function EditorModeSwitch({
  mode,
  onModeChange,
}: EditorModeSwitchProps) {
  return (
    <div
      className="flex items-center rounded-md border border-slate-800/80 bg-slate-900/80 p-0.5"
      role="tablist"
      aria-label="Editor mode"
    >
      {(["java", "blocks"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => onModeChange(m)}
          className={`rounded px-2.5 py-0.5 text-[11px] font-medium transition-all ${
            mode === m
              ? "bg-slate-700/80 text-slate-100 shadow-sm"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {m === "java" ? "Java" : "Blocks"}
        </button>
      ))}
    </div>
  );
}

interface ModeSwitchDialogProps {
  open: boolean;
  targetMode: EditorMode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ModeSwitchDialog({
  open,
  targetMode,
  onConfirm,
  onCancel,
}: ModeSwitchDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-switch-title"
    >
      <div className="max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl">
        <h2 id="mode-switch-title" className="text-sm font-semibold text-slate-100">
          Switch to {targetMode === "java" ? "Java" : "Blocks"}?
        </h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Switching editor modes may replace your current work in the other view.
          Unsaved changes in {targetMode === "java" ? "Blocks" : "Java"} might be
          lost unless you already saved a draft.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-amber-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
          >
            Switch
          </button>
        </div>
      </div>
    </div>
  );
}
