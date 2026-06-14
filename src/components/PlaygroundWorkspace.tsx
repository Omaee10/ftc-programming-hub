"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Monaco } from "@monaco-editor/react";
import { defineFtcMonacoThemes } from "@/lib/monacoThemes";
import { configureMonacoLoader } from "@/lib/monacoSetup";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCode,
  Info,
  Loader2,
  Play,
  RefreshCcw,
  Terminal,
  Trash2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  type GradedResult,
  compileCode,
  GraderUnreachableError,
  GraderTimeoutError,
} from "@/lib/codeValidator";
import type { BlocklyWorkspaceHandle } from "./BlocklyWorkspace";
import {
  saveCodeDraft,
  clearCodeDraft,
} from "@/lib/challengeCodeDrafts";
import {
  saveBlockDraft,
  clearBlockDraft,
} from "@/lib/challengeBlockDrafts";
import {
  chooseSavedBlocks,
  chooseSavedCode,
} from "@/lib/chooseSavedWorkspace";
import { getSession } from "@/lib/auth";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import {
  hasPendingUpsert,
  progressUpsertKey,
} from "@/lib/cloudSaveDebounce";
import type { WorkspaceState } from "@/data/blockChallenges";
import { FULL_TOOLBOX } from "@/lib/blockly/ftcBlocks";
import {
  PLAYGROUND_DRAFT_ID,
  PLAYGROUND_JAVA_FRAME,
  PLAYGROUND_STARTER_BLOCKS,
  PLAYGROUND_STARTER_JAVA,
} from "@/data/playgroundDefaults";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

const BlocklyWorkspace = dynamic(() => import("./BlocklyWorkspace"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

type EditorMode = "java" | "blocks";

type ConsoleEntryType =
  | "init"
  | "info"
  | "running"
  | "success"
  | "error"
  | "warning"
  | "separator"
  | "verdict-good"
  | "verdict-wrong";

interface ConsoleEntry {
  id: string;
  type: ConsoleEntryType;
  message: string;
  sub?: string;
  ts: string;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function fmtLinePrefix(lines: number[] | undefined): string {
  if (!lines || lines.length === 0) return "";
  const MAX = 5;
  const shown = lines.slice(0, MAX);
  const rest = lines.length - MAX;
  const nums = shown.join(", ") + (rest > 0 ? ` (+${rest} more)` : "");
  return lines.length === 1 ? `Line ${nums}: ` : `Lines ${nums}: `;
}

function withLinePrefix(message: string, lines: number[] | undefined): string {
  const prefix = fmtLinePrefix(lines);
  return prefix ? `${prefix}${message}` : message;
}

function applyGraderMarkers(
  result: GradedResult,
  editor: Parameters<
    NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>
  >[0] | null,
  monaco: Monaco | null
): number | null {
  if (!editor || !monaco) return null;
  const model = editor.getModel();
  if (!model) return null;

  monaco.editor.setModelMarkers(model, "ftc-grader", []);

  const markers: Monaco["editor"]["IMarkerData"][] = [];
  let firstLine: number | null = null;

  for (const issue of result.syntaxIssues) {
    if (issue.severity !== "error" || !issue.lines?.length) continue;
    for (const line of issue.lines) {
      if (line < 1 || line > model.getLineCount()) continue;
      if (firstLine === null) firstLine = line;
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: issue.message,
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: model.getLineMaxColumn(line),
      });
    }
  }

  monaco.editor.setModelMarkers(model, "ftc-grader", markers);
  return firstLine;
}

function EditorSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-[#18181f]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-zinc-100" />
        <span className="text-xs text-slate-500">Loading editor…</span>
      </div>
    </div>
  );
}

