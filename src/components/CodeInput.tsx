"use client";

import { useRef } from "react";

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
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const focus = (idx: number) => refs.current[idx]?.focus();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[idx].trim()) {
        const next = digits.map((d, i) => (i === idx ? " " : d)).join("").trimEnd();
        onChange(next);
      } else if (idx > 0) {
        const next = digits.map((d, i) => (i === idx - 1 ? " " : d)).join("").trimEnd();
        onChange(next);
        focus(idx - 1);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      focus(idx - 1);
    } else if (e.key === "ArrowRight" && idx < 5) {
      focus(idx + 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const next = digits.map((d, i) => (i === idx ? char : d)).join("").trimEnd();
    onChange(next);
    if (idx < 5) focus(idx + 1);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      focus(Math.min(pasted.length, 5));
    }
    e.preventDefault();
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
          maxLength={1}
          value={d.trim()}
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
