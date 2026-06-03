"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Blockly from "blockly/core";
import type { Challenge } from "@/data/challenges";
import { FTC_BLOCKLY_THEME } from "@/lib/blockly/theme/ftcBlocklyTheme";
import { initBlocklyOnce, generateJavaFromWorkspace } from "@/lib/blockly/generators/javaGenerator";
import { challengeToBlocklyMeta } from "@/lib/blockly/types";
import { buildToolbox } from "@/lib/blockly/toolbox/buildToolbox";
import {
  configureDeviceFieldsForChallenge,
  refreshDeviceFieldsInWorkspace,
} from "@/lib/blockly/blocks/deviceFields";
import { loadXmlIntoWorkspace, workspaceToXml } from "@/lib/blockly/workspace/serialize";

export interface BlocklyWorkspaceProps {
  challenge: Challenge;
  initialXml: string;
  onCodeChange: (java: string, blockXml: string) => void;
  onMigrated?: () => void;
  className?: string;
}

export default function BlocklyWorkspace({
  challenge,
  initialXml,
  onCodeChange,
  onMigrated,
  className = "",
}: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const onCodeChangeRef = useRef(onCodeChange);
  const onMigratedRef = useRef(onMigrated);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  onCodeChangeRef.current = onCodeChange;
  onMigratedRef.current = onMigrated;

  const emitChange = useCallback(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const meta = challengeToBlocklyMeta(challenge);
    const java = generateJavaFromWorkspace(ws, meta);
    const xml = workspaceToXml(ws);
    onCodeChangeRef.current(java, xml);
  }, [challenge]);

  const layoutWorkspace = useCallback((workspace: Blockly.WorkspaceSvg) => {
    requestAnimationFrame(() => {
      Blockly.svgResize(workspace);
      const metrics = workspace.getMetrics();
      workspace.scroll(
        metrics.contentLeft + metrics.contentWidth / 2 - metrics.viewWidth / 2,
        metrics.contentTop + 40
      );
    });
  }, []);

  useEffect(() => {
    initBlocklyOnce();
    configureDeviceFieldsForChallenge(challenge.id);
    const container = containerRef.current;
    if (!container) return;

    const toolbox = buildToolbox(challenge);
    const workspace = Blockly.inject(container, {
      toolbox,
      theme: FTC_BLOCKLY_THEME,
      renderer: "zelos",
      media: "/blockly/media/",
      sounds: false,
      trashcan: true,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.92,
        maxScale: 1.5,
        minScale: 0.4,
      },
      move: {
        scrollbars: true,
        wheel: true,
      },
      grid: {
        spacing: 24,
        length: 1,
        colour: "#333338",
        snap: false,
      },
    }) as Blockly.WorkspaceSvg;

    workspaceRef.current = workspace;
    const migrated = loadXmlIntoWorkspace(
      workspace,
      initialXml,
      challenge.id
    );
    if (migrated) onMigratedRef.current?.();
    refreshDeviceFieldsInWorkspace(workspace);
    emitChange();
    layoutWorkspace(workspace);

    const onChange = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(emitChange, 400);
    };
    workspace.addChangeListener(onChange);
    workspace.addChangeListener((e) => {
      if (e.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
        layoutWorkspace(workspace);
      }
    });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id, initialXml]);

  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    configureDeviceFieldsForChallenge(challenge.id);
    refreshDeviceFieldsInWorkspace(ws);
    ws.updateToolbox(buildToolbox(challenge));
  }, [challenge]);

  return (
    <div
      ref={containerRef}
      className={`blockly-root h-full w-full min-h-0 ${className}`}
      aria-label="FTC Blocks workspace"
    />
  );
}