function ConsoleLine({ entry }: { entry: ConsoleEntry }) {
  if (entry.type === "verdict-good") {
    return (
      <div className="my-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="font-mono text-sm font-bold text-emerald-300">
            {entry.message}
          </span>
        </div>
        {entry.sub && (
          <p className="mt-1 pl-6 font-mono text-xs text-emerald-400/70">{entry.sub}</p>
        )}
      </div>
    );
  }

  if (entry.type === "verdict-wrong") {
    return (
      <div className="my-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span className="font-mono text-sm font-bold text-red-300">{entry.message}</span>
        </div>
        {entry.sub && (
          <p className="mt-1 pl-6 font-mono text-xs text-red-400/70">{entry.sub}</p>
        )}
      </div>
    );
  }

  if (entry.type === "separator") {
    return <div className="my-1.5 border-t border-slate-800/60" />;
  }

  const cfg = {
    init: { Icon: Terminal, color: "text-slate-500" },
    info: { Icon: Info, color: "text-slate-400" },
    running: { Icon: Loader2, color: "text-zinc-100" },
    success: { Icon: CheckCircle2, color: "text-emerald-400" },
    error: { Icon: XCircle, color: "text-red-400" },
    warning: { Icon: AlertTriangle, color: "text-zinc-200" },
  } as const;

  const style = cfg[entry.type as keyof typeof cfg];
  if (!style) return null;
  const { Icon, color } = style;

  return (
    <div className="flex items-start gap-2 py-0.5 font-mono text-xs leading-relaxed">
      <Icon
        className={`mt-0.5 h-3 w-3 shrink-0 ${color} ${
          entry.type === "running" ? "animate-spin" : ""
        }`}
      />
      <span className={color}>{entry.message}</span>
      <span className="ml-auto shrink-0 text-[10px] text-slate-700">{entry.ts}</span>
    </div>
  );
}

function CompileBanner({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <span className="text-xs font-bold tracking-wide text-emerald-300">
          COMPILES — No errors found
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2.5">
      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
      <span className="text-xs font-bold tracking-wide text-red-300">
        COMPILE FAILED — Fix errors above
      </span>
    </div>
  );
}

