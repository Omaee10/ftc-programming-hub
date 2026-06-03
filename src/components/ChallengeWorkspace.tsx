"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Monaco } from "@monaco-editor/react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Code2,
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
import { challenges as staticChallenges, difficultyConfig, getChallengeById } from "@/data/challenges";
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
import { getSession, type Session } from "@/lib/auth";
import {
  clearCodeDraft,
  readCodeDraft,
  saveCodeDraft,
} from "@/lib/challengeCodeDrafts";
import MarkCompleteButton from "./MarkCompleteButton";
import HintsAccordion from "./HintsAccordion";
import EditorModeSwitch, { ModeSwitchDialog } from "./EditorModeSwitch";
import BlocksGuideRail from "./BlocksGuideRail";
import type { EditorMode } from "@/lib/blockly/types";
import {
  getBlockStarterXml,
  isLegacyBlockXml,
} from "@/data/blockStarters";
import { resolveEditorModeForChallenge } from "@/lib/resolveEditorMode";

// ─── Monaco loaded lazily (browser-only) ────────────────────────────────────
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

const BlocklyWorkspacePanel = dynamic(
  () => import("@/components/BlocklyWorkspace"),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

// ─── Custom FTC editor themes ──────────────────────────────────────────────
function defineThemes(monaco: Monaco) {
  monaco.editor.defineTheme("ftc-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "52525b", fontStyle: "italic" },
      { token: "keyword", foreground: "818cf8" },
      { token: "keyword.control", foreground: "c084fc" },
      { token: "string", foreground: "4ade80" },
      { token: "string.escape", foreground: "86efac" },
      { token: "number", foreground: "fb923c" },
      { token: "type", foreground: "38bdf8" },
      { token: "type.identifier", foreground: "7dd3fc" },
      { token: "annotation", foreground: "fbbf24" },
      { token: "delimiter", foreground: "52525b" },
    ],
    colors: {
      "editor.background": "#18181f",
      "editor.foreground": "#e4e4e7",
      "editor.lineHighlightBackground": "#18181b80",
      "editor.selectionBackground": "#1e3a5f",
      "editor.inactiveSelectionBackground": "#27272a",
      "editorLineNumber.foreground": "#3f3f46",
      "editorLineNumber.activeForeground": "#71717a",
      "editorCursor.foreground": "#f59e0b",
      "editorCursor.background": "#18181f",
      "editorIndentGuide.background1": "#27272a",
      "editorIndentGuide.activeBackground1": "#3f3f46",
      "editorGutter.background": "#18181f",
      "editorWidget.background": "#18181b",
      "editorWidget.border": "#27272a",
      "editorSuggestWidget.background": "#18181b",
      "editorSuggestWidget.border": "#27272a",
      "editorSuggestWidget.selectedBackground": "#27272a",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#27272a80",
      "scrollbarSlider.hoverBackground": "#3f3f46",
      "scrollbarSlider.activeBackground": "#52525b",
      "editor.wordHighlightBackground": "#27272a",
    },
  });

  monaco.editor.defineTheme("ftc-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b7280", fontStyle: "italic" },
      { token: "keyword", foreground: "4338ca" },
      { token: "keyword.control", foreground: "7c3aed" },
      { token: "string", foreground: "16a34a" },
      { token: "string.escape", foreground: "15803d" },
      { token: "number", foreground: "ea580c" },
      { token: "type", foreground: "0284c7" },
      { token: "type.identifier", foreground: "0369a1" },
      { token: "annotation", foreground: "d97706" },
      { token: "delimiter", foreground: "9ca3af" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1c1c1e",
      "editor.lineHighlightBackground": "#f3f4f680",
      "editor.selectionBackground": "#add6ff",
      "editor.inactiveSelectionBackground": "#e5e7eb",
      "editorLineNumber.foreground": "#9ca3af",
      "editorLineNumber.activeForeground": "#6b7280",
      "editorCursor.foreground": "#f59e0b",
      "editorIndentGuide.background1": "#e5e7eb",
      "editorIndentGuide.activeBackground1": "#9ca3af",
      "editorGutter.background": "#ffffff",
      "editorWidget.background": "#f9fafb",
      "editorWidget.border": "#e5e7eb",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border": "#e5e7eb",
      "editorSuggestWidget.selectedBackground": "#f3f4f6",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#d1d5db80",
      "scrollbarSlider.hoverBackground": "#9ca3af",
      "scrollbarSlider.activeBackground": "#6b7280",
      "editor.wordHighlightBackground": "#fef9c3",
    },
  });
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

