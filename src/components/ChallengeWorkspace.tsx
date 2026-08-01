"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
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
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Code2,
  FileCode,
  Key,
  Loader2,
  MessageSquare,
  Play,
  RefreshCcw,
  Send,
  Star,
  Target,
  Terminal,
  Trash2,
  TriangleAlert,
  XCircle,
  Zap,
  AlertTriangle,
  Info,
} from "lucide-react";

import type { Challenge } from "@/data/challenges";
import { difficultyConfig } from "@/data/challengeConstants";
import { getBuiltinChallengeMeta } from "@/data/challengeMeta";
import { isCustomChallengeId } from "@/lib/classChallenges";
import {
  type GradedResult,
  type Grade,
  gradeCode,
  GraderUnreachableError,
  GraderTimeoutError,
} from "@/lib/codeValidator";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import { supabase, type SubmissionRow } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { useWorkspaceSession } from "@/lib/useWorkspaceSession";
import type { BlocklyWorkspaceHandle } from "./BlocklyWorkspace";
import {
  clearCodeDraft,
  saveCodeDraft,
} from "@/lib/challengeCodeDrafts";
import {
  chooseSavedBlocks,
  chooseSavedCode,
} from "@/lib/chooseSavedWorkspace";
import {
  hasPendingUpsert,
  progressUpsertKey,
} from "@/lib/cloudSaveDebounce";
import {
  getBlockConfig,
  isBlocksEnabled,
  type WorkspaceState,
} from "@/data/blockChallenges";
import type { ChallengeSolution } from "@/data/challengeSolutions";
import { FULL_TOOLBOX } from "@/lib/blockly/ftcBlocks";
import {
  clearBlockDraft,
  saveBlockDraft,
} from "@/lib/challengeBlockDrafts";
import MarkCompleteButton from "./MarkCompleteButton";
import HintsAccordion from "./HintsAccordion";

// ─── Monaco loaded lazily (browser-only) ────────────────────────────────────
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

// ─── Blockly canvas loaded lazily (browser-only) ────────────────────────────
const BlocklyWorkspace = dynamic(() => import("./BlocklyWorkspace"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

type EditorMode = "java" | "blocks";

function workspaceRestoreKey(
  studentId: string | null | undefined,
  challengeId: number
): string {
  return `${studentId ?? "guest"}:${challengeId}`;
}

// ─── Console types ─────────────────────────────────────────────────────────

type ConsoleEntryType =
  | "init"
  | "info"
  | "running"
  | "success"
  | "error"
  | "warning"
  | "separator"
  | "verdict-good"
  | "verdict-improve"
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

/** Formats 1-indexed line numbers as a visible prefix (e.g. "Line 52: "). */
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

// ─── Sub-components ───────────────────────────────────────────────────────

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
  // ── Verdict banners ────────────────────────────────────────────────────
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
          <p className="mt-1 font-mono text-xs text-emerald-400/70 pl-6">
            {entry.sub}
          </p>
        )}
      </div>
    );
  }

  if (entry.type === "verdict-improve") {
    return (
      <div className="my-2 rounded-lg border border-white/20 bg-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 shrink-0 text-zinc-100" />
          <span className="font-mono text-sm font-bold text-zinc-200">
            {entry.message}
          </span>
        </div>
        {entry.sub && (
          <p className="mt-1 font-mono text-xs text-zinc-100/70 pl-6">
            {entry.sub}
          </p>
        )}
      </div>
    );
  }

  if (entry.type === "verdict-wrong") {
    return (
      <div className="my-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span className="font-mono text-sm font-bold text-red-300">
            {entry.message}
          </span>
        </div>
        {entry.sub && (
          <p className="mt-1 font-mono text-xs text-red-400/70 pl-6">
            {entry.sub}
          </p>
        )}
      </div>
    );
  }

  if (entry.type === "separator") {
    return <div className="border-t border-slate-800/60 my-1.5" />;
  }

  const cfg = {
    init: { Icon: Terminal, color: "text-slate-500" },
    info: { Icon: Info, color: "text-slate-400" },
    running: { Icon: Loader2, color: "text-zinc-100" },
    success: { Icon: CheckCircle2, color: "text-emerald-400" },
    error: { Icon: XCircle, color: "text-red-400" },
    warning: { Icon: AlertTriangle, color: "text-zinc-200" },
    separator: { Icon: null, color: "" },
    "verdict-good": { Icon: null, color: "" },
    "verdict-improve": { Icon: null, color: "" },
    "verdict-wrong": { Icon: null, color: "" },
  } as const;

  const style = cfg[entry.type];
  const { Icon } = style;

  const prefix =
    entry.type === "success"
      ? "✓ "
      : entry.type === "error"
      ? "✗ "
      : entry.type === "warning"
      ? "⚠ "
      : entry.type === "running"
      ? "▶ "
      : "  ";

  return (
    <div className={`flex items-start gap-2 py-0.5 font-mono text-xs ${style.color}`}>
      <span className="shrink-0 w-16 text-slate-700 select-none">{entry.ts}</span>
      {Icon && (
        <Icon
          className={`mt-0.5 h-3 w-3 shrink-0 ${
            entry.type === "running" ? "animate-spin" : ""
          }`}
        />
      )}
      <span className="flex-1 leading-relaxed whitespace-pre-wrap break-all">
        {prefix}
        {entry.message}
      </span>
    </div>
  );
}

// ─── Requirement status pill ──────────────────────────────────────────────

function RequirementItem({
  label,
  status,
}: {
  label: string;
  status: "pending" | "pass" | "fail" | "warn";
}) {
  const cfg = {
    pending: {
      icon: <Circle className="h-2.5 w-2.5" />,
      color: "text-slate-600",
      dot: "bg-slate-700",
    },
    pass: {
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      color: "text-emerald-400",
      dot: "bg-emerald-500",
    },
    fail: {
      icon: <XCircle className="h-2.5 w-2.5" />,
      color: "text-red-400",
      dot: "bg-red-500",
    },
    warn: {
      icon: <AlertTriangle className="h-2.5 w-2.5" />,
      color: "text-zinc-100",
      dot: "bg-amber-500",
    },
  };
  const s = cfg[status];
  return (
    <li className={`flex min-w-0 items-start gap-2 text-xs transition-colors ${s.color}`}>
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
      <span className="min-w-0 break-words leading-relaxed">{label}</span>
    </li>
  );
}

// ─── Inline instruction renderer ──────────────────────────────────────────

