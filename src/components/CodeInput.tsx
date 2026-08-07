"use client";

import { useRef } from "react";

const LENGTH = 6;

export default function CodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // Always a gap-free run of digits, so box N maps to character N and callers
  // can trust that a length of LENGTH means a complete code.
  const code = value.replace(/\D/g, "").slice(0, LENGTH);
  const digits = Array.from({ length: LENGTH }, (_, i) => code[i] ?? "");

  // Select as well as focus: after the last box is filled focus has nowhere to
  // advance to, and re-focusing an already-focused input fires no onFocus, so
  // without this the final digit stays unselected and can't be typed over.
  const focus = (idx: number) => {
    const el = refs.current[Math.min(idx, LENGTH - 1)];
    el?.focus();
    el?.select();
  };

  const commit = (next: string, focusIdx: number) => {
    onChange(next);
    focus(focusIdx);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      // Splice rather than blank in place — a hole would leave a stray space
      // that still reads as a full-length code to whoever gates the submit.
      if (digits[idx]) {
        commit(code.slice(0, idx) + code.slice(idx + 1), idx);
      } else if (idx > 0) {
        commit(code.slice(0, idx - 1) + code.slice(idx), idx - 1);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      focus(idx - 1);
    } else if (e.key === "ArrowRight" && idx < LENGTH - 1) {
      focus(idx + 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    // Typing past the end appends instead of opening a hole before it.
    const at = Math.min(idx, code.length);
    commit((code.slice(0, at) + char + code.slice(at + 1)).slice(0, LENGTH), at + 1);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (pasted) commit(pasted, pasted.length);
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          value={d}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onChange={(e) => handleChange(e, i)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className="w-12 h-14 rounded-lg border border-slate-700/60 bg-slate-800/60 text-center text-xl font-bold text-slate-100 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/40 transition-all disabled:opacity-50 caret-transparent"
        />
      ))}
    </div>
  );
}