export default function PlaygroundWorkspace() {
  const { theme } = useTheme();
  const monacoTheme = theme === "light" || theme === "paper" ? "ftc-light" : "ftc-dark";

  const {
    studentId: progressStudentId,
    saveCode,
    saveBlocks,
    loadedCode,
    loadedCodeUpdatedAt,
    loadedBlocks,
    loadedBlocksUpdatedAt,
    hydrated: dbHydrated,
    snapshotsHydrated,
  } = useSupabaseProgress(PLAYGROUND_DRAFT_ID);

  const [code, setCode] = useState(() =>
    chooseSavedCode(PLAYGROUND_DRAFT_ID, PLAYGROUND_STARTER_JAVA, null, null)
  );
  const codeRef = useRef(code);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoredCodeRef = useRef(false);
  const editorRef = useRef<
    Parameters<NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>>[0] | null
  >(null);
  const monacoRef = useRef<Monaco | null>(null);

  const [editorMode, setEditorMode] = useState<EditorMode>("java");
  const [pendingMode, setPendingMode] = useState<EditorMode | null>(null);
  const [blockResetSignal, setBlockResetSignal] = useState(0);
  const blockStateRef = useRef<WorkspaceState | null>(null);
  const blockDraftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoredBlocksRef = useRef(false);
  const [resolvedBlocksState, setResolvedBlocksState] = useState<WorkspaceState | null>(
    null
  );
  const blocklyHandleRef = useRef<BlocklyWorkspaceHandle | null>(null);
  const editorModeRef = useRef(editorMode);
  editorModeRef.current = editorMode;

  const registerBlocklyHandle = useCallback((handle: BlocklyWorkspaceHandle | null) => {
    blocklyHandleRef.current = handle;
  }, []);

  const persistCode = useCallback(
    (next: string, options?: { flushCloud?: boolean }) => {
      saveCodeDraft(PLAYGROUND_DRAFT_ID, next);
      void saveCode(next, { flush: options?.flushCloud });
    },
    [saveCode]
  );

  const persistBlocks = useCallback(
    (state: WorkspaceState, options?: { flushCloud?: boolean }) => {
      saveBlockDraft(PLAYGROUND_DRAFT_ID, state);
      void saveBlocks(state, { flush: options?.flushCloud });
    },
    [saveBlocks]
  );

  const flushBlocksSnapshot = useCallback(() => {
    const state =
      blocklyHandleRef.current?.getState()
      ?? blockStateRef.current;
    if (!state) return;
    clearTimeout(blockDraftTimer.current);
    saveBlockDraft(PLAYGROUND_DRAFT_ID, state);
    void saveBlocks(state, { flush: true });
  }, [saveBlocks]);

  const persistCodeRef = useRef(persistCode);
  const flushBlocksSnapshotRef = useRef(flushBlocksSnapshot);
  useEffect(() => {
    persistCodeRef.current = persistCode;
  }, [persistCode]);
  useEffect(() => {
    flushBlocksSnapshotRef.current = flushBlocksSnapshot;
  }, [flushBlocksSnapshot]);

  useEffect(() => {
    const session = getSession();
    const needsCloud = session?.role === "student";
    if (needsCloud && (!dbHydrated || !snapshotsHydrated)) return;
    if (restoredBlocksRef.current) return;

    const restored = chooseSavedBlocks(
      PLAYGROUND_DRAFT_ID,
      PLAYGROUND_STARTER_BLOCKS,
      loadedBlocks,
      loadedBlocksUpdatedAt
    );
    setResolvedBlocksState(restored);
    blockStateRef.current = restored;
    restoredBlocksRef.current = true;
  }, [dbHydrated, snapshotsHydrated, loadedBlocks, loadedBlocksUpdatedAt]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    configureMonacoLoader();
  }, []);

  useEffect(() => {
    monacoRef.current?.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  useEffect(() => {
    const session = getSession();
    const needsCloud = session?.role === "student";
    if (needsCloud && (!dbHydrated || !snapshotsHydrated)) return;
    if (restoredCodeRef.current) return;

    const restored = chooseSavedCode(
      PLAYGROUND_DRAFT_ID,
      PLAYGROUND_STARTER_JAVA,
      loadedCode,
      loadedCodeUpdatedAt
    );
    setCode(restored);
    editorRef.current?.setValue(restored);
    restoredCodeRef.current = true;
  }, [dbHydrated, snapshotsHydrated, loadedCode, loadedCodeUpdatedAt]);

  useEffect(() => {
    const flush = () => {
      clearTimeout(saveTimer.current);
      persistCodeRef.current(codeRef.current, { flushCloud: true });
      flushBlocksSnapshotRef.current();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const requestModeSwitch = useCallback((target: EditorMode) => {
    setEditorMode((current) => {
      if (current === target) return current;
      setPendingMode(target);
      return current;
    });
  }, []);

  const confirmModeSwitch = useCallback(() => {
    flushBlocksSnapshot();
    setPendingMode((target) => {
      if (target) setEditorMode(target);
      return null;
    });
  }, [flushBlocksSnapshot]);

  const convertBlocksToJava = useCallback(async () => {
    try {
      const { generateJava } = await import("@/lib/blockly/javaGenerator");
      const generated = generateJava(
        blocklyHandleRef.current?.getState()
          ?? blockStateRef.current
          ?? PLAYGROUND_STARTER_BLOCKS,
        PLAYGROUND_JAVA_FRAME
      );
      setCode(generated);
      editorRef.current?.setValue(generated);
      saveCodeDraft(PLAYGROUND_DRAFT_ID, generated);
      void saveCode(generated);
    } catch {
      // Keep existing Java if generation fails.
    }
    flushBlocksSnapshot();
    setPendingMode(null);
    setEditorMode("java");
  }, [flushBlocksSnapshot, saveCode]);

  const handleBlocksChange = useCallback(
    (state: WorkspaceState) => {
      blockStateRef.current = state;
      clearTimeout(blockDraftTimer.current);
      blockDraftTimer.current = setTimeout(() => {
        persistBlocks(state);
      }, 400);
    },
    [persistBlocks]
  );

  const handleReset = useCallback(() => {
    if (editorMode === "blocks") {
      clearBlockDraft(PLAYGROUND_DRAFT_ID);
      blockStateRef.current = PLAYGROUND_STARTER_BLOCKS;
      persistBlocks(PLAYGROUND_STARTER_BLOCKS, { flushCloud: true });
      setBlockResetSignal((n) => n + 1);
    } else {
      setCode(PLAYGROUND_STARTER_JAVA);
      editorRef.current?.setValue(PLAYGROUND_STARTER_JAVA);
      persistCode(PLAYGROUND_STARTER_JAVA, { flushCloud: true });
    }
  }, [editorMode, persistBlocks, persistCode]);

  const resolveSubmissionCode = useCallback(async (): Promise<string> => {
    if (editorModeRef.current === "blocks") {
      const liveState =
        blocklyHandleRef.current?.getState()
        ?? blockStateRef.current
        ?? PLAYGROUND_STARTER_BLOCKS;
      blockStateRef.current = liveState;
      clearTimeout(blockDraftTimer.current);
      if (
        progressStudentId &&
        hasPendingUpsert(
          progressUpsertKey(progressStudentId, PLAYGROUND_DRAFT_ID, "blocks")
        )
      ) {
        persistBlocks(liveState, { flushCloud: true });
      }
      try {
        const { generateJava } = await import("@/lib/blockly/javaGenerator");
        return generateJava(liveState, PLAYGROUND_JAVA_FRAME);
      } catch {
        return "";
      }
    }
    return codeRef.current;
  }, [persistBlocks, progressStudentId]);

  const [leftPct, setLeftPct] = useState(32);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.max(22, Math.min(45, pct)));
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

  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [compileOk, setCompileOk] = useState<boolean | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const appendEntry = useCallback((entry: Omit<ConsoleEntry, "id" | "ts">) => {
    setConsoleEntries((prev) => [
      ...prev,
      { ...entry, id: makeId(), ts: nowTime() },
    ]);
  }, []);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleEntries]);

  const handleCompile = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setConsoleOpen(true);
    setConsoleEntries([]);
    setCompileOk(null);

    try {
      appendEntry({ type: "init", message: "FTC Hub Compiler" });
      appendEntry({ type: "separator", message: "" });

      if (editorMode === "java") {
        const clearModel = editorRef.current?.getModel();
        if (clearModel && monacoRef.current) {
          monacoRef.current.editor.setModelMarkers(clearModel, "ftc-grader", []);
        }
      }

      await delay(180);
      appendEntry({ type: "running", message: "Compiling Playground.java with javac…" });

      const submissionCode = await resolveSubmissionCode();

      let result: GradedResult;
      try {
        result = await compileCode(submissionCode);
      } catch (err) {
        const msg =
          err instanceof GraderTimeoutError
            ? "Compiler took too long. Try again — the service may be warming up."
            : err instanceof GraderUnreachableError
            ? err.message
            : "Unexpected compiler error. Try again in a moment.";
        appendEntry({ type: "separator", message: "" });
        appendEntry({ type: "verdict-wrong", message: "Compiler Offline", sub: msg });
        setCompileOk(null);
        return;
      }

      await delay(120);

      if (editorMode === "java") {
        const firstErrorLine = applyGraderMarkers(
          result,
          editorRef.current,
          monacoRef.current
        );
        if (firstErrorLine !== null && editorRef.current) {
          editorRef.current.revealLineInCenter(firstErrorLine);
          editorRef.current.setPosition({ lineNumber: firstErrorLine, column: 1 });
        }
      }

      const ok = result.grade === "good";
      setCompileOk(ok);

      if (result.syntaxIssues.length > 0) {
        appendEntry({ type: "info", message: "Compiler output:" });
        for (const issue of result.syntaxIssues) {
          await delay(100);
          appendEntry({
            type: issue.severity === "error" ? "error" : "warning",
            message: withLinePrefix(issue.message, issue.lines),
          });
        }
        appendEntry({ type: "separator", message: "" });
      } else if (ok) {
        appendEntry({ type: "success", message: "No syntax or type errors found." });
        appendEntry({ type: "separator", message: "" });
      }

      appendEntry({
        type: ok ? "verdict-good" : "verdict-wrong",
        message: result.verdict.title,
        sub: result.verdict.subtitle,
      });
    } finally {
      setIsRunning(false);
    }
  }, [appendEntry, editorMode, isRunning, resolveSubmissionCode]);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden bg-slate-950">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-slate-800/60 bg-slate-950/90 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <div className="h-4 w-px bg-slate-800" />
        <h1 className="text-sm font-semibold text-slate-200">Code Playground</h1>
        <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          Free write
        </span>
      </header>

      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className="sidebar-scroll min-w-0 overflow-y-auto border-r border-slate-800/40 bg-slate-950/50 px-4 py-4"
          style={{ width: `${leftPct}%` }}
        >
          <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-slate-600">
            About
          </p>
          <p className="text-sm leading-relaxed text-slate-400">
            Write any FTC OpMode here — no challenge rubric, no XP. The compiler
            checks syntax and whether your code compiles against the FTC SDK stubs.
          </p>

          <div className="mt-5 space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
              Tips
            </p>
            <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-slate-500">
              <li>Switch between <strong className="font-medium text-slate-400">OnBot Java</strong> and <strong className="font-medium text-slate-400">FTC Blocks</strong> in the toolbar.</li>
              <li>Your work auto-saves — locally in this browser and to the cloud when you&apos;re signed in. Java and Blocks keep separate drafts.</li>
              <li>Press <strong className="font-medium text-slate-400">Compile</strong> to run javac. Challenge-specific rules are not checked here.</li>
              <li>Use a full OpMode class with <code className="rounded bg-slate-900 px-1 text-slate-400">extends LinearOpMode</code> in Java mode.</li>
            </ul>
          </div>
        </aside>

        <div
          onMouseDown={handleDividerDown}
          className="group relative flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-slate-800 transition-colors hover:accent-fill active:accent-fill"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="h-8 w-0.5 rounded-full bg-slate-700 transition-colors group-hover:bg-zinc-200/60" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-slate-800/60 bg-slate-950/80 px-3">
            <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/70 p-0.5">
              <button
                onClick={() => requestModeSwitch("java")}
                className={
                  editorMode === "java"
                    ? "rounded bg-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-100"
                    : "rounded px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-300"
                }
              >
                OnBot Java
              </button>
              <button
                onClick={() => requestModeSwitch("blocks")}
                className={
                  editorMode === "blocks"
                    ? "rounded bg-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-100"
                    : "rounded px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-300"
                }
              >
                FTC Blocks
              </button>
            </div>
            <FileCode className="h-3 w-3 shrink-0 text-slate-700" />
            <span className="truncate font-mono text-[11px] text-slate-600">
              {editorMode === "blocks" ? "Playground.blocks" : "Playground.java"}
            </span>
            <div className="ml-auto">
              <button
                onClick={handleReset}
                title={editorMode === "blocks" ? "Reset to starter blocks" : "Reset to starter code"}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-600 transition-all hover:bg-slate-800/60 hover:text-slate-300"
              >
                <RefreshCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div className={editorMode === "blocks" ? "hidden" : "h-full w-full"}>
              <MonacoEditor
                height="100%"
                language="java"
                theme={monacoTheme}
                value={code}
                onChange={(val) => {
                  const next = val ?? "";
                  setCode(next);
                  clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(() => {
                    persistCode(next);
                  }, 400);
                }}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                  defineFtcMonacoThemes(monaco);
                  monaco.editor.setTheme(monacoTheme);
                }}
                options={{
                  fontSize: 13,
                  fontFamily:
                    "'Geist Mono', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
                  fontLigatures: true,
                  lineNumbers: "on",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 4,
                  insertSpaces: true,
                  folding: true,
                  automaticLayout: true,
                  bracketPairColorization: { enabled: true },
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  renderLineHighlight: "gutter",
                  padding: { top: 12, bottom: 12 },
                  overviewRulerLanes: 0,
                  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                  lineDecorationsWidth: 4,
                  suggest: { showWords: true },
                }}
              />
            </div>
            <div className={editorMode === "blocks" ? "h-full w-full" : "hidden"}>
              <BlocklyWorkspace
                toolbox={FULL_TOOLBOX}
                initialState={resolvedBlocksState ?? PLAYGROUND_STARTER_BLOCKS}
                starterState={PLAYGROUND_STARTER_BLOCKS}
                resetSignal={blockResetSignal}
                dark={monacoTheme === "ftc-dark"}
                visible={editorMode === "blocks"}
                onChange={handleBlocksChange}
                registerHandle={registerBlocklyHandle}
              />
            </div>
          </div>

          {pendingMode &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
                onClick={() => setPendingMode(null)}
              >
                <div
                  className="mx-4 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-sm font-semibold text-slate-100">
                    Switch to {pendingMode === "blocks" ? "FTC Blocks" : "OnBot Java"}?
                  </h3>
                  {pendingMode === "blocks" ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Your OnBot Java code is saved separately and will still be here when
                      you switch back.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      You can convert your block layout into Java code, or keep the Java
                      code you already have.
                    </p>
                  )}
                  {pendingMode === "java" ? (
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={convertBlocksToJava}
                        className="rounded-md bg-amber-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-amber-400"
                      >
                        Convert blocks to Java
                      </button>
                      <button
                        onClick={confirmModeSwitch}
                        className="rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                      >
                        Keep my Java code
                      </button>
                      <button
                        onClick={() => setPendingMode(null)}
                        className="rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setPendingMode(null)}
                        className="rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmModeSwitch}
                        className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-amber-400"
                      >
                        Switch
                      </button>
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}

          <div
            className={`flex flex-col border-t border-slate-800 bg-slate-950 transition-all duration-300 ${
              consoleOpen ? "h-64" : "h-10"
            }`}
          >
            <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-hidden border-b border-slate-800/60 px-3">
              <Terminal className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500">Console</span>
              {consoleEntries.length > 0 && (
                <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                  {consoleEntries.filter((e) => e.type !== "separator").length}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {consoleEntries.length > 0 && (
                  <button
                    onClick={() => {
                      setConsoleEntries([]);
                      setCompileOk(null);
                    }}
                    title="Clear console"
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-800 hover:text-slate-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => setConsoleOpen((v) => !v)}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-800 hover:text-slate-400"
                >
                  {consoleOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={handleCompile}
                  disabled={isRunning}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                    isRunning
                      ? "cursor-not-allowed bg-slate-800 text-slate-500"
                      : "btn-primary shadow-sm"
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Compiling…
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      Compile
                    </>
                  )}
                </button>
              </div>
            </div>

            {consoleOpen && compileOk !== null && <CompileBanner ok={compileOk} />}

            {consoleOpen && (
              <div className="sidebar-scroll min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-2">
                {consoleEntries.length === 0 ? (
                  <p className="mt-2 text-xs italic text-slate-700">
                    Press &quot;Compile&quot; to check your code…
                  </p>
                ) : (
                  consoleEntries.map((entry) => (
                    <ConsoleLine key={entry.id} entry={entry} />
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
