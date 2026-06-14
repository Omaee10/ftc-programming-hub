"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  fetchMentorSnapshotCode,
  fetchSubmissionBlocksOnly,
  fetchSubmissionCodeOnly,
  type MentorSnapshotRequest,
} from "@/lib/mentorDashboardApi";
import { isCustomChallengeId } from "@/lib/classChallenges";
import type { WorkspaceState } from "@/data/blockChallenges";
import { FULL_TOOLBOX } from "@/lib/blockly/ftcBlocks";

const BlocklyWorkspace = dynamic(() => import("./BlocklyWorkspace"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded bg-slate-950">
      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
    </div>
  ),
});

type SubmissionCacheEntry = {
  code: string | null;
  blocks: WorkspaceState | null;
  blocksChecked: boolean;
};

const submissionCache = new Map<string, SubmissionCacheEntry>();

interface LazySavedCodeProps {
  request: MentorSnapshotRequest;
  /** Show the expand control when the row may have saved work. */
  showWhen?: boolean;
  summaryClassName?: string;
  preClassName?: string;
}

export default function LazySavedCode({
  request,
  showWhen = true,
  summaryClassName = "cursor-pointer text-[10px] text-slate-600 hover:text-slate-400 select-none",
  preClassName = "mt-1 max-h-32 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-400 font-mono",
}: LazySavedCodeProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCode = useCallback(async () => {
    if (loaded || loading) return;
    const session = getSession();
    if (!session?.id) return;

    setLoading(true);
    setError(null);
    try {
      const text = await fetchMentorSnapshotCode(session, request);
      setCode(text);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load code.");
    } finally {
      setLoading(false);
    }
  }, [loaded, loading, request]);

  if (!showWhen) return null;

  return (
    <details
      className="mt-1"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open) {
          void loadCode();
        }
      }}
    >
      <summary className={summaryClassName}>View saved code</summary>
      {loading && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading…
        </div>
      )}
      {error && <p className="mt-2 text-[10px] text-red-400">{error}</p>}
      {!loading && loaded && !code && !error && (
        <p className="mt-2 text-[10px] text-slate-600">No saved code for this item.</p>
      )}
      {code && (
        <pre className={preClassName}>{code}</pre>
      )}
    </details>
  );
}

function SubmissionViewTabs({
  view,
  onViewChange,
}: {
  view: "java" | "blocks";
  onViewChange: (view: "java" | "blocks") => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/70 p-0.5 w-fit">
      <button
        type="button"
        onClick={() => onViewChange("java")}
        className={
          view === "java"
            ? "rounded bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-100"
            : "rounded px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-300"
        }
      >
        OnBot Java
      </button>
      <button
        type="button"
        onClick={() => onViewChange("blocks")}
        className={
          view === "blocks"
            ? "rounded bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-100"
            : "rounded px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-300"
        }
      >
        FTC Blocks
      </button>
    </div>
  );
}

function looksLikeBlocksGeneratedJava(code: string): boolean {
  return (
    code.includes("(Blocks)") &&
    code.includes("extends LinearOpMode") &&
    code.includes("waitForStart()")
  );
}

