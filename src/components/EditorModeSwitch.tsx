"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { EditorMode } from "@/lib/blockly/types";

/** Above Blockly flyout/widget layers (Blockly uses up to ~100000). */
const MODE_SWITCH_DIALOG_Z = 100_001;

interface EditorModeSwitchProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  /** When true, Blocks tab is disabled (advanced Java-only challenges). */
  blocksDisabled?: boolean;
  blocksDisabledTitle?: string;
}

export default function EditorModeSwitch({
  mode,
  onModeChange,
  blocksDisabled = false,
  blocksDisabledTitle = "This challenge uses libraries that aren't in Blocks yet — use Java.",
}: EditorModeSwitchProps) {
  return (
    <div
      className="flex items-center rounded-md border border-slate-800/80 bg-slate-900/80 p-0.5"
      role="tablist"
      aria-label="Editor mode"
    >
      {(["java", "blocks"] as const).map((m) => {
        const disabled = m === "blocks" && blocksDisabled;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            disabled={disabled}
            title={disabled ? blocksDisabledTitle : undefined}
            onClick={() => !disabled && onModeChange(m)}
            className={`rounded px-2.5 py-0.5 text-[11px] font-medium transition-all ${
              disabled
                ? "cursor-not-allowed text-slate-700 opacity-50"
                : mode === m
                  ? m === "blocks"
                    ? "bg-indigo-600/90 text-white shadow-sm ring-1 ring-indigo-400/40"
                    : "bg-slate-700/80 text-slate-100 shadow-sm"
                  : m === "blocks"
                    ? "text-indigo-400/90 hover:text-indigo-300"
                    : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {m === "java" ? "OnBot Java" : "FTC Blocks"}
          </button>
        );
      })}
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
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-4"
      style={{ zIndex: MODE_SWITCH_DIALOG_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-switch-title"
      onClick={onCancel}
    >
      <div
        className="max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="mode-switch-title" className="text-sm font-semibold text-slate-100">
          Switch to {targetMode === "java" ? "OnBot Java" : "FTC Blocks"}?
        </h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Switching editor modes may replace your current work in the other view.
          Unsaved changes in{" "}
          {targetMode === "java" ? "FTC Blocks" : "OnBot Java"} might be lost
          unless you already saved a draft.
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
    </div>,
    document.body
  );
}