function chooseSavedCode(
  challengeId: number,
  starterCode: string,
  cloudCode: string | null,
  cloudUpdatedAt: string | null
): string {
  const local = readCodeDraft(challengeId);
  if (cloudCode && local) {
    const localTs = Date.parse(local.updatedAt);
    const cloudTs = cloudUpdatedAt ? Date.parse(cloudUpdatedAt) : 0;
    return cloudTs >= localTs ? cloudCode : local.code;
  }
  if (cloudCode) return cloudCode;
  if (local) return local.code;
  return starterCode;
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
}: {
  challenge: Challenge;
  homeworkMode?: boolean;
  homeworkCompleted?: boolean;
  onHomeworkComplete?: (code: string) => Promise<void>;
  backHref?: string;
  backLabel?: string;
}) {
  const { theme } = useTheme();
  const monacoTheme = (theme === "light" || theme === "paper") ? "ftc-light" : "ftc-dark";

  const diff = difficultyConfig[challenge.difficulty];
  const prevChallenge = getChallengeById(challenge.id - 1);
  const nextChallenge = getChallengeById(challenge.id + 1);

  // Local (localStorage) progress — keeps working offline / for guests
  const {
    isCompleted: isCompletedLocal,
    markComplete: markCompleteLocal,
  } = useChallengeProgress();

  // Supabase progress — active when a student session exists
  const {
    isCompleted: isCompletedDB,
    markComplete: markCompleteDB,
    saveCode,
    loadedCode,
    loadedCodeUpdatedAt,
    hydrated: dbHydrated,
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
  const isMentorChallenge = !staticChallenges.find((c) => c.id === challenge.id);
  const [studentSession, setStudentSession] = useState<Session | null>(null);
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState(false);

  // Resolve student session on client only (avoids SSR / hydration mismatch)
  useEffect(() => {
    const s = getSession();
    if (s?.role === "student") setStudentSession(s);
  }, []);

  // Load existing submission for this student + mentor challenge
  useEffect(() => {
    if (!isMentorChallenge || !studentSession?.id) return;
    (async () => {
      const { data } = await supabase
        .from("challenge_submissions")
        .select("*")
        .eq("student_id", studentSession.id)
        .eq("challenge_id", challenge.id)
        .maybeSingle();
      if (data) setSubmission(data as SubmissionRow);
    })();
  }, [challenge.id, isMentorChallenge, studentSession?.id]);

  // ── Editor state ────────────────────────────────────────────────────────
  const blocksJavaOnly = challenge.blocksSupport === "java-only";
  const blocksGuideSteps =
    challenge.blocksGuideSteps ??
    challenge.objectives.slice(0, 5);

  const openingDraft = readCodeDraft(challenge.id);
  const [code, setCode] = useState(() =>
    chooseSavedCode(challenge.id, challenge.starterCode, null, null)
  );
  const [editorMode, setEditorMode] = useState<EditorMode>(() =>
    resolveEditorModeForChallenge(
      challenge,
      openingDraft,
      challenge.starterCode
    )
  );
  const [blockXml, setBlockXml] = useState(() => {
    const draft = openingDraft?.blockXml;
    if (draft && !isLegacyBlockXml(draft)) return draft;
    return getBlockStarterXml(challenge.id);
  });
  const [blockWorkspaceKey, setBlockWorkspaceKey] = useState(0);
  const [showBlocksJava, setShowBlocksJava] = useState(false);
  const [blocksMigratedNotice, setBlocksMigratedNotice] = useState(
    () => !!openingDraft?.blockXml && isLegacyBlockXml(openingDraft.blockXml)
  );
  const [pendingEditorMode, setPendingEditorMode] = useState<EditorMode | null>(
    null
  );
  const codeRef = useRef(code);
  const editorModeRef = useRef(editorMode);
  const blockXmlRef = useRef(blockXml);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cloudSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoredChallengeRef = useRef<number | null>(null);
  const editorRef = useRef<
    Parameters<
      NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>
    >[0] | null
  >(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Sync Monaco theme whenever the app theme changes
  useEffect(() => {
    monacoRef.current?.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  const resetCode = useCallback(() => {
    if (editorMode === "blocks") {
      const starter = getBlockStarterXml(challenge.id);
      setBlockXml(starter);
      setBlockWorkspaceKey((k) => k + 1);
    } else {
      setCode(challenge.starterCode);
      editorRef.current?.setValue(challenge.starterCode);
      saveCodeDraft(challenge.id, challenge.starterCode, {
        editorMode: "java",
        blockXml,
      });
      void saveCode(challenge.starterCode);
    }
  }, [
    blockXml,
    challenge.id,
    challenge.starterCode,
    editorMode,
    saveCode,
  ]);

  const persistCode = useCallback(
    (
      next: string,
      options?: {
        flushCloud?: boolean;
        editorMode?: EditorMode;
        blockXml?: string;
      }
    ) => {
      saveCodeDraft(challenge.id, next, {
        editorMode: options?.editorMode ?? editorModeRef.current,
        blockXml: options?.blockXml ?? blockXmlRef.current,
      });
      clearTimeout(cloudSaveTimer.current);
      if (options?.flushCloud) {
        void saveCode(next);
        return;
      }
      cloudSaveTimer.current = setTimeout(() => {
        void saveCode(next);
      }, 2000);
    },
    [challenge.id, saveCode]
  );

  const handleBlocksCodeChange = useCallback(
    (java: string, xml: string) => {
      setCode(java);
      setBlockXml(xml);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        persistCode(java, { editorMode: "blocks", blockXml: xml });
      }, 400);
    },
    [persistCode]
  );

  const requestEditorMode = useCallback(
    (target: EditorMode) => {
      if (target === editorMode) return;
      if (target === "blocks" && blocksJavaOnly) return;
      setPendingEditorMode(target);
    },
    [editorMode, blocksJavaOnly]
  );

  const confirmEditorModeSwitch = useCallback(() => {
    const target = pendingEditorMode;
    if (!target) return;
    setPendingEditorMode(null);
    setEditorMode(target);
    if (target === "java") {
      editorRef.current?.setValue(codeRef.current);
      persistCode(codeRef.current, { editorMode: "java", blockXml: blockXmlRef.current });
    } else {
      const xml =
        blockXmlRef.current || getBlockStarterXml(challenge.id);
      setBlockXml(xml);
      setBlockWorkspaceKey((k) => k + 1);
      persistCode(codeRef.current, { editorMode: "blocks", blockXml: xml });
    }
  }, [challenge.id, pendingEditorMode, persistCode]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    editorModeRef.current = editorMode;
  }, [editorMode]);

  useEffect(() => {
    blockXmlRef.current = blockXml;
  }, [blockXml]);

  // Restore saved draft / cloud snapshot once when opening a challenge
  useEffect(() => {
    restoredChallengeRef.current = null;
  }, [challenge.id]);

  useEffect(() => {
    const session = getSession();
    const needsCloud = session?.role === "student";
    if (needsCloud && !dbHydrated) return;
    if (restoredChallengeRef.current === challenge.id) return;

    const restored = chooseSavedCode(
      challenge.id,
      challenge.starterCode,
      loadedCode,
      loadedCodeUpdatedAt
    );
    const draft = readCodeDraft(challenge.id);
    setCode(restored);
    editorRef.current?.setValue(restored);
    setEditorMode(
      resolveEditorModeForChallenge(challenge, draft, challenge.starterCode)
    );
    if (draft?.blockXml) setBlockXml(draft.blockXml);
    else setBlockXml(getBlockStarterXml(challenge.id));
    setBlockWorkspaceKey((k) => k + 1);
    restoredChallengeRef.current = challenge.id;
  }, [
    challenge.id,
    challenge.starterCode,
    dbHydrated,
    loadedCode,
    loadedCodeUpdatedAt,
  ]);

  // Flush the latest editor contents when leaving the page or unmounting
  useEffect(() => {
    const flush = () => {
      clearTimeout(saveTimer.current);
      clearTimeout(cloudSaveTimer.current);
      persistCode(codeRef.current, { flushCloud: true });
    };

    const onPageHide = () => flush();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flush();
    };
  }, [challenge.id, persistCode]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmitForReview = useCallback(async () => {
    if (!studentSession?.id || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const { data, error } = await supabase
      .from("challenge_submissions")
      .upsert(
        {
          student_id: studentSession.id,
          challenge_id: challenge.id,
          code_snapshot: code,
          status: "pending",
          grade: null,
          feedback: null,
          graded_at: null,
          graded_by: null,
        },
        { onConflict: "student_id,challenge_id" }
      )
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    if (data) setSubmission(data as SubmissionRow);
    setSubmitBanner(true);
    setTimeout(() => setSubmitBanner(false), 4000);
  }, [studentSession?.id, challenge.id, code, submitting]);

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

    const filename = `Challenge${challenge.id}_${challenge.title.replace(/\s+/g, "")}.java`;

    appendEntry({ type: "init", message: "FTC Hub Analyzer v3.0" });
    appendEntry({ type: "separator", message: "" });

    const clearModel = editorRef.current?.getModel();
    if (clearModel && monacoRef.current) {
      monacoRef.current.editor.setModelMarkers(clearModel, "ftc-grader", []);
    }

    await delay(180);
    appendEntry({ type: "running", message: `Compiling ${filename} with javac…` });

    // ── Real grader call ─────────────────────────────────────────────
    let result: GradedResult;
    try {
      result = await gradeCode(code, challenge.id, challenge.mentorRules);
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
      setIsRunning(false);
      return;
    }

    await delay(120);
    appendEntry({ type: "info", message: "Compilation complete — running rubric checks…" });

    const firstErrorLine = applyGraderMarkers(
      result,
      editorRef.current,
      monacoRef.current
    );
    if (firstErrorLine !== null && editorRef.current) {
      editorRef.current.revealLineInCenter(firstErrorLine);
      editorRef.current.setPosition({ lineNumber: firstErrorLine, column: 1 });
    }

    await delay(180);
    appendEntry({ type: "separator", message: "" });

    // ── Syntax issues ──────────────────────────────────────────────────
    if (result.syntaxIssues.length > 0) {
      appendEntry({ type: "info", message: "Syntax check:" });
      for (const issue of result.syntaxIssues) {
        await delay(120);
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
      await delay(110);
      appendEntry({
        type: r.pass ? "success" : "error",
        message: r.pass
          ? `${r.label} — ${r.description}`
          : withLinePrefix(`${r.label} — ${r.tip ?? r.description}`, r.matchedLines),
      });
    }

    await delay(200);
    appendEntry({ type: "separator", message: "" });

    // ── Required checks ────────────────────────────────────────────────
    appendEntry({
      type: "info",
      message: `Challenge ${challenge.id} — required checks:`,
    });
    for (const r of result.requiredResults) {
      await delay(130);
      appendEntry({
        type: r.pass ? "success" : "error",
        message: r.pass
          ? `${r.label} — ${r.description}`
          : withLinePrefix(`${r.label} — ${r.tip ?? r.description}`, r.matchedLines),
      });
    }

    // ── Improvement hints (only shown if required all passed) ──────────
    if (result.improvementResults.length > 0) {
      await delay(220);
      appendEntry({ type: "separator", message: "" });
      appendEntry({ type: "info", message: "Best-practice suggestions:" });
      for (const r of result.improvementResults) {
        await delay(130);
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
        await delay(200);
        appendEntry({ type: "separator", message: "" });
        appendEntry({ type: "info", message: "Code quality:" });
        for (const r of styleIssues) {
          await delay(100);
          appendEntry({
            type: "warning",
            message: `${r.label} — ${r.tip ?? r.description}`,
          });
        }
      }
    }

    // ── Verdict ────────────────────────────────────────────────────────
    await delay(300);
    appendEntry({ type: "separator", message: "" });

    const { grade, verdict } = result;

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
      await delay(160);
      appendEntry({
        type: "info",
        message: "Deploy to robot hardware via Android Studio to verify on-field.",
      });
    }

    // ── Auto-complete on "Good" ────────────────────────────────────────
    if (grade === "good") {
      if (homeworkMode && onHomeworkComplete) {
        await onHomeworkComplete(code);
      } else if (!homeworkMode) {
        await markComplete(challenge.id);
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

    // Build focused error / improvement lists for the left panel.
    // Mirror the grader's own tier split: universal required-tier → errors,
    // universal improvement/style-tier → suggestions (same as challenge checks).
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

    const improveFails = [
      ...universalSoftFails,
      ...result.improvementResults.filter((r) => !r.pass).map((r) => ({ label: r.label, tip: r.tip })),
      ...result.styleResults.filter((r) => !r.pass).map((r) => ({ label: r.label, tip: r.tip })),
    ];
    setFailedImprovements(improveFails);
    setLastGrade(grade);
    setIsRunning(false);
  }, [code, challenge, isRunning, appendEntry, markComplete, homeworkMode, onHomeworkComplete]);

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
        </div>

        <div className="flex items-center gap-0.5">
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
                <p className="break-words text-sm leading-relaxed text-slate-400">
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
                <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-4">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-slate-600">
                    Mark Complete
                  </p>
                  <MarkCompleteButton
                    challengeId={challenge.id}
                    xp={challenge.xp}
                    lastGrade={lastGrade}
                    forceCompleted={homeworkMode ? homeworkCompleted : undefined}
                    onComplete={
                      homeworkMode && onHomeworkComplete
                        ? () => onHomeworkComplete(code)
                        : undefined
                    }
                    completeLabel={homeworkMode ? "Mark Homework Complete" : "Mark as Complete"}
                  />
                </div>
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
          {editorMode === "blocks" && !blocksJavaOnly && (
            <div className="flex shrink-0 items-center gap-2 border-b border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5">
              <span className="text-[11px] font-medium text-indigo-300">
                FTC Blocks — drag blocks from the toolbox; Java is generated for grading.
              </span>
            </div>
          )}
          {/* Editor toolbar */}
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-slate-800/60 bg-slate-950/80 px-3">
            <EditorModeSwitch
              mode={editorMode}
              onModeChange={requestEditorMode}
              blocksDisabled={blocksJavaOnly}
            />
            {blocksJavaOnly && (
              <span
                className="shrink-0 text-[10px] text-slate-500"
                title="Road Runner, vision, and similar APIs require Java."
              >
                Java only
              </span>
            )}
            <span className="font-mono text-[11px] text-slate-600 truncate min-w-0">
              {editorMode === "java"
                ? `Challenge${challenge.id}_${challenge.title.replace(/\s+/g, "")}.java`
                : `Blocks · ${challenge.title}`}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              {editorMode === "blocks" && (
                <button
                  type="button"
                  onClick={() => setShowBlocksJava((v) => !v)}
                  className={`rounded px-2 py-1 text-[11px] transition-all ${
                    showBlocksJava
                      ? "bg-slate-700/80 text-slate-200"
                      : "text-slate-600 hover:text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  {showBlocksJava ? "Hide Java" : "Show Java"}
                </button>
              )}
              <button
                onClick={resetCode}
                title={
                  editorMode === "blocks"
                    ? "Reset to lesson starter"
                    : "Reset to starter code"
                }
                className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
              >
                <RefreshCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          <ModeSwitchDialog
            open={pendingEditorMode !== null}
            targetMode={pendingEditorMode ?? "java"}
            onConfirm={confirmEditorModeSwitch}
            onCancel={() => setPendingEditorMode(null)}
          />

          {blocksMigratedNotice && editorMode === "blocks" && (
            <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-1.5">
              <span className="text-[11px] text-amber-300">
                Blocks layout updated to match FTC Blocks — your previous block
                workspace was reset to the new starter.
              </span>
              <button
                type="button"
                onClick={() => setBlocksMigratedNotice(false)}
                className="ml-auto text-[11px] text-amber-400/80 hover:text-amber-200"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Code editor: Java (Monaco) or Blocks (Blockly) */}
          <div className="flex min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {editorMode === "blocks" ? (
              <>
                <div
                  className={
                    showBlocksJava
                      ? "min-h-0 flex-[3] overflow-hidden"
                      : "min-h-0 flex-1 overflow-hidden"
                  }
                >
                  <BlocklyWorkspacePanel
                    key={`${challenge.id}-${blockWorkspaceKey}`}
                    challenge={challenge}
                    initialXml={blockXml}
                    onCodeChange={handleBlocksCodeChange}
                    onMigrated={() => setBlocksMigratedNotice(true)}
                  />
                </div>
                {showBlocksJava && (
                  <div className="flex min-h-0 flex-[2] flex-col overflow-hidden border-t border-slate-800/80">
                    <div className="flex h-7 shrink-0 items-center border-b border-slate-800/60 bg-slate-950/90 px-3">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        Generated Java
                      </span>
                    </div>
                    <div className="min-h-0 flex-1">
                      <MonacoEditor
                        height="100%"
                        language="java"
                        theme={monacoTheme}
                        value={code}
                        options={{
                          readOnly: true,
                          fontSize: 12,
                          minimap: { enabled: false },
                          wordWrap: "on",
                          scrollBeyondLastLine: false,
                          lineNumbers: "on",
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
            <div className="min-h-0 flex-1 overflow-hidden">
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
                  persistCode(next, { editorMode: "java", blockXml: blockXmlRef.current });
                }, 400);
              }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                defineThemes(monaco);
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
            )}
            </div>
            {editorMode === "blocks" && blocksGuideSteps.length > 0 && (
              <BlocksGuideRail
                steps={blocksGuideSteps}
                completedStepIndex={
                  lastGrade === "good" ? blocksGuideSteps.length - 1 : -1
                }
              />
            )}
          </div>
          {editorMode === "blocks" && blocksGuideSteps.length > 0 && (
            <div className="shrink-0 border-t border-indigo-500/20 bg-indigo-950/30 px-3 py-2 md:hidden">
              <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-400/90 mb-1">
                Blocks guide
              </p>
              <p className="text-[11px] text-slate-300 leading-snug">
                {blocksGuideSteps[0]}
              </p>
            </div>
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
                    Graded by your mentor
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Console ─────────────────────────────────────────────────── */}
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

                {/* Submit for Review — mentor challenges, student sessions only */}
                {isMentorChallenge && studentSession && (
                  <button
                    onClick={handleSubmitForReview}
                    disabled={!code.trim() || submitting || submission?.status === "graded"}
                    title="Submit to your mentor for grading"
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                      submission?.status === "graded"
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 cursor-default"
                        : submitting
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-sm"
                    }`}
                  >
                    {submission?.status === "graded" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Submitted ✓
                      </>
                    ) : submitting ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        Submit for Review
                      </>
                    )}
                  </button>
                )}
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
        </div>
      </div>
    </div>
  );
}
