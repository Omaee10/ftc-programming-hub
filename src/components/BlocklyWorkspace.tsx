"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Blockly from "blockly/core";
import type { Challenge } from "@/data/challenges";
import { FTC_BLOCKLY_THEME } from "@/lib/blockly/theme/ftcBlocklyTheme";
import { initBlocklyOnce, generateJavaFromWorkspace } from "@/lib/blockly/generators/javaGenerator";
import { challengeToBlocklyMeta } from "@/lib/blockly/types";
import { buildToolbox } from "@/lib/blockly/toolbox/buildToolbox";
import { loadXmlIntoWorkspace, workspaceToXml } from "@/lib/blockly/workspace/serialize";

export interface BlocklyWorkspaceProps {
  challenge: Challenge;
  initialXml: string;
  onCodeChange: (java: string, blockXml: string) => void;
  className?: string;
}

export default function BlocklyWorkspace({
  challenge,
  initialXml,
  onCodeChange,
  className = "",
}: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const onCodeChangeRef = useRef(onCodeChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const challengeIdRef = useRef(challenge.id);

  onCodeChangeRef.current = onCodeChange;
  challengeIdRef.current = challenge.id;

  const emitChange = useCallback(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const meta = challengeToBlocklyMeta(challenge);
    const java = generateJavaFromWorkspace(ws, meta);
    const xml = workspaceToXml(ws);
    onCodeChangeRef.current(java, xml);
  }, [challenge]);

  useEffect(() => {
    initBlocklyOnce();
    const container = containerRef.current;
    if (!container) return;

    const toolbox = buildToolbox(challenge);
    const workspace = Blockly.inject(container, {
      toolbox,
      theme: FTC_BLOCKLY_THEME,
      media: "/blockly/media/",
      sounds: false,
      trashcan: true,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.9,
        maxScale: 1.4,
        minScale: 0.5,
      },
      grid: {
        spacing: 20,
        length: 1,
        colour: "#27272a",
        snap: false,
      },
    }) as Blockly.WorkspaceSvg;

    workspaceRef.current = workspace;
    loadXmlIntoWorkspace(workspace, initialXml);
    emitChange();

    const onChange = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(emitChange, 400);
    };
    workspace.addChangeListener(onChange);

    const ro = new ResizeObserver(() => {
      Blockly.svgResize(workspace);
    });
    ro.observe(container);

    return () => {
      clearTimeout(debounceRef.current);
      ro.disconnect();
      workspace.removeChangeListener(onChange);
      workspace.dispose();
      workspaceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init when challenge changes
  }, [challenge.id]);

  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws || challengeIdRef.current === challenge.id) return;
    challengeIdRef.current = challenge.id;
    ws.updateToolbox(buildToolbox(challenge));
  }, [challenge]);

  return (
    <div
      ref={containerRef}
      className={`blockly-root h-full w-full min-h-0 ${className}`}
      aria-label="Block coding workspace"
    />
  );
}

/** Load new XML into an existing workspace (e.g. reset). */
export function loadBlocklyXml(
  workspace: Blockly.Workspace,
  xml: string
): void {
  loadXmlIntoWorkspace(workspace, xml);
}
