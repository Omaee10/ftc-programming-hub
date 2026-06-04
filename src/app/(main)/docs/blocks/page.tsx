"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react";
import dynamic from "next/dynamic";
import { BLOCKS_DOC } from "@/data/blocksDoc";
import { DOC_WORKSPACES } from "@/data/blocksDocWorkspaces";
import { MINI_WORKSPACES } from "@/data/blocksDocMiniWorkspaces";
import { FULL_TOOLBOX } from "@/lib/blockly/ftcBlocks";

// ── Blockly loaded lazily (browser-only) ────────────────────────────────────
const BlocklyWorkspace = dynamic(() => import("@/components/BlocklyWorkspace"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-900">
      <div className="text-xs text-slate-600">Loading blocks…</div>
    </div>
  ),
});

// ── Category metadata ────────────────────────────────────────────────────────
type CategoryId = "motors" | "servos" | "gamepad" | "telemetry" | "sensors" | "math";

const CATEGORIES: { id: CategoryId; label: string; intro: string }[] = [
  {
    id: "math",
    label: "Math",
    intro:
      "Math blocks produce numeric values — plug them into any slot that expects a number. Use Negate on joystick Y-axes, Deadzone to eliminate stick drift, and max/min to clamp motor power to [−1, 1].",
  },
  {
    id: "motors",
    label: "Motors",
    intro:
      "Motor blocks control DC motors wired to the REV Control Hub. Get hardware during init (before waitForStart), configure direction and zero-power behavior once, then use Set Power inside the while-active loop every frame.",
  },
  {
    id: "servos",
    label: "Servos",
    intro:
      "Standard Servo uses Set Position (0.0–1.0) to move to a fixed angle. CRServo (continuous rotation) spins like a slow motor — use Set Power (−1.0–1.0) instead. The two types are not interchangeable.",
  },
  {
    id: "gamepad",
    label: "Gamepad",
    intro:
      "Gamepad blocks read live input from the driver controllers every loop frame. Important: Y-axes are inverted — pushing forward returns −1.0. Always wrap stick Y values in a Negate block for forward drive.",
  },
  {
    id: "telemetry",
    label: "Telemetry",
    intro:
      "Telemetry blocks send data to the Driver Station screen. Telemetry Add buffers a line; Telemetry Update flushes the buffer to the screen. Update must be called at the end of every loop or nothing will appear.",
  },
  {
    id: "sensors",
    label: "Sensors",
    intro:
      "Sensor blocks read physical hardware attached to the Control Hub. Retrieve each sensor with a Get Hardware block during init, then read it inside the loop. Hardware names must exactly match the Driver Station robot configuration.",
  },
];