function InstructionBlock({ text }: { text: string }) {
  // Split the raw text into segments: fenced code blocks vs plain paragraphs.
  // A fenced block is opened by a line starting with ``` (with an optional language
  // tag like ```java) and closed by a line that is exactly ```.
  const segments: Array<{ type: "code"; content: string } | { type: "text"; content: string }> = [];
  const lines = text.split("\n");
  let inCode = false;
  let buffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inCode && /^```/.test(trimmed)) {
      // Opening fence (``` or ```java, etc.)
      if (buffer.length > 0) {
        segments.push({ type: "text", content: buffer.join("\n") });
        buffer = [];
      }
      inCode = true;
    } else if (inCode && trimmed === "```") {
      // Closing fence
      segments.push({ type: "code", content: buffer.join("\n") });
      buffer = [];
      inCode = false;
    } else {
      buffer.push(line);
    }
  }
  // Flush remaining content
  if (buffer.length > 0) {
    segments.push({ type: inCode ? "code" : "text", content: buffer.join("\n") });
  }

  // Render inline text: **bold** and `code` spans
  function renderInline(raw: string, baseKey: number) {
    return raw.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={`${baseKey}-${j}`} className="text-slate-200 font-semibold">{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={`${baseKey}-${j}`} className="break-words rounded bg-zinc-200/10 px-1 py-0.5 text-[0.8rem] font-mono text-zinc-200 border border-zinc-200/15">{part.slice(1, -1)}</code>;
      return part;
    });
  }

  // Render a block of text lines — handles paragraphs, numbered lists, and bullet lists
  function renderTextBlock(raw: string, segIdx: number) {
    const paras = raw.split("\n\n").filter((p) => p.trim());
    return paras.map((para, j) => {
      const paraLines = para.split("\n").map((l) => l.trimEnd());
      // Numbered list: lines starting with "1." "2." etc.
      if (paraLines.every((l) => /^\d+\.\s/.test(l.trim()) || l.trim() === "")) {
        return (
          <ol key={`${segIdx}-${j}`} className="list-decimal list-inside space-y-1">
            {paraLines.filter((l) => l.trim()).map((l, k) => (
              <li key={k} className="break-words text-slate-400 leading-relaxed">
                {renderInline(l.replace(/^\d+\.\s/, "").trim(), segIdx * 10000 + j * 100 + k)}
              </li>
            ))}
          </ol>
        );
      }
      // Bullet list: lines starting with "- " or "* "
      if (paraLines.every((l) => /^[-*]\s/.test(l.trim()) || l.trim() === "")) {
        return (
          <ul key={`${segIdx}-${j}`} className="list-disc list-inside space-y-1">
            {paraLines.filter((l) => l.trim()).map((l, k) => (
              <li key={k} className="break-words text-slate-400 leading-relaxed">
                {renderInline(l.replace(/^[-*]\s/, "").trim(), segIdx * 10000 + j * 100 + k)}
              </li>
            ))}
          </ul>
        );
      }
      // Regular paragraph — preserve single-newline breaks within the paragraph
      const inlineNodes: React.ReactNode[] = [];
      paraLines.forEach((l, k) => {
        if (k > 0) inlineNodes.push(<br key={`br-${k}`} />);
        inlineNodes.push(...renderInline(l.trim(), segIdx * 10000 + j * 100 + k));
      });
      return <p key={`${segIdx}-${j}`} className="break-words">{inlineNodes}</p>;
    });
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 text-sm text-slate-400 leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "code") {
          return (
            <pre
              key={i}
              className="max-w-full overflow-x-auto rounded-lg border border-zinc-700/50 bg-zinc-900 px-4 py-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap break-words leading-5"
            >
              {seg.content}
            </pre>
          );
        }
        return renderTextBlock(seg.content, i);
      })}
    </div>
  );
}

// ─── Grade banner (pinned at top of console) ──────────────────────────────

function GradeBanner({ grade }: { grade: Grade | null }) {
  if (!grade) return null;

  if (grade === "good") {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
        <Star className="h-3.5 w-3.5 text-emerald-400 shrink-0 fill-emerald-400/50" />
        <span className="text-xs font-bold text-emerald-300 tracking-wide">
          PASSED — Challenge Complete!
        </span>
        <span className="ml-auto text-[10px] text-emerald-500">XP awarded ✓</span>
      </div>
    );
  }

  if (grade === "needs-improvement") {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-white/15 bg-white/8 px-4 py-2.5">
        <TriangleAlert className="h-3.5 w-3.5 text-zinc-100 shrink-0" />
        <span className="text-xs font-bold text-zinc-200 tracking-wide">
          WORKS — But could be better
        </span>
        <span className="ml-auto text-[10px] text-zinc-200">Review ⚠ hints</span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2.5">
      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
      <span className="text-xs font-bold text-red-300 tracking-wide">
        FAILED — Fix required checks
      </span>
      <span className="ml-auto text-[10px] text-red-500">Review ✗ errors</span>
    </div>
  );
}