/** Loads submission Java + Blocks when the mentor expands a grade row. */
export function SubmissionCodePanel({
  submissionId,
  challengeId,
  active,
}: {
  submissionId: string;
  challengeId: number;
  active: boolean;
}) {
  const showBothViews = isCustomChallengeId(challengeId);
  const [code, setCode] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<WorkspaceState | null>(null);
  const [blocksChecked, setBlocksChecked] = useState(false);
  const [view, setView] = useState<"java" | "blocks">("java");
  const [codeLoading, setCodeLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const loadBlocks = useCallback(async (generation: number) => {
    setBlocksLoading(true);
    setBlocksError(null);
    try {
      const session = getSession();
      if (!session?.id) return;
      const raw = await fetchSubmissionBlocksOnly(session, submissionId);
      if (generation !== loadGeneration.current) return;
      const nextBlocks = (raw as WorkspaceState | null) ?? null;
      setBlocks(nextBlocks);
      setBlocksChecked(true);

      const cached = submissionCache.get(submissionId);
      submissionCache.set(submissionId, {
        code: cached?.code ?? null,
        blocks: nextBlocks,
        blocksChecked: true,
      });
    } catch (err) {
      if (generation !== loadGeneration.current) return;
      setBlocksError(
        err instanceof Error ? err.message : "Failed to load blocks."
      );
      setBlocksChecked(true);
    } finally {
      if (generation === loadGeneration.current) {
        setBlocksLoading(false);
      }
    }
  }, [submissionId]);

  useEffect(() => {
    if (!active) return;

    const generation = ++loadGeneration.current;
    const cached = submissionCache.get(submissionId);
    if (cached) {
      setCode(cached.code);
      setBlocks(cached.blocks);
      setBlocksChecked(cached.blocksChecked);
      setCodeLoading(false);
      setBlocksLoading(false);
      setCodeError(null);
      setBlocksError(null);
      if (cached.blocks) {
        setView("java");
      }
      if (!cached.blocksChecked) {
        void loadBlocks(generation);
      }
      return;
    }

    setCode(null);
    setBlocks(null);
    setBlocksChecked(false);
    setView("java");
    setCodeError(null);
    setBlocksError(null);

    const session = getSession();
    if (!session?.id) {
      setCodeError("Sign in to view submissions.");
      return;
    }

    setCodeLoading(true);
    void fetchSubmissionCodeOnly(session, submissionId)
      .then((nextCode) => {
        if (generation !== loadGeneration.current) return;
        setCode(nextCode);
        submissionCache.set(submissionId, {
          code: nextCode,
          blocks: null,
          blocksChecked: false,
        });
      })
      .catch((err) => {
        if (generation !== loadGeneration.current) return;
        setCodeError(
          err instanceof Error ? err.message : "Failed to load submission."
        );
      })
      .finally(() => {
        if (generation === loadGeneration.current) {
          setCodeLoading(false);
        }
      });

    void loadBlocks(generation);
  }, [active, submissionId, loadBlocks]);

  useEffect(() => {
    if (view === "blocks" && active && !blocksChecked && !blocksLoading) {
      const session = getSession();
      if (session?.id) {
        void loadBlocks(loadGeneration.current);
      }
    }
  }, [view, active, blocksChecked, blocksLoading, loadBlocks]);

  if (!active) return null;

  const initialLoad = codeLoading && code === null && !codeError;

  if (initialLoad) {
    return (
      <div className="space-y-2">
        {showBothViews && (
          <SubmissionViewTabs view={view} onViewChange={setView} />
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading submission…
        </div>
      </div>
    );
  }

  if (codeError && !code) {
    return (
      <div className="space-y-2">
        {showBothViews && (
          <SubmissionViewTabs view={view} onViewChange={setView} />
        )}
        <p className="text-xs text-red-400">{codeError}</p>
      </div>
    );
  }

  if (!code && blocksChecked && !blocks && !codeLoading) {
    return (
      <div className="space-y-2">
        {showBothViews && (
          <SubmissionViewTabs view={view} onViewChange={setView} />
        )}
        <p className="text-xs text-slate-500">No submission on file.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {(showBothViews || blocks) && (
        <SubmissionViewTabs view={view} onViewChange={setView} />
      )}

      {view === "java" ? (
        <div className="space-y-2">
          {codeLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading Java…
            </div>
          )}
          {code && looksLikeBlocksGeneratedJava(code) && (
            <p className="text-xs text-amber-400/90">
              This looks like Java auto-generated from Blocks, not code the
              student typed in OnBot Java. Check the FTC Blocks tab for their
              actual work.
            </p>
          )}
          {code &&
          (!looksLikeBlocksGeneratedJava(code) || !blocks) ? (
            <pre className="max-h-72 overflow-auto rounded border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
              {code}
            </pre>
          ) : (
            !codeLoading &&
            !code && (
              <p className="text-xs text-slate-500">
                No OnBot Java code was submitted. The student may have used FTC
                Blocks only — check the FTC Blocks tab.
              </p>
            )
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {blocksLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading blocks…
            </div>
          )}
          {blocksError && (
            <p className="text-xs text-red-400">{blocksError}</p>
          )}
          {!blocksLoading && blocks && (
            <div className="h-72 overflow-hidden rounded border border-slate-800 bg-slate-950">
              <BlocklyWorkspace
                toolbox={FULL_TOOLBOX}
                initialState={blocks}
                starterState={blocks}
                resetSignal={0}
                dark
                visible
                readOnly
                onChange={() => {}}
              />
            </div>
          )}
          {!blocksLoading && blocksChecked && !blocks && !blocksError && (
            <p className="text-xs text-slate-500">
              No FTC Blocks layout was submitted. The student may have used
              OnBot Java only.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
