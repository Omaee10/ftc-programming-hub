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
  onChange,
}: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const onChangeRef = useRef(onChange);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadingRef = useRef(false);

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

    const handleChange = (event: Blockly.Events.Abstract) => {
      if (loadingRef.current) return;
      if (event.isUiEvent) return;
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

    // Fit the canvas to its container after layout settles.
    const ro = new ResizeObserver(() => BK.svgResize(ws));
    if (containerRef.current) ro.observe(containerRef.current);
    requestAnimationFrame(() => BK.svgResize(ws));

    return () => {
      clearTimeout(saveTimer.current);
      ro.disconnect();
      ws.removeChangeListener(handleChange);
      ws.dispose();
      wsRef.current = null;
    };
    // Inject exactly once; challenge changes remount via React key in the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return <div ref={containerRef} className="h-full w-full" />;
}