// ─── Mentor grade badge ───────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: SubmissionRow["grade"] }) {
  if (!grade) return null;
  const cfg = {
    pass: {
      label: "Pass",
      className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    },
    "needs-work": {
      label: "Needs Work",
      className: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    },
    redo: {
      label: "Redo",
      className: "bg-red-500/10 text-red-300 border-red-500/20",
    },
  } as const;
  const c = cfg[grade];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${c.className}`}
    >
      {c.label}
    </span>
  );
}

// ─── Main workspace ──────────────────────────────────────────────────────────

export default function ChallengeWorkspace({
  challenge,
  homeworkMode = false,
  homeworkCompleted = false,
  onHomeworkComplete,
  backHref = "/challenges",
  backLabel = "Challenges",
  answerKey,
}: {
  challenge: Challenge;
  homeworkMode?: boolean;
  homeworkCompleted?: boolean;
  onHomeworkComplete?: (
    code: string
  ) => Promise<{ ok: boolean; error: string | null } | void>;
  backHref?: string;
  backLabel?: string;
  /** When set, render a locked, read-only reference solution (mentor answer key). */
  answerKey?: ChallengeSolution;
}) {
  // Read-only mentor answer-key mode: pre-fills the editor with the reference
  // solution, disables every write path (drafts, cloud, grading, completion),
  // and hides the submit / reset / mark-complete UI.
  const answerKeyMode = !!answerKey;
  const { theme } = useTheme();
  const monacoTheme = (theme === "light" || theme === "paper") ? "ftc-light" : "ftc-dark";

  const diff = difficultyConfig[challenge.difficulty];
  const prevChallenge = getBuiltinChallengeMeta(challenge.id - 1);
  const nextChallenge = getBuiltinChallengeMeta(challenge.id + 1);

  // Local (localStorage) progress — keeps working offline / for guests
  const {
    isCompleted: isCompletedLocal,
    markComplete: markCompleteLocal,
    markIncomplete: markIncompleteLocal,
    hydrated: localProgressHydrated,
  } = useChallengeProgress();

  // Supabase progress — active when a student session exists
  const {
    studentId: progressStudentId,
    isCompleted: isCompletedDB,
    markComplete: markCompleteDB,
    markIncomplete: markIncompleteDB,
    saveCode,
    saveBlocks,
    loadedCode,
    loadedCodeUpdatedAt,
    loadedBlocks,
    loadedBlocksUpdatedAt,
    hydrated: dbHydrated,
    snapshotsHydrated,
  } = useSupabaseProgress(challenge.id);

  const isCompleted = (id: number) =>
    isCompletedLocal(id) || isCompletedDB(id);
  const done = homeworkMode ? homeworkCompleted : isCompleted(challenge.id);

  // Combined mark-complete: writes to both localStorage and Supabase
  const markComplete = async (id: number) => {
    markCompleteLocal(id);
    await markCompleteDB(id);
  };

  // ── Mentor-challenge detection & submission state ────────────────────────
  const isMentorChallenge = isCustomChallengeId(challenge.id);
  const workspaceSession = useWorkspaceSession();
  const studentSession =
    workspaceSession?.role === "student" ? workspaceSession : null;
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState(false);

  // Load existing submission for this student + mentor challenge
  useEffect(() => {
    if (!isMentorChallenge || !studentSession?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("challenge_submissions")
        .select("id, status, grade, feedback, submitted_at, graded_at")
        .eq("student_id", studentSession.id)
        .eq("challenge_id", challenge.id)
        .maybeSingle();
      // `?? null` so a challenge with no submission clears any prior one.
      if (!cancelled) setSubmission((data as SubmissionRow) ?? null);
    })();
    // Cleanup runs before the next challenge's effect, clearing the previous
    // submission so its grade/feedback banner never leaks onto the next one.
    return () => {
      cancelled = true;
      setSubmission(null);
    };
  }, [challenge.id, isMentorChallenge, studentSession?.id]);

  // ── Editor state ────────────────────────────────────────────────────────
  const [code, setCode] = useState(() =>
    answerKey ? answerKey.java : challenge.starterCode
  );
  const codeRef = useRef(code);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoredChallengeRef = useRef<string | null>(null);
  const progressStudentIdRef = useRef(progressStudentId);
  progressStudentIdRef.current = progressStudentId;

  const canPersistForSession = useCallback((): boolean => {
    const session = getSession();
    if (!session || session.role !== "student") return !session;
    const hookId = progressStudentIdRef.current;
    if (!hookId) return false;
    return session.id === hookId;
  }, []);

  const editorRef = useRef<
    Parameters<
      NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>
    >[0] | null
  >(null);
  const monacoRef = useRef<Monaco | null>(null);

  // ── FTC Blocks mode ───────────────────────────────────────────────────────
  // In answer-key mode the Blocks toggle appears only when the solution ships a
  // completed block layout; otherwise it mirrors the normal per-challenge flag.
  const blocksEnabled = answerKeyMode
    ? !!answerKey?.blocks
    : isBlocksEnabled(challenge.id);
  const blocksConfig = useMemo(
    () =>
      !answerKeyMode && blocksEnabled
        ? getBlockConfig(challenge.id, challenge.title)
        : null,
    [answerKeyMode, blocksEnabled, challenge.id, challenge.title]
  );
  const [editorMode, setEditorMode] = useState<EditorMode>("java");
  const [blocklyMounted, setBlocklyMounted] = useState(
    () => answerKeyMode && !!answerKey?.blocks
  );
  const [pendingMode, setPendingMode] = useState<EditorMode | null>(null);
  const [blockResetSignal, setBlockResetSignal] = useState(0);
  const blockStateRef = useRef<WorkspaceState | null>(null);
  const blockDraftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoredBlocksRef = useRef<string | null>(null);
  const [resolvedBlocksState, setResolvedBlocksState] = useState<WorkspaceState | null>(
    () => (answerKeyMode ? (answerKey?.blocks ?? null) : null)
  );
  const blocklyHandleRef = useRef<BlocklyWorkspaceHandle | null>(null);
  const editorModeRef = useRef(editorMode);
  const blocksConfigRef = useRef(blocksConfig);
  editorModeRef.current = editorMode;
  blocksConfigRef.current = blocksConfig;
  const registerBlocklyHandle = useCallback((handle: BlocklyWorkspaceHandle | null) => {
    blocklyHandleRef.current = handle;
  }, []);

  const requestModeSwitch = useCallback(
    (target: EditorMode) => {
      setEditorMode((current) => {
        if (current === target) return current;
        setPendingMode(target);
        return current;
      });
    },
    []
  );

  const flushBlocksSnapshot = useCallback(() => {
    if (answerKeyMode || !blocksConfig || !canPersistForSession()) return;
    const state =
      blocklyHandleRef.current?.getState()
      ?? blockStateRef.current;
    if (!state) return;
    clearTimeout(blockDraftTimer.current);
    saveBlockDraft(challenge.id, state);
    void saveBlocks(state, { flush: true });
  }, [answerKeyMode, blocksConfig, canPersistForSession, challenge.id, saveBlocks]);

  const confirmModeSwitch = useCallback(() => {
    flushBlocksSnapshot();
    setPendingMode((target) => {
      if (target) setEditorMode(target);
      return null;
    });
  }, [flushBlocksSnapshot]);

  // Switching Blocks → Java with conversion: compile the current block layout to
  // Java (the same generator the grader uses) and load it into the Java editor,
  // replacing whatever was there before.
  const convertBlocksToJava = useCallback(async () => {
    if (blocksConfig) {
      try {
        const { generateJava } = await import("@/lib/blockly/javaGenerator");
        const generated = generateJava(
          blocklyHandleRef.current?.getState()
            ?? blockStateRef.current
            ?? blocksConfig.starter,
          blocksConfig.frame
        );
        setCode(generated);
        editorRef.current?.setValue(generated);
        if (canPersistForSession()) {
          saveCodeDraft(challenge.id, generated);
          void saveCode(generated);
        }
      } catch {
        // If generation fails, fall back to keeping the existing Java code.
      }
    }
    flushBlocksSnapshot();
    setPendingMode(null);
    setEditorMode("java");
  }, [blocksConfig, canPersistForSession, challenge.id, flushBlocksSnapshot, saveCode]);

  useEffect(() => {
    restoredBlocksRef.current = null;
    if (answerKeyMode) {
      setResolvedBlocksState(answerKey?.blocks ?? null);
    } else {
      setResolvedBlocksState(null);
    }
  }, [challenge.id, answerKeyMode, answerKey?.blocks]);

  useEffect(() => {
    if (answerKeyMode || !blocksConfig) return;
    const session = getSession();
    const needsCloud = session?.role === "student";
    if (needsCloud && (!dbHydrated || !snapshotsHydrated)) return;
    const blocksRestoreKey = workspaceRestoreKey(progressStudentId, challenge.id);
    if (restoredBlocksRef.current === blocksRestoreKey) return;

    const restored = chooseSavedBlocks(
      challenge.id,
      blocksConfig.starter,
      loadedBlocks,
      loadedBlocksUpdatedAt
    );
    setResolvedBlocksState(restored);
    blockStateRef.current = restored;
    restoredBlocksRef.current = blocksRestoreKey;
  }, [
    answerKeyMode,
    blocksConfig,
    challenge.id,
    dbHydrated,
    snapshotsHydrated,
    loadedBlocks,
    loadedBlocksUpdatedAt,
    progressStudentId,
  ]);

  // Java is always the default mode; only offer blocks where supported.
  useEffect(() => {
    if (!blocksEnabled) setEditorMode("java");
  }, [blocksEnabled, challenge.id]);

  useEffect(() => {
    configureMonacoLoader();
  }, []);

  useEffect(() => {
    if (editorMode === "blocks" || pendingMode === "blocks") {
      setBlocklyMounted(true);
    }
  }, [editorMode, pendingMode]);

  const persistBlocks = useCallback(
    (state: WorkspaceState, options?: { flushCloud?: boolean }) => {
      if (!canPersistForSession()) return;
      saveBlockDraft(challenge.id, state);
      void saveBlocks(state, { flush: options?.flushCloud });
    },
    [canPersistForSession, challenge.id, saveBlocks]
  );

  const handleBlocksChange = useCallback(
    (state: WorkspaceState) => {
      if (answerKeyMode) return;
      blockStateRef.current = state;
      clearTimeout(blockDraftTimer.current);
      blockDraftTimer.current = setTimeout(() => {
        persistBlocks(state);
      }, 400);
    },
    [answerKeyMode, persistBlocks]
  );

  // Sync Monaco theme whenever the app theme changes
  useEffect(() => {
    monacoRef.current?.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  const resetCode = useCallback(() => {
    setCode(challenge.starterCode);
    editorRef.current?.setValue(challenge.starterCode);
    saveCodeDraft(challenge.id, challenge.starterCode);
    void saveCode(challenge.starterCode, { flush: true });
  }, [challenge.id, challenge.starterCode, saveCode]);

  // Reset resets the *active* editor: starter Java in Java mode, starter blocks
  // in Blocks mode. The two modes keep independent drafts.
  const handleReset = useCallback(() => {
    if (editorMode === "blocks" && blocksConfig) {
      clearBlockDraft(challenge.id);
      blockStateRef.current = blocksConfig.starter;
      persistBlocks(blocksConfig.starter, { flushCloud: true });
      setBlockResetSignal((n) => n + 1);
    } else {
      resetCode();
    }
  }, [editorMode, blocksConfig, challenge.id, persistBlocks, resetCode]);

  const persistCode = useCallback(
    (next: string, options?: { flushCloud?: boolean }) => {
      if (!canPersistForSession()) return;
      saveCodeDraft(challenge.id, next);
      void saveCode(next, { flush: options?.flushCloud });
    },
    [canPersistForSession, challenge.id, saveCode]
  );

  const persistCodeRef = useRef(persistCode);
  const flushBlocksSnapshotRef = useRef(flushBlocksSnapshot);
  useEffect(() => {
    persistCodeRef.current = persistCode;
  }, [persistCode]);
  useEffect(() => {
    flushBlocksSnapshotRef.current = flushBlocksSnapshot;
  }, [flushBlocksSnapshot]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Restore saved draft / cloud snapshot once when opening a challenge
  useEffect(() => {
    restoredChallengeRef.current = null;
  }, [challenge.id]);

  // Re-load drafts when the signed-in student changes (avoid showing another account's work)
  useEffect(() => {
    const onSessionChange = () => {
      clearTimeout(saveTimer.current);
      clearTimeout(blockDraftTimer.current);
      restoredChallengeRef.current = null;
      restoredBlocksRef.current = null;

      const starter = challenge.starterCode;
      setCode(starter);
      codeRef.current = starter;
      editorRef.current?.setValue(starter);

      if (blocksConfig) {
        setResolvedBlocksState(blocksConfig.starter);
        blockStateRef.current = blocksConfig.starter;
        setBlockResetSignal((n) => n + 1);
      } else {
        setResolvedBlocksState(null);
        blockStateRef.current = null;
      }
    };
    window.addEventListener("ftc-session-updated", onSessionChange);
    return () => window.removeEventListener("ftc-session-updated", onSessionChange);
  }, [blocksConfig, challenge.starterCode]);

  useEffect(() => {
    if (answerKeyMode) return;
    const session = getSession();
    const needsCloud = session?.role === "student";
    if (needsCloud && (!dbHydrated || !snapshotsHydrated)) return;
    const codeRestoreKey = workspaceRestoreKey(progressStudentId, challenge.id);
    if (restoredChallengeRef.current === codeRestoreKey) return;

    const restored = chooseSavedCode(
      challenge.id,
      challenge.starterCode,
      loadedCode,
      loadedCodeUpdatedAt
    );
    setCode(restored);
    editorRef.current?.setValue(restored);
    restoredChallengeRef.current = codeRestoreKey;
  }, [
    answerKeyMode,
    challenge.id,
    challenge.starterCode,
    dbHydrated,
    snapshotsHydrated,
    loadedCode,
    loadedCodeUpdatedAt,
    progressStudentId,
  ]);

  // Flush the latest editor contents when leaving the page or unmounting
  useEffect(() => {
    if (answerKeyMode) return;
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
  }, [answerKeyMode, challenge.id]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Java sent to the grader / mentor — generated from blocks when in Blocks mode. */
  const resolveSubmissionCode = useCallback(async (): Promise<string> => {
    const mode = editorModeRef.current;
    const config = blocksConfigRef.current;
    if (mode === "blocks" && config) {
      const liveState =
        blocklyHandleRef.current?.getState()
        ?? blockStateRef.current
        ?? config.starter;
      if (liveState) {
        blockStateRef.current = liveState;
        if (!answerKeyMode) {
          clearTimeout(blockDraftTimer.current);
          if (
            progressStudentId &&
            hasPendingUpsert(
              progressUpsertKey(progressStudentId, challenge.id, "blocks")
            )
          ) {
            persistBlocks(liveState, { flushCloud: true });
          }
        }
      }
      try {
        const { generateJava } = await import("@/lib/blockly/javaGenerator");
        return generateJava(liveState, config.frame);
      } catch {
        return "";
      }
    }
    return codeRef.current;
  }, [challenge.id, answerKeyMode, persistBlocks, progressStudentId]);

  const resolveBlocksSnapshot = useCallback((): WorkspaceState | null => {
    if (answerKeyMode || !blocksConfigRef.current) return null;
    const liveState =
      blocklyHandleRef.current?.getState()
      ?? blockStateRef.current;
    if (!liveState) return null;
    blockStateRef.current = liveState;
    if (!answerKeyMode) {
      clearTimeout(blockDraftTimer.current);
      if (
        progressStudentId &&
        hasPendingUpsert(
          progressUpsertKey(progressStudentId, challenge.id, "blocks")
        )
      ) {
        persistBlocks(liveState, { flushCloud: true });
      }
    }
    return liveState;
  }, [answerKeyMode, persistBlocks, progressStudentId, challenge.id]);

  /** Mentor review stores the Java editor draft, not blocks-generated Java. */
  const resolveMentorReviewSnapshots = useCallback(() => {
    const blocksSnapshot = resolveBlocksSnapshot();
    const starter = challenge.starterCode ?? "";
    let javaSnapshot = codeRef.current;
    const config = blocksConfigRef.current;
    const blocksChanged =
      blocksSnapshot &&
      config &&
      JSON.stringify(blocksSnapshot) !== JSON.stringify(config.starter);

    if (blocksChanged && javaSnapshot.trim() === starter.trim()) {
      javaSnapshot = "";
    }

    return { javaSnapshot, blocksSnapshot, blocksChanged: Boolean(blocksChanged) };
  }, [challenge.starterCode, resolveBlocksSnapshot]);

  const submitForMentorReview = useCallback(
    async (
      javaSnapshot: string,
      blocksSnapshot: WorkspaceState | null,
      blocksChanged: boolean
    ): Promise<{ error: string | null }> => {
      if (!studentSession?.id) {
        return { error: null };
      }
      if (!javaSnapshot.trim() && !blocksChanged) {
        const msg =
          "Add Java code in OnBot Java or build with FTC Blocks before submitting.";
        setSubmitError(msg);
        return { error: msg };
      }
      setSubmitting(true);
      setSubmitError(null);

      const basePayload = {
        student_id: studentSession.id,
        challenge_id: challenge.id,
        code_snapshot: javaSnapshot,
        status: "pending" as const,
        grade: null,
        feedback: null,
        graded_at: null,
        graded_by: null,
        submitted_at: new Date().toISOString(),
      };

      let result = await supabase
        .from("challenge_submissions")
        .upsert(
          { ...basePayload, blocks_snapshot: blocksSnapshot },
          { onConflict: "student_id,challenge_id" }
        )
        .select("id, status, grade, feedback, submitted_at, graded_at")
        .single();

      if (
        result.error?.message.includes("blocks_snapshot") &&
        blocksSnapshot
      ) {
        result = await supabase
          .from("challenge_submissions")
          .upsert(basePayload, { onConflict: "student_id,challenge_id" })
          .select("id, status, grade, feedback, submitted_at, graded_at")
          .single();
      }

      const { data, error } = result;
      setSubmitting(false);
      if (error) {
        setSubmitError(error.message);
        return { error: error.message };
      }
      if (data) setSubmission(data as SubmissionRow);
      setSubmitBanner(true);
      setTimeout(() => setSubmitBanner(false), 4000);
      return { error: null };
    },
    [studentSession?.id, challenge.id]
  );

  const handleSubmitForReview = useCallback(async () => {
    if (!studentSession?.id || submitting) return;
    setSubmitError(null);
    persistCode(codeRef.current, { flushCloud: true });
    const { javaSnapshot, blocksSnapshot, blocksChanged } =
      resolveMentorReviewSnapshots();
    await submitForMentorReview(javaSnapshot, blocksSnapshot, blocksChanged);
  }, [
    studentSession?.id,
    submitting,
    persistCode,
    resolveMentorReviewSnapshots,
    submitForMentorReview,
  ]);

  const showSubmitForReview =
    isMentorChallenge && !!studentSession && !answerKeyMode;
  const reviewGraded = submission?.status === "graded";
  const reviewPending = submission?.status === "pending";

  const renderSubmitForReviewButton = (compact = false) => {
    if (!showSubmitForReview) return null;

    const base =
      "flex items-center gap-1.5 rounded-md font-semibold transition-all duration-150 disabled:cursor-not-allowed";
    const sizing = compact
      ? "px-2 py-1 text-[11px]"
      : "px-3 py-1 text-xs";

    let stateClass =
      "bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-sm disabled:opacity-50";
    if (submitting) {
      stateClass = "bg-slate-800 text-slate-500";
    }

    return (
      <button
        type="button"
        onClick={handleSubmitForReview}
        disabled={submitting}
        title={
          reviewGraded
            ? "Send a revised version to your mentor for another review"
            : reviewPending
              ? "Send an updated version to your mentor"
              : "Submit to your mentor for grading"
        }
        className={`${base} ${sizing} ${stateClass}`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="h-3 w-3" />
            {reviewGraded
              ? "Resubmit for Review"
              : reviewPending
                ? "Update Submission"
                : "Submit for Review"}
          </>
        )}
      </button>
    );
  };

  // ── Resizable split ─────────────────────────────────────────────────────
  const [leftPct, setLeftPct] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.max(28, Math.min(62, pct)));
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

  // ── Console & grade state ───────────────────────────────────────────────
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastGrade, setLastGrade] = useState<Grade | null>(null);

  /**
   * Per-check live status shown in the left panel's "Code Requirements" list.
   * Keys are check labels; value is the tier-aware display status.
   */
  const [checkStatuses, setCheckStatuses] = useState<
    Record<string, "pass" | "fail" | "warn">
  >({});

  /** Checks that flat-out fail (required tier) — shown as errors in the left panel. */
  const [failedErrors, setFailedErrors] = useState<
    Array<{ label: string; tip?: string; lines?: number[] }>
  >([]);

  /** Checks that are optional improvements — shown as suggestions. */
  const [failedImprovements, setFailedImprovements] = useState<
    Array<{ label: string; tip?: string }>
  >([]);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  // Bumped on every submit so an in-flight console stream can detect that a
  // newer submission has superseded it and stop appending.
  const submissionSeq = useRef(0);

  const appendEntry = useCallback((entry: Omit<ConsoleEntry, "id" | "ts">) => {
    setConsoleEntries((prev) => [
      ...prev,
      { ...entry, id: makeId(), ts: nowTime() },
    ]);
  }, []);

  // Auto-scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleEntries]);

  // ── Submit / validate ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setConsoleOpen(true);
    setConsoleEntries([]);
    setLastGrade(null);

    const runId = ++submissionSeq.current;
    const filename = `Challenge${challenge.id}_${challenge.title.replace(/\s+/g, "")}.java`;
    let finishedGrading = false;

    try {
    appendEntry({ type: "init", message: "FTC Hub Analyzer v3.0" });
    appendEntry({ type: "separator", message: "" });

    if (editorMode === "java") {
      const clearModel = editorRef.current?.getModel();
      if (clearModel && monacoRef.current) {
        monacoRef.current.editor.setModelMarkers(clearModel, "ftc-grader", []);
      }
    }

    const submissionCode = await resolveSubmissionCode();

    // ── Real grader call ─────────────────────────────────────────────
    // Started before the intro animation so the request and the animation
    // overlap instead of running back to back.
    const gradePromise = gradeCode(
      submissionCode,
      challenge.id,
      challenge.mentorRules
    );
    // Marks the rejection as handled while the animation plays; the await
    // below still throws and is caught exactly as before.
    gradePromise.catch(() => {});

    await delay(180);
    appendEntry({ type: "running", message: `Compiling ${filename} with javac…` });

    let result: GradedResult;
    try {
      result = await gradePromise;
    } catch (err) {
      const msg =
        err instanceof GraderTimeoutError
          ? "Analyzer took too long. Try again — the service may be warming up."
          : err instanceof GraderUnreachableError
          ? err.message
          : "Unexpected analyzer error. Try again in a moment.";
      appendEntry({ type: "separator", message: "" });
      appendEntry({
        type: "verdict-wrong",
        message: "Analyzer Offline",
        sub: msg,
      });
      setLastGrade(null);
      return;
    }

    // ── Commit the verdict to state immediately ──────────────────────
    // The console output below is cosmetic. Gating state on it kept Submit
    // and "Mark as Complete" disabled for ~3s after the verdict was known.
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

    // ── Populate live check statuses for the left panel ────────────────
    const statuses: Record<string, "pass" | "fail" | "warn"> = {};
    [...result.universalResults, ...result.requiredResults].forEach((r) => {
      statuses[r.label] = r.pass ? "pass" : "fail";
    });
    result.improvementResults.forEach((r) => {
      statuses[r.label] = r.pass ? "pass" : "warn";
    });
    result.styleResults.forEach((r) => {
      statuses[r.label] = r.pass ? "pass" : "warn";
    });
    setCheckStatuses(statuses);

    const syntaxErrors = result.syntaxIssues
      .filter((s) => s.severity === "error")
      .map((s) => ({ label: s.message, lines: s.lines }));

    const universalRequiredFails = result.universalResults
      .filter((r) => !r.pass && r.tier === "required")
      .map((r) => ({ label: r.label, tip: r.tip, lines: r.matchedLines }));

    const universalSoftFails = result.universalResults
      .filter((r) => !r.pass && r.tier !== "required")
      .map((r) => ({ label: r.label, tip: r.tip, lines: r.matchedLines }));

    const challengeRequiredFails = result.requiredResults
      .filter((r) => !r.pass)
      .map((r) => ({ label: r.label, tip: r.tip, lines: r.matchedLines }));

    setFailedErrors([...syntaxErrors, ...universalRequiredFails, ...challengeRequiredFails]);
    setFailedImprovements([
      ...universalSoftFails,
      ...result.improvementResults
        .filter((r) => !r.pass)
        .map((r) => ({ label: r.label, tip: r.tip })),
      ...result.styleResults
        .filter((r) => !r.pass)
        .map((r) => ({ label: r.label, tip: r.tip })),
    ]);

    const { grade, verdict } = result;
    setLastGrade(grade);

    // Local completion is synchronous and drives the "Completed" UI, so it
    // must not wait on the animation either. The DB writes stay in the
    // streamed sequence below, where they already were.
    if (grade === "good" && !homeworkMode) {
      markCompleteLocal(challenge.id);
    }

    finishedGrading = true;
    setIsRunning(false);

    // ── Console output streams in the background ──────────────────────
    void (async () => {
      // Resolves false once a newer submission has superseded this run, so a
      // stale stream stops appending into a console that was already cleared.
      const step = async (ms: number) => {
        await delay(ms);
        return submissionSeq.current === runId;
      };

      if (!(await step(120))) return;
      appendEntry({ type: "info", message: "Compilation complete — running rubric checks…" });

      if (!(await step(180))) return;
      appendEntry({ type: "separator", message: "" });

      // ── Syntax issues ──────────────────────────────────────────────────
      if (result.syntaxIssues.length > 0) {
        appendEntry({ type: "info", message: "Syntax check:" });
        for (const issue of result.syntaxIssues) {
          if (!(await step(120))) return;
          appendEntry({
            type: issue.severity === "error" ? "error" : "warning",
            message: withLinePrefix(issue.message, issue.lines),
          });
        }
        appendEntry({ type: "separator", message: "" });
      }

      // ── Universal checks ───────────────────────────────────────────────
      appendEntry({ type: "info", message: "OpMode requirements:" });
      for (const r of result.universalResults) {
        if (!(await step(110))) return;
        appendEntry({
          type: r.pass ? "success" : "error",
          message: r.pass
            ? `${r.label} — ${r.description}`
            : withLinePrefix(`${r.label} — ${r.tip ?? r.description}`, r.matchedLines),
        });
      }

      if (!(await step(200))) return;
      appendEntry({ type: "separator", message: "" });

      // ── Required checks ────────────────────────────────────────────────
      appendEntry({
        type: "info",
        message: `Challenge ${challenge.id} — required checks:`,
      });
      for (const r of result.requiredResults) {
        if (!(await step(130))) return;
        appendEntry({
          type: r.pass ? "success" : "error",
          message: r.pass
            ? `${r.label} — ${r.description}`
            : withLinePrefix(`${r.label} — ${r.tip ?? r.description}`, r.matchedLines),
        });
      }

      // ── Improvement hints (only shown if required all passed) ──────────
      if (result.improvementResults.length > 0) {
        if (!(await step(220))) return;
        appendEntry({ type: "separator", message: "" });
        appendEntry({ type: "info", message: "Best-practice suggestions:" });
        for (const r of result.improvementResults) {
          if (!(await step(130))) return;
          appendEntry({
            type: r.pass ? "success" : "warning",
            message: r.pass
              ? `${r.label} — ${r.description}`
              : `${r.label} — ${r.tip ?? r.description}`,
          });
        }
      }

      // ── Style hints ────────────────────────────────────────────────────
      if (result.styleResults.length > 0) {
        const styleIssues = result.styleResults.filter((r) => !r.pass);
        if (styleIssues.length > 0) {
          if (!(await step(200))) return;
          appendEntry({ type: "separator", message: "" });
          appendEntry({ type: "info", message: "Code quality:" });
          for (const r of styleIssues) {
            if (!(await step(100))) return;
            appendEntry({
              type: "warning",
              message: `${r.label} — ${r.tip ?? r.description}`,
            });
          }
        }
      }

      // ── Verdict ────────────────────────────────────────────────────────
      if (!(await step(300))) return;
      appendEntry({ type: "separator", message: "" });

      const verdictType =
        grade === "good"
          ? "verdict-good"
          : grade === "needs-improvement"
          ? "verdict-improve"
          : "verdict-wrong";

      appendEntry({
        type: verdictType,
        message: verdict.title,
        sub: verdict.subtitle,
      });

      if (grade === "good") {
        if (!(await step(160))) return;
        appendEntry({
          type: "info",
          message: "Deploy to robot hardware via Android Studio to verify on-field.",
        });
      }

      // ── Auto-complete + mentor submit on "Good" ────────────────────────
      // Kept at the tail of the stream so these messages stay in order after
      // the verdict, matching the previous behaviour and timing.
      if (grade !== "good") return;

      if (homeworkMode && onHomeworkComplete) {
        try {
          const hwResult = await onHomeworkComplete(submissionCode);
          if (hwResult && !hwResult.ok) {
            appendEntry({
              type: "warning",
              message: hwResult.error ?? "Could not save homework completion.",
            });
          } else {
            appendEntry({
              type: "info",
              message: "Homework marked complete.",
            });
          }
        } catch {
          appendEntry({
            type: "warning",
            message: "Could not save homework completion — use Mark Homework Complete.",
          });
        }
      } else if (!homeworkMode) {
        await saveCode(submissionCode, { flush: true });
        await markCompleteDB(challenge.id, submissionCode);
        appendEntry({
          type: "info",
          message: "Challenge marked complete — XP awarded.",
        });
      }

      if (isMentorChallenge) {
        if (!studentSession?.id) {
          appendEntry({
            type: "warning",
            message:
              "Sign in as a student and pick your class to submit for mentor review.",
          });
        } else {
          const { javaSnapshot, blocksSnapshot, blocksChanged } =
            resolveMentorReviewSnapshots();
          if (!javaSnapshot.trim() && !blocksChanged) {
            appendEntry({
              type: "warning",
              message:
                "Add Java code or FTC Blocks before submitting for mentor review.",
            });
          } else {
            const { error: reviewErr } = await submitForMentorReview(
              javaSnapshot,
              blocksSnapshot,
              blocksChanged
            );
            if (!reviewErr) {
              appendEntry({
                type: "info",
                message: "Submitted to your mentor for review.",
              });
            }
          }
        }
      }
    })();
    } finally {
      if (!finishedGrading) setIsRunning(false);
    }
  }, [
    challenge,
    editorMode,
    isRunning,
    appendEntry,
    markCompleteLocal,
    markCompleteDB,
    saveCode,
    homeworkMode,
    onHomeworkComplete,
    resolveSubmissionCode,
    resolveMentorReviewSnapshots,
    isMentorChallenge,
    studentSession?.id,
    submission?.status,
    submitForMentorReview,
  ]);

  // ── Left panel section toggles ─────────────────────────────────────────
  const [showObjectives, setShowObjectives] = useState(true);

  // ── LEFT PANEL TABS — delete `leftTab` state + the tab bar JSX below to revert ──
  const [leftTab, setLeftTab] = useState<"task" | "checks" | "hints">("task");

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex w-full min-w-0 flex-col overflow-hidden"
      style={{ height: "calc(100svh - 3.5rem)" }}
    >
      {/* ── Workspace top bar ──────────────────────────────────────────── */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-800/60 bg-slate-950/95 px-3 backdrop-blur-md min-w-0">
        <Link
          href={backHref}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 link-accent transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>{backLabel}</span>
        </Link>

        <span className="text-slate-800 text-xs">/</span>

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="truncate text-xs font-medium text-slate-300">
            {challenge.title}
          </span>
          <span
            className={`hidden sm:inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${diff.badgeClass}`}
          >
            {diff.label}
          </span>
          <span className="hidden sm:flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
            <Zap className="h-3 w-3" />
            <span>{challenge.xp} XP</span>
          </span>

          {/* Real-time grade status */}
          {lastGrade === "good" || done ? (
            <span className="hidden sm:flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-500">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </span>
          ) : lastGrade === "needs-improvement" ? (
            <span className="hidden sm:flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-400">
              <TriangleAlert className="h-3 w-3" />
              Needs work
            </span>
          ) : lastGrade === "wrong" ? (
            <span className="hidden sm:flex shrink-0 items-center gap-1 text-[11px] font-medium text-red-400">
              <XCircle className="h-3 w-3" />
              Not passing
            </span>
          ) : null}
          {reviewPending && (
            <span className="hidden sm:flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-400">
              <Send className="h-3 w-3" />
              Awaiting mentor review
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {renderSubmitForReviewButton()}
          {answerKeyMode ? (
            <span className="flex shrink-0 items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              <Key className="h-3 w-3" />
              Answer Key
            </span>
          ) : (
            <>
              {prevChallenge && (
                <Link
                  href={`/challenges/${prevChallenge.id}`}
                  title={prevChallenge.title}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              )}
              {nextChallenge && (
                <Link
                  href={`/challenges/${nextChallenge.id}`}
                  title={nextChallenge.title}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Split workspace body ───────────────────────────────────────── */}
      <div ref={containerRef} className="flex min-w-0 flex-1 overflow-hidden">
        {/* ── LEFT: Instructions panel ─────────────────────────────────── */}
        <aside
          className="flex min-w-0 shrink-0 flex-col overflow-hidden border-r border-slate-800"
          style={{ width: `${leftPct}%` }}
        >
          {/* ── TAB BAR ─────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-0.5 border-b border-slate-800/60 bg-slate-950/80 px-2 h-9">
            {(["task", "checks", "hints"] as const).map((tab) => {
              const labels = { task: "Task", checks: "Checks", hints: "Hints" };
              const isActive = leftTab === tab;
              const errorBadge = tab === "checks" && failedErrors.length > 0;
              const warnBadge  = tab === "checks" && failedErrors.length === 0 && failedImprovements.length > 0;
              const passBadge  = tab === "checks" && Object.keys(checkStatuses).length > 0 && failedErrors.length === 0 && failedImprovements.length === 0;
              return (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab)}
                  className={`relative flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "tab-active-pill"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  {labels[tab]}
                  {errorBadge && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                  {warnBadge  && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  {passBadge  && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
            <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-700">
              <Clock className="h-3 w-3" />
              {challenge.estimatedTime}
            </span>
          </div>

          <div className="sidebar-scroll min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 space-y-5">

            {/* ── TASK TAB ───────────────────────────────────────────────── */}
            {leftTab === "task" && (
              <>
                {/* Description */}
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-400">
                  {challenge.description}
                </p>

                {/* Objectives */}
                <div>
                  <button
                    onClick={() => setShowObjectives((v) => !v)}
                    className="flex w-full items-center gap-2 mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    Objectives
                    {showObjectives ? (
                      <ChevronUp className="h-3 w-3 ml-auto" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    )}
                  </button>
                  {showObjectives && (
                    <ul className="space-y-1.5">
                      {challenge.objectives.map((obj, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 py-1.5"
                        >
                          <span className="text-[10px] font-mono text-slate-700 mt-0.5 shrink-0 w-4 text-right">{i + 1}.</span>
                          <span className="min-w-0 break-words text-xs text-slate-400 leading-relaxed">
                            {obj}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-600">
                    Problem Statement
                  </p>
                  <div className="min-w-0 overflow-hidden rounded-md border border-slate-800/60 bg-slate-900/30 px-4 py-3.5">
                    <InstructionBlock text={challenge.instructions} />
                  </div>
                </div>

                {/* Concepts */}
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-600">
                    Concepts Covered
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {challenge.conceptsCovered.map((c) => (
                      <span
                        key={c}
                        className="rounded border border-slate-800/60 bg-slate-900/60 px-2 py-0.5 text-[10px] font-mono text-slate-500"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── CHECKS TAB ─────────────────────────────────────────────── */}
            {leftTab === "checks" && (
              <>
                {Object.keys(checkStatuses).length === 0 ? (
                  <div>
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-slate-600">
                      Requirements
                    </p>
                    <ul className="space-y-1.5">
                      {challenge.objectives.map((obj, i) => (
                        <RequirementItem key={i} label={obj} status="pending" />
                      ))}
                    </ul>
                    <p className="mt-4 text-xs text-slate-600">
                      Submit your code to see live results.
                    </p>
                  </div>
                ) : failedErrors.length === 0 && failedImprovements.length === 0 ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-4 text-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto mb-1.5" />
                    <p className="text-xs font-mono font-medium text-emerald-300">All checks passed</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {failedErrors.length > 0 && (
                      <div>
                        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                          <XCircle className="h-3 w-3" /> Errors · {failedErrors.length}
                        </p>
                        <ul className="space-y-1.5">
                          {failedErrors.map((item, i) => (
                            <li key={i} className="min-w-0 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                              <div className="flex items-start gap-2">
                                {item.lines?.[0] ? (
                                  <span className="shrink-0 rounded border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-200">
                                    L{item.lines[0]}
                                  </span>
                                ) : null}
                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-[11px] font-semibold text-red-300 leading-snug">{item.label}</p>
                                  {item.tip ? (
                                    <p className="mt-0.5 break-words text-[10px] text-red-400/70 leading-relaxed">{item.tip}</p>
                                  ) : null}
                                  {item.lines && item.lines.length > 1 ? (
                                    <p className="mt-0.5 font-mono text-[10px] text-red-400/60">
                                      Also on lines {item.lines.slice(1, 6).join(", ")}
                                      {item.lines.length > 6 ? "…" : ""}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {failedImprovements.length > 0 && (
                      <div>
                        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3" /> Suggestions · {failedImprovements.length}
                        </p>
                        <ul className="space-y-1.5">
                          {failedImprovements.map((item, i) => (
                            <li key={i} className="min-w-0 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                              <p className="break-words text-[11px] font-semibold text-amber-300 leading-snug">{item.label}</p>
                              {item.tip && <p className="mt-0.5 break-words text-[10px] text-amber-400/70 leading-relaxed">{item.tip}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── HINTS TAB ──────────────────────────────────────────────── */}
            {leftTab === "hints" && (
              <>
                <HintsAccordion hints={challenge.hints} />
                {!answerKeyMode && (
                  <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-4">
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-slate-600">
                      Mark Complete
                    </p>
                    <MarkCompleteButton
                      challengeId={challenge.id}
                      xp={challenge.xp}
                      lastGrade={lastGrade}
                      forceCompleted={homeworkMode ? homeworkCompleted : undefined}
                      completed={homeworkMode ? undefined : isCompleted(challenge.id)}
                      progressReady={localProgressHydrated}
                      onMarkComplete={
                        homeworkMode
                          ? undefined
                          : () => markComplete(challenge.id)
                      }
                      onMarkIncomplete={
                        homeworkMode
                          ? undefined
                          : async () => {
                              markIncompleteLocal(challenge.id);
                              await markIncompleteDB(challenge.id);
                            }
                      }
                      onComplete={
                        homeworkMode && onHomeworkComplete
                          ? async () => {
                              await onHomeworkComplete(await resolveSubmissionCode());
                            }
                          : undefined
                      }
                      completeLabel={homeworkMode ? "Mark Homework Complete" : "Mark as Complete"}
                    />
                  </div>
                )}
              </>
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

        {/* ── RIGHT: Editor + Console ───────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-slate-800/60 bg-slate-950/80 px-3">
            {blocksEnabled && (
              <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/70 p-0.5">
                <button
                  onClick={() => requestModeSwitch("java")}
                  title="Type Java in the OnBot editor"
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
                  title="Build with FTC Blocks"
                  className={
                    editorMode === "blocks"
                      ? "rounded bg-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-100"
                      : "rounded px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-300"
                  }
                >
                  FTC Blocks
                </button>
              </div>
            )}
            <FileCode className="h-3 w-3 text-slate-700 shrink-0" />
            <span className="font-mono text-[11px] text-slate-600 truncate">
              {editorMode === "blocks"
                ? `Challenge${challenge.id}_${challenge.title.replace(/\s+/g, "")}.blocks`
                : `Challenge${challenge.id}_${challenge.title.replace(/\s+/g, "")}.java`}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              {renderSubmitForReviewButton(true)}
              {answerKeyMode ? (
                <span className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-600">
                  <Key className="h-3 w-3" />
                  Reference solution · read-only
                </span>
              ) : (
                <button
                  onClick={handleReset}
                  title={
                    editorMode === "blocks"
                      ? "Reset to starter blocks"
                      : "Reset to starter code"
                  }
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Editor surface: Monaco (Java) or Blockly (FTC Blocks) */}
          <div className="relative min-w-0 flex-1 overflow-hidden">
            {/* Both editors stay mounted so neither loses its in-progress work
                when toggling modes; only the inactive one is hidden. */}
            <div className={editorMode === "blocks" ? "hidden" : "h-full w-full"}>
              <MonacoEditor
                key={workspaceRestoreKey(progressStudentId, challenge.id)}
                height="100%"
                language="java"
                theme={monacoTheme}
                value={code}
                onChange={(val) => {
                  if (answerKeyMode) return;
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
                  readOnly: answerKeyMode,
                  domReadOnly: answerKeyMode,
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
                  scrollbar: {
                    verticalScrollbarSize: 6,
                    horizontalScrollbarSize: 6,
                  },
                  lineDecorationsWidth: 4,
                  suggest: { showWords: true },
                }}
              />
            </div>
            {blocklyMounted && blocksEnabled && (answerKeyMode || blocksConfig) && (
              <div className={editorMode === "blocks" ? "h-full w-full" : "hidden"}>
                {resolvedBlocksState ? (
                <BlocklyWorkspace
                  key={workspaceRestoreKey(progressStudentId, challenge.id)}
                  toolbox={FULL_TOOLBOX}
                  initialState={resolvedBlocksState}
                  starterState={blocksConfig?.starter ?? resolvedBlocksState}
                  resetSignal={blockResetSignal}
                  dark={monacoTheme === "ftc-dark"}
                  visible={editorMode === "blocks"}
                  readOnly={answerKeyMode}
                  onChange={handleBlocksChange}
                  registerHandle={registerBlocklyHandle}
                />
                ) : (
                  <EditorSkeleton />
                )}
              </div>
            )}
          </div>

          {/* ── Mode-switch confirmation (portaled above Blockly) ───────── */}
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
                      Your OnBot Java code is saved separately and will still be
                      here when you switch back. The two modes do not share or
                      convert each other&apos;s work.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      You can convert your block layout into Java code, or keep
                      the Java code you already have. Your block layout is saved
                      separately and will still be here when you switch back.
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

          {/* ── Submit error banner ─────────────────────────────────────── */}
          {submitError && (
            <div className="flex shrink-0 items-center gap-2 border-t border-red-500/20 bg-red-500/10 px-4 py-2">
              <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-300">{submitError}</span>
            </div>
          )}

          {/* ── Submit success banner ───────────────────────────────────── */}
          {submitBanner && (
            <div className="flex shrink-0 items-center gap-2 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="text-xs font-medium text-amber-300">
                Submitted for mentor review!
              </span>
            </div>
          )}

          {/* ── Mentor feedback (graded submission) ─────────────────────── */}
          {isMentorChallenge && studentSession && submission?.status === "graded" && (
            <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 py-3">
              <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-300">
                      Mentor Feedback
                    </span>
                    <GradeBadge grade={submission.grade} />
                  </div>
                  {submission.feedback ? (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {submission.feedback}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 italic">
                      No written feedback provided.
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] text-slate-600">
                    Graded by your mentor — edit your code and use Resubmit for Review to send an update.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Console ─────────────────────────────────────────────────── */}
          {!answerKeyMode && (
          <div
            className={`flex flex-col border-t border-slate-800 bg-slate-950 transition-all duration-300 ${
              consoleOpen ? "h-64" : "h-10"
            }`}
          >
            {/* Console toolbar */}
            <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-hidden border-b border-slate-800/60 px-3">
              <Terminal className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-500">Console</span>

              {consoleEntries.length > 0 && (
                <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                  {consoleEntries.filter((e) => !e.type.startsWith("separator")).length}
                </span>
              )}

              <div className="ml-auto flex items-center gap-1.5">
                {consoleEntries.length > 0 && (
                  <button
                    onClick={() => {
                      setConsoleEntries([]);
                      setLastGrade(null);
                    }}
                    title="Clear console"
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-800 hover:text-slate-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}

                <button
                  onClick={() => setConsoleOpen((v) => !v)}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-800 hover:text-slate-400 transition-colors"
                >
                  {consoleOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </button>

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={isRunning}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                    isRunning
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "btn-primary shadow-sm"
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      Submit Code
                    </>
                  )}
                </button>

                {renderSubmitForReviewButton(true)}
              </div>
            </div>

            {/* Grade status bar — pinned just below the toolbar */}
            {consoleOpen && lastGrade && (
              <GradeBanner grade={lastGrade} />
            )}

            {/* Scrollable log */}
            {consoleOpen && (
              <div className="sidebar-scroll min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-2">
                {consoleEntries.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-700 italic">
                    Press &quot;Submit Code&quot; to analyze your solution…
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
          )}
        </div>
      </div>
    </div>
  );
}