// ── Page component ────────────────────────────────────────────────────────────
export default function BlocksDocsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("math");

  // ── Resizable split (mirrors ChallengeWorkspace) ─────────────────────────
  const [leftPct, setLeftPct] = useState(42);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.max(28, Math.min(65, pct)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleDividerDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // ── Question answer state: "catId_qIdx" → selected option index ──────────
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const answerQuestion = useCallback((catId: string, qIdx: number, optIdx: number) => {
    setAnswers((prev) => {
      const key = `${catId}_${qIdx}`;
      if (key in prev) return prev; // already answered — lock it
      return { ...prev, [key]: optIdx };
    });
  }, []);

  const category = CATEGORIES.find((c) => c.id === activeCategory)!;
  const docData = BLOCKS_DOC.find((d) => d.id === activeCategory);
  const workspace = DOC_WORKSPACES[activeCategory];

  return (
    <div
      className="flex w-full flex-col overflow-hidden"
      style={{ height: "calc(100svh - 3rem)" }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-slate-800/60 bg-slate-950/95 px-4 backdrop-blur-md">
        <span className="text-xs font-semibold text-slate-300">FTC Blocks Reference</span>
        <span className="text-slate-700 text-xs">/</span>
        <span className="text-xs text-slate-500">
          Visual examples for Motors, Servos, Gamepad, Telemetry, Sensors &amp; Math
        </span>
      </div>

      {/* ── Split body ──────────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex min-w-0 flex-1 overflow-hidden">

        {/* ── LEFT: docs panel ──────────────────────────────────────────── */}
        <aside
          className="flex min-w-0 shrink-0 flex-col overflow-hidden border-r border-slate-800"
          style={{ width: `${leftPct}%` }}
        >
          {/* Category tab bar */}
          <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-slate-800/60 bg-slate-950/80 px-2 py-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "tab-active-pill"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Scrollable doc content */}
          <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-5">

            {/* Category intro */}
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-slate-600">
                {category.label}
              </p>
              <p className="text-sm leading-relaxed text-slate-400">
                {category.intro}
              </p>
            </div>

            {/* Block entries */}
                {docData && (
              <div className="space-y-4">
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
                  Blocks in this category
                </p>
                {docData.blocks.map((block) => {
                  const miniWs = block.miniWorkspaceKey
                    ? MINI_WORKSPACES[block.miniWorkspaceKey]
                    : undefined;
                  return (
                    <div
                      key={block.name}
                      className="rounded-lg border border-slate-800/60 bg-slate-900/30 overflow-hidden"
                    >
                      {/* Block name header */}
                      <div
                        className="px-3 py-2 border-b border-slate-800/60"
                        style={{
                          borderLeftColor: docData.colour,
                          borderLeftWidth: 3,
                        }}
                      >
                        <p className="text-[11px] font-semibold text-slate-200">
                          {block.name}
                        </p>
                      </div>

                      {/* Description + Java example + inline block visual */}
                      <div className="px-3 py-2.5 space-y-2">
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          {block.description}
                        </p>
                        {block.example && (
                          <pre className="overflow-x-auto rounded bg-slate-950/70 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-slate-400 border border-slate-800/50 whitespace-pre-wrap">
                            {block.example}
                          </pre>
                        )}
                        {/* Inline Blockly block visual */}
                        {miniWs && (
                          <div
                            className="overflow-hidden rounded border border-slate-800/50"
                            style={{ height: 110 }}
                          >
                            <BlocklyWorkspace
                              key={`${activeCategory}_${block.name}`}
                              toolbox={FULL_TOOLBOX}
                              initialState={miniWs}
                              starterState={miniWs}
                              resetSignal={0}
                              dark={true}
                              visible={true}
                              readOnly={true}
                              onChange={() => {}}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Quick check questions ────────────────────────────────── */}
            {docData?.questions && docData.questions.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
                  Quick check
                </p>
                {docData.questions.map((q, qIdx) => {
                  const key = `${activeCategory}_${qIdx}`;
                  const selected = answers[key];
                  const answered = selected !== undefined;
                  const correct = q.correctIndex;
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-800/60 bg-slate-900/30 overflow-hidden"
                    >
                      <div className="px-3 py-2.5 space-y-2">
                        <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                          {q.prompt}
                        </p>
                        <div className="space-y-1.5">
                          {q.options.map((opt, oIdx) => {
                            let optStyle =
                              "w-full text-left rounded px-2.5 py-1.5 text-[10px] leading-snug border transition-colors ";
                            if (!answered) {
                              optStyle +=
                                "border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-300 cursor-pointer";
                            } else if (oIdx === correct) {
                              optStyle +=
                                "border-emerald-700/60 bg-emerald-950/40 text-emerald-300 cursor-default";
                            } else if (oIdx === selected) {
                              optStyle +=
                                "border-red-700/60 bg-red-950/40 text-red-400 cursor-default";
                            } else {
                              optStyle +=
                                "border-slate-800/40 bg-slate-900/20 text-slate-600 cursor-default";
                            }
                            return (
                              <button
                                key={oIdx}
                                className={optStyle}
                                onClick={() => answerQuestion(activeCategory, qIdx, oIdx)}
                                disabled={answered}
                              >
                                <span className="mr-2 font-mono text-[9px] opacity-60">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {answered && (
                          <p className="text-[10px] leading-relaxed text-slate-500 border-t border-slate-800/60 pt-2">
                            <span className="font-semibold text-slate-400">Explanation: </span>
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── Drag handle ───────────────────────────────────────────────── */}
        <div
          onMouseDown={handleDividerDown}
          className="group relative flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-slate-800 hover:accent-fill active:accent-fill transition-colors"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="h-8 w-0.5 rounded-full bg-slate-700 group-hover:bg-zinc-200/60 transition-colors" />
        </div>

        {/* ── RIGHT: Blockly workspace ───────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-slate-800/60 bg-slate-950/80 px-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
              Example — read only
            </span>
            <span className="ml-auto text-[10px] text-slate-700">
              Switch category on the left to see different blocks
            </span>
          </div>

          {/* Blockly canvas */}
          <div className="min-h-0 flex-1">
            {workspace && (
              <BlocklyWorkspace
                key={activeCategory}
                toolbox={FULL_TOOLBOX}
                initialState={workspace}
                starterState={workspace}
                resetSignal={0}
                dark={true}
                visible={true}
                readOnly={true}
                onChange={() => {}}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
