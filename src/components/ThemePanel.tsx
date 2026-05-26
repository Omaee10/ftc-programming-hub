"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, X } from "lucide-react";
import { ACCENT_OPTIONS, getAccent, saveAccent, type Accent } from "@/lib/accent";

type Mode = "dark" | "midnight" | "light" | "paper";

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "dark",     label: "Dark",      desc: "Soft charcoal — easy on the eyes" },
  { id: "midnight", label: "Midnight",  desc: "Pure black, OLED-friendly" },
  { id: "light",    label: "Light",     desc: "Crisp white panels" },
  { id: "paper",    label: "Paper",     desc: "Warm cream, lower contrast" },
];

/** Map accent hex to RGB triplet for CSS `rgb(var(--preview))`. */
function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

interface ThemePanelProps {
  onClose: () => void;
}

export default function ThemePanel({ onClose }: ThemePanelProps) {
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState<Accent>(getAccent);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);

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
      className="theme-panel-shell absolute right-2 top-14 z-50 w-[19.5rem] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b dash-divider px-4 py-3">
        <span className="theme-section-label">Theme</span>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-100/5 transition-colors duration-200 ease-out"
          aria-label="Close theme panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Mode selector */}
        <div>
          <p className="theme-section-label mb-3">Mode</p>
          <div className="grid grid-cols-2 gap-2.5">
            {MODES.map((m) => {
              const active = theme === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  data-active={active ? "true" : "false"}
                  onClick={() => setTheme(m.id)}
                  className="theme-mode-card flex flex-col items-start gap-1 rounded-lg px-4 py-3.5 text-left"
                >
                  {active && (
                    <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--accent))] shadow-[0_0_10px_rgb(var(--accent)/0.45)]">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                  <span className="text-[13px] font-semibold leading-none text-slate-100 pr-5">
                    {m.label}
                  </span>
                  <span className="theme-mode-desc">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent colour */}
        <div>
          <p className="theme-section-label mb-3">Accent colour</p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map((opt) => {
              const active = accent === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-active={active ? "true" : "false"}
                  onClick={() => handleAccent(opt.id)}
                  title={opt.label}
                  className="theme-accent-tag inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide text-slate-300"
                  style={{ "--preview": hexToRgbTriplet(opt.color) } as React.CSSProperties}
                >
                  <span
                    className="theme-accent-dot"
                    style={{ backgroundColor: opt.color }}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[11px] leading-relaxed text-slate-500/90">
          Mode controls page surfaces; accent colour tints active elements
          and highlights. Both are saved to your browser.
        </p>
      </div>
    </div>
  );
}
