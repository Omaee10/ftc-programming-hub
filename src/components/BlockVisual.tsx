/**
 * Renders static Blockly-style block visuals for the FTC Blocks documentation
 * page. These are purely decorative — no Blockly runtime is loaded.
 *
 * Shape conventions:
 *   StatementBlock  — colored rectangle with puzzle-tab connectors (top/bottom)
 *   ReporterBlock   — rounded pill shape (outputs a Number)
 *   BooleanBlock    — hexagonal/pointed pill (outputs a Boolean)
 *   ContainerBlock  — C-shaped block with a body slot (while loops, if, etc.)
 *
 * Inline content helpers:
 *   <Dropdown>   — dark rounded chip with ▾ arrow (field_dropdown)
 *   <TextChip>   — dark rounded chip without arrow (field_input / field_ftc_name)
 *   <NumInput>   — white translucent slot for plugging in a Number reporter
 *   <BoolInput>  — same but for Boolean reporters
 */

import React from "react";

// ── Colour utilities ───────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function darken(hex: string, amount = 0.22): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - amount))},${Math.round(g * (1 - amount))},${Math.round(b * (1 - amount))})`;
}

function lighten(hex: string, amount = 0.18): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amount))},${Math.min(255, Math.round(g + (255 - g) * amount))},${Math.min(255, Math.round(b + (255 - b) * amount))})`;
}

// ── Inline field helpers ───────────────────────────────────────────────────

/** A dropdown field chip — shows the selected option with a ▾ arrow */
export function Dropdown({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[11px] font-semibold leading-none select-none"
      style={{ backgroundColor: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.95)" }}
    >
      {children}
      <svg width="7" height="5" viewBox="0 0 7 5" className="shrink-0 opacity-70">
        <path d="M0 0 L7 0 L3.5 5 Z" fill="currentColor" />
      </svg>
    </span>
  );
}

/** A name / text-input field chip — no arrow */
export function TextChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold leading-none select-none"
      style={{ backgroundColor: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.95)" }}
    >
      {children}
    </span>
  );
}

/** A white slot where a Number reporter block plugs in */
export function NumInput({ children }: { children?: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[11px] leading-none min-w-[28px]"
      style={{
        backgroundColor: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.28)",
        color: "rgba(255,255,255,0.7)",
      }}
    >
      {children ?? <>&nbsp;&nbsp;&nbsp;</>}
    </span>
  );
}

/** A slot where a Boolean reporter block plugs in */
export function BoolInput({ children }: { children?: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center text-[11px] leading-none min-w-[28px] px-2 py-0.5"
      style={{
        backgroundColor: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.28)",
        color: "rgba(255,255,255,0.7)",
        clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%)",
        padding: "4px 14px",
      }}
    >
      {children ?? <>&nbsp;&nbsp;&nbsp;</>}
    </span>
  );
}

// ── Block connectors ───────────────────────────────────────────────────────

/** The puzzle-tab that sticks out (previous connection at top) */
function TopTab({ colour }: { colour: string }) {
  return (
    <div className="flex" style={{ height: 8, marginLeft: 16 }}>
      <svg width="28" height="8" viewBox="0 0 28 8">
        <path
          d="M 0,8 L 0,4 C 0,0 2,0 4,0 L 8,0 C 10,0 10,4 14,4 C 18,4 18,0 20,0 L 24,0 C 26,0 28,0 28,4 L 28,8 Z"
          fill={colour}
        />
      </svg>
    </div>
  );
}

/** The puzzle-slot at the bottom (next connection) */
function BottomSlot({ colour }: { colour: string }) {
  return (
    <div className="flex" style={{ height: 8, marginLeft: 16 }}>
      <svg width="28" height="8" viewBox="0 0 28 8">
        <path
          d="M 0,0 L 28,0 L 28,4 C 28,8 26,8 24,8 L 20,8 C 18,8 18,4 14,4 C 10,4 10,8 8,8 L 4,8 C 2,8 0,8 0,4 Z"
          fill={colour}
        />
      </svg>
    </div>
  );
}

// ── StatementBlock ─────────────────────────────────────────────────────────

interface StatementBlockProps {
  colour: string;
  hasPrevious?: boolean;
  hasNext?: boolean;
  children: React.ReactNode;
}

export function StatementBlock({
  colour,
  hasPrevious = true,
  hasNext = true,
  children,
}: StatementBlockProps) {
  const shadow = darken(colour, 0.28);
  const highlight = lighten(colour, 0.12);
  return (
    <div className="inline-flex flex-col" style={{ filter: "drop-shadow(2px 3px 4px rgba(0,0,0,0.45))" }}>
      {hasPrevious && <TopTab colour={colour} />}
      <div
        className="flex items-center gap-1.5 px-3 py-2 text-white text-[12px] font-semibold whitespace-nowrap"
        style={{
          backgroundColor: colour,
          borderTop: `1px solid ${highlight}`,
          borderBottom: `1px solid ${shadow}`,
          borderRadius: !hasPrevious && !hasNext ? 4 : 0,
          borderTopLeftRadius: !hasPrevious ? 4 : 0,
          borderTopRightRadius: !hasPrevious ? 4 : 0,
          borderBottomLeftRadius: !hasNext ? 4 : 0,
          borderBottomRightRadius: !hasNext ? 4 : 0,
          minHeight: 36,
          fontFamily: "'Roboto Mono', 'Fira Code', monospace",
        }}
      >
        {children}
      </div>
      {hasNext && <BottomSlot colour={colour} />}
    </div>
  );
}

// ── ReporterBlock (number output) ──────────────────────────────────────────

export function ReporterBlock({
  colour,
  children,
}: {
  colour: string;
  children: React.ReactNode;
}) {
  const shadow = darken(colour, 0.28);
  const highlight = lighten(colour, 0.12);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-[12px] font-semibold whitespace-nowrap"
      style={{
        backgroundColor: colour,
        borderRadius: 999,
        borderTop: `1px solid ${highlight}`,
        borderBottom: `2px solid ${shadow}`,
        filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.4))",
        fontFamily: "'Roboto Mono', 'Fira Code', monospace",
      }}
    >
      {children}
    </span>
  );
}

// ── BooleanBlock (boolean output) ──────────────────────────────────────────

export function BooleanBlock({
  colour,
  children,
}: {
  colour: string;
  children: React.ReactNode;
}) {
  const shadow = darken(colour, 0.28);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-white text-[12px] font-semibold whitespace-nowrap"
      style={{
        backgroundColor: colour,
        borderBottom: `2px solid ${shadow}`,
        clipPath:
          "polygon(10px 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0% 50%)",
        filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.4))",
        fontFamily: "'Roboto Mono', 'Fira Code', monospace",
      }}
    >
      {children}
    </span>
  );
}

// ── ContainerBlock (C-shape: while, if) ────────────────────────────────────

interface ContainerBlockProps {
  colour: string;
  header: React.ReactNode;
  children?: React.ReactNode;
  hasNext?: boolean;
}

export function ContainerBlock({
  colour,
  header,
  children,
  hasNext = true,
}: ContainerBlockProps) {
  const shadow = darken(colour, 0.28);
  const highlight = lighten(colour, 0.12);
  const armWidth = 28;
  return (
    <div
      className="inline-flex flex-col"
      style={{ filter: "drop-shadow(2px 3px 4px rgba(0,0,0,0.45))" }}
    >
      <TopTab colour={colour} />
      {/* Header row */}
      <div
        className="flex items-center gap-1.5 px-3 py-2 text-white text-[12px] font-semibold whitespace-nowrap"
        style={{
          backgroundColor: colour,
          borderTop: `1px solid ${highlight}`,
          minHeight: 36,
          fontFamily: "'Roboto Mono', 'Fira Code', monospace",
        }}
      >
        {header}
      </div>
      {/* Body with left arm */}
      <div className="flex">
        {/* Left arm */}
        <div
          style={{
            width: armWidth,
            backgroundColor: colour,
            borderRight: "none",
          }}
        />
        {/* Inner content area */}
        <div
          className="flex-1 py-2 pl-2 pr-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.18)",
            minHeight: 34,
            minWidth: 80,
          }}
        >
          {children}
        </div>
      </div>
      {/* Bottom arm / closing row */}
      <div
        style={{
          backgroundColor: colour,
          height: 14,
          borderBottom: `2px solid ${shadow}`,
        }}
      />
      {hasNext && <BottomSlot colour={colour} />}
    </div>
  );
}

// ── BlockStack ─────────────────────────────────────────────────────────────

/**
 * Stacks multiple StatementBlock components so they connect seamlessly.
 * Pass individual blocks as children; the component handles spacing.
 */
export function BlockStack({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex flex-col">{children}</div>;
}
