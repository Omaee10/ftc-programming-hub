"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Check, X } from "lucide-react";
import { ACCENT_OPTIONS, getAccent, saveAccent, type Accent } from "@/lib/accent";
import { useState } from "react";

type Mode = "dark" | "midnight" | "light" | "paper";

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "dark",     label: "Dark",      desc: "default — zinc-950 base" },
  { id: "midnight", label: "Midnight",  desc: "pure black, OLED-friendly" },
  { id: "light",    label: "Light",     desc: "crisp white panels" },
  { id: "paper",    label: "Paper",     desc: "warm cream, lower contrast" },
];

interface ThemePanelProps {
  onClose: () => void;
}

export default function ThemePanel({ onClose }: ThemePanelProps) {
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState<Accent>(getAccent);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleAccent(a: Accent) {
    setAccent(a);
    saveAccent(a);
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-2 top-14 z-50 w-80 rounded-xl border border-slate-800/80 bg-slate-900 shadow-2xl shadow-black/40"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Theme
        </span>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Mode selector */}
        <div>
          <p className="mb-2.5 text-[11px] font-medium text-slate-500">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const active = theme === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setTheme(m.id)}
                  className={[
                    "relative flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                    active
                      ? "border-[rgb(var(--accent)/0.6)] bg-[rgb(var(--accent)/0.08)] text-slate-100"
                      : "border-slate-800/70 bg-slate-800/30 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/50",
                  ].join(" ")}
                >
                  {active && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--accent))]">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                  <span className="text-[13px] font-semibold leading-none text-slate-100">
                    {m.label}
                  </span>
                  <span className="text-[11px] leading-snug text-slate-500">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent colour */}
        <div>
          <p className="mb-2.5 text-[11px] font-medium text-slate-500">Accent colour</p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map((opt) => {
              const active = accent === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleAccent(opt.id)}
                  title={opt.label}
                  className={[
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150",
                    active
                      ? "accent-bg text-slate-100 accent-border"
                      : "border-slate-800/70 bg-slate-800/30 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/50",
                  ].join(" ")}
                  style={active ? { borderColor: opt.color } : undefined}
                >
                  <span
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ background: opt.color }}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[11px] leading-relaxed text-slate-600">
          Mode controls page surfaces; accent colour tints active elements
          and highlights. Both are saved to your browser.
        </p>
      </div>
    </div>
  );
}
