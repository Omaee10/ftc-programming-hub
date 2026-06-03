"use client";

/**
 * Blockly canvas for the "FTC Blocks" editor mode.
 *
 * Browser-only (imported via next/dynamic with ssr:false from
 * ChallengeWorkspace). Hosts a Blockly workspace with the challenge's curated
 * toolbox, persists changes upward through `onChange`, and supports resetting to
 * the starter layout. The generated Java is produced elsewhere and never shown.
 */

import { useCallback, useEffect, useRef } from "react";
import * as Blockly from "blockly/core";
import { registerFtcBlocks, type ToolboxJson } from "@/lib/blockly/ftcBlocks";
import type { WorkspaceState } from "@/data/blockChallenges";

// Runtime Blockly object (handles bundler/Node CJS-interop differences).
const BK = ((Blockly as unknown as { default?: typeof Blockly }).default ??
  Blockly) as typeof Blockly;

interface BlocklyWorkspaceProps {
  toolbox: ToolboxJson;
  initialState: WorkspaceState;
  starterState: WorkspaceState;
  /** Incrementing this triggers a reset back to `starterState`. */
  resetSignal: number;
  dark: boolean;
  /** Whether this editor is the visible one (Blockly must resize on show). */
  visible: boolean;
  onChange: (state: WorkspaceState) => void;
}

let themesBuilt = false;
let ftcDarkTheme: Blockly.Theme | null = null;
let ftcLightTheme: Blockly.Theme | null = null;

function ensureThemes(): void {
  if (themesBuilt) return;
  const classic = (BK as unknown as { Themes?: { Classic?: Blockly.Theme } })
    .Themes?.Classic;
  ftcDarkTheme = BK.Theme.defineTheme("ftcBlocksDark", {
    name: "ftcBlocksDark",
    base: classic,
    componentStyles: {
      workspaceBackgroundColour: "#18181f",
      toolboxBackgroundColour: "#0f0f14",
      toolboxForegroundColour: "#d4d4d8",
      flyoutBackgroundColour: "#16161c",
      flyoutForegroundColour: "#d4d4d8",
      flyoutOpacity: 0.98,
      scrollbarColour: "#3f3f46",
      insertionMarkerColour: "#f59e0b",
      insertionMarkerOpacity: 0.4,
      cursorColour: "#f59e0b",
    },
    fontStyle: { family: "Geist, system-ui, sans-serif", size: 11 },
  });
  ftcLightTheme = BK.Theme.defineTheme("ftcBlocksLight", {
    name: "ftcBlocksLight",
    base: classic,
    componentStyles: {
      workspaceBackgroundColour: "#ffffff",
      toolboxBackgroundColour: "#f9fafb",
      toolboxForegroundColour: "#1c1c1e",
      flyoutBackgroundColour: "#f3f4f6",
      flyoutForegroundColour: "#1c1c1e",
      flyoutOpacity: 0.98,
      scrollbarColour: "#cbd5e1",
      insertionMarkerColour: "#f59e0b",
      insertionMarkerOpacity: 0.4,
      cursorColour: "#f59e0b",
    },
    fontStyle: { family: "Geist, system-ui, sans-serif", size: 11 },
  });
  themesBuilt = true;
}

export default function BlocklyWorkspace({
  toolbox,
  initialState,
  starterState,
  resetSignal,
  dark,
  visible,
  onChange,
}: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const onChangeRef = useRef(onChange);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadingRef = useRef(false);
  const recalcRef = useRef<() => void>(() => {});

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const loadState = useCallback((state: WorkspaceState) => {
    const ws = wsRef.current;
    if (!ws) return;
    loadingRef.current = true;
    try {
      ws.clear();
      BK.serialization.workspaces.load(state, ws);
    } catch {
      ws.clear();
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // ── Inject once on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    registerFtcBlocks();
    ensureThemes();

    const ws = BK.inject(containerRef.current, {
      toolbox: toolbox as unknown as Blockly.utils.toolbox.ToolboxDefinition,
      theme: (dark ? ftcDarkTheme : ftcLightTheme) ?? undefined,
      renderer: "geras",
      trashcan: true,
      sounds: false,
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: { controls: true, wheel: false, startScale: 0.95, minScale: 0.5, maxScale: 1.5 },
      grid: { spacing: 24, length: 2, colour: dark ? "#27272a" : "#e5e7eb", snap: true },
    });
    wsRef.current = ws;

    loadState(initialState);

    // Blockly caches its SVG dimensions at inject time; in a flex/dynamic
    // container the final size may not be settled yet, which leaves the
    // scrollbar/canvas only partially sized. `svgResize` fits the SVG to the
    // container; `ws.resize()` re-lays-out the toolbox, flyout and scrollbars
    // (needed after a category flyout opens/closes, or its scrollbar gets
    // stranded mid-canvas).
    const recalc = () => {
      if (!wsRef.current) return;
      try {
        BK.svgResize(ws);
        (ws as Blockly.WorkspaceSvg).resize();
      } catch {
        /* workspace may be mid-dispose */
      }
    };
    recalcRef.current = recalc;
    // On the very first mount the container/fonts/CSS may not be fully settled,
    // and no later size *change* fires the ResizeObserver to self-correct (which
    // is why toggling Java↔Blocks "fixed" it). Recalc across a longer tail, once
    // fonts are ready, and via a double rAF to run after the first paint.
    requestAnimationFrame(() => requestAnimationFrame(recalc));
    const timers = [50, 150, 350, 700, 1200].map((ms) => setTimeout(recalc, ms));
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(recalc).catch(() => {});
    }

    const handleChange = (event: Blockly.Events.Abstract) => {
      if (loadingRef.current) return;
      if (event.isUiEvent) {
        // Toolbox flyout open/close fires UI events; re-layout afterward so the
        // scrollbar returns to the canvas edge.
        requestAnimationFrame(recalc);
        return;
      }
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          const state = BK.serialization.workspaces.save(ws) as WorkspaceState;
          onChangeRef.current(state);
        } catch {
          /* ignore serialization hiccups */
        }
      }, 400);
    };
    ws.addChangeListener(handleChange);

    // Fit the canvas to its container whenever it changes size.
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      clearTimeout(saveTimer.current);
      timers.forEach(clearTimeout);
      ro.disconnect();
      ws.removeChangeListener(handleChange);
      ws.dispose();
      wsRef.current = null;
    };
    // Inject exactly once; challenge changes remount via React key in the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resize when this editor becomes visible ────────────────────────────────
  // While hidden (display:none) Blockly measures a zero-size container, so we
  // re-fit every time the Blocks editor is shown.
  useEffect(() => {
    if (!visible) return;
    const r = recalcRef.current;
    const raf = requestAnimationFrame(() => requestAnimationFrame(r));
    const t = setTimeout(r, 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [visible]);

  // ── Theme switching ───────────────────────────────────────────────────────
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    ensureThemes();
    const next = (dark ? ftcDarkTheme : ftcLightTheme) ?? undefined;
    if (next) ws.setTheme(next);
  }, [dark]);

  // ── Reset to starter on signal ─────────────────────────────────────────────
  const lastResetRef = useRef(resetSignal);
  useEffect(() => {
    if (resetSignal === lastResetRef.current) return;
    lastResetRef.current = resetSignal;
    loadState(starterState);
    try {
      onChangeRef.current(starterState);
    } catch {
      /* ignore */
    }
  }, [resetSignal, starterState, loadState]);

  // The injection target is absolutely positioned with a concrete size so
  // Blockly always measures the full area (a flex `h-full` child can resolve
  // its width/height too late and leave the canvas/scrollbar half-sized).
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
