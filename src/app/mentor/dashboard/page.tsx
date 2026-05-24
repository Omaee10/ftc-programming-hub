"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Users,
  Shield,
  PlusCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Loader2,
  Code2,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react";
import { supabase, type MentorRow, type StudentRow, type ChallengeRow, type ProgressRow, type SubmissionRow } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { challenges as staticChallenges } from "@/data/challenges";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "progress" | "mentors" | "students" | "create" | "challenges" | "grade";

interface StudentProgress {
  student: StudentRow;
  records: ProgressRow[];
  totalChallenges: number;
}

type EnrichedSubmission = SubmissionRow & {
  studentName: string;
  challengeTitle: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskCode(code: string) {
  return `${code.slice(0, 2)}••••`;
}

/** Returns the ID that owns the class (parent ID for co-mentors, own ID otherwise) */
function classOwner(session: { id: string; parentMentorId?: string } | null): string {
  return session?.parentMentorId ?? session?.id ?? "";
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-150 border-b-2 -mb-px ${
        active
          ? "tab-active"
          : "border-transparent text-slate-600 hover:text-slate-400"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {badge != null && badge > 0 && (
        <span className="rounded-sm bg-amber-500 px-1 py-0.5 text-[8px] font-bold text-slate-900 leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Student Progress Tab ─────────────────────────────────────────────────────

function ProgressTab() {
  const [data, setData] = useState<StudentProgress[]>([]);
  const [dbChallenges, setDbChallenges] = useState<ChallengeRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const session = typeof window !== "undefined" ? getSession() : null;

  const allChallenges = [
    ...staticChallenges.map((c) => ({
      id: c.id,
      title: c.title,
    })),
    ...dbChallenges.map((c) => ({ id: c.id, title: c.title })),
  ];

  const load = useCallback(async () => {
    if (!session?.id) return;
    setLoading(true);
    const ownerId = classOwner(session);
    const [{ data: students }, { data: challenges }, { data: progress }] =
      await Promise.all([
        supabase.from("students").select("*").eq("mentor_id", ownerId).order("name"),
        supabase.from("challenges").select("id, title").order("id"),
        supabase.from("student_challenge_progress").select("*"),
      ]);

    setDbChallenges((challenges ?? []) as ChallengeRow[]);

    const allCh = [
      ...staticChallenges.map((c) => c.id),
      ...((challenges ?? []) as { id: number }[])
        .map((c) => c.id)
        .filter((id) => !staticChallenges.find((s) => s.id === id)),
    ];

    setData(
      ((students ?? []) as StudentRow[]).map((student) => ({
        student,
        records: ((progress ?? []) as ProgressRow[]).filter(
          (r) => r.student_id === student.id
        ),
        totalChallenges: allCh.length,
      }))
    );
    setLoading(false);
  }, [session?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-100" />
      </div>
    );

  if (data.length === 0)
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        No students yet. Add students in the &quot;Manage Students&quot; tab.
      </p>
    );

  return (
    <div className="space-y-3">
      {data.map(({ student, records, totalChallenges }) => {
        const completedCount = records.filter((r) => r.completed).length;
        const isOpen = expanded.has(student.id);

        return (
          <div
            key={student.id}
            className="rounded-lg border border-slate-800/60 bg-slate-900/40 overflow-hidden"
          >
            <button
              onClick={() => toggle(student.id)}
              className="flex w-full items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-bold text-slate-300">
                {student.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-200">
                  {student.name}
                </p>
                <p className="text-xs text-slate-500">
                  {completedCount} / {totalChallenges} challenges completed
                </p>
              </div>

              {/* Mini progress bar */}
              <div className="hidden sm:block w-32">
                <div className="h-1.5 w-full rounded-full bg-slate-800">
                  <div
                    className="h-1.5 rounded-full bg-zinc-300 transition-all"
                    style={{
                      width: `${totalChallenges === 0 ? 0 : (completedCount / totalChallenges) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-slate-800 px-5 py-4 space-y-2">
                {allChallenges.map((ch) => {
                  const rec = records.find((r) => r.challenge_id === ch.id);
                  const done = rec?.completed ?? false;
                  return (
                    <div
                      key={ch.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-800/60 bg-slate-900/60 px-3 py-2.5"
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-slate-600 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium ${done ? "text-emerald-300" : "text-slate-400"}`}
                        >
                          {ch.id}. {ch.title}
                        </p>
                        {rec?.code_snapshot && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-[10px] text-slate-600 hover:text-slate-400">
                              View saved code
                            </summary>
                            <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-400 font-mono">
                              {rec.code_snapshot}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Code Manager (shared between mentors + students tabs) ───────────────────

function CodeManager({
  table,
  label,
  accentClass,
}: {
  table: "mentors" | "students";
  label: string;
  accentClass: string;
}) {
  const [rows, setRows] = useState<(MentorRow | StudentRow)[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  const [showCodes, setShowCodes] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const session = typeof window !== "undefined" ? getSession() : null;

  const load = useCallback(async () => {
    if (!session?.id) return;
    setLoading(true);
    const ownerId = classOwner(session);
    if (table === "students") {
      const { data } = await supabase.from("students").select("*").eq("mentor_id", ownerId).order("name");
      setRows((data ?? []) as (MentorRow | StudentRow)[]);
    } else {
      // Show the class owner + all co-mentors created by the owner
      const { data } = await supabase
        .from("mentors")
        .select("id, name, mentor_name, code, created_at, created_by")
        .or(`id.eq.${ownerId},created_by.eq.${ownerId}`)
        .order("name");
      setRows((data ?? []) as (MentorRow | StudentRow)[]);
    }
    setLoading(false);
  }, [table, session?.id, session?.parentMentorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setError("Name is required."); return; }
    setError("");

    startTransition(async () => {
      const ownerId = classOwner(session);
      const tryInsert = async (code: string) => {
        const payload: Record<string, string> = { name: newName.trim(), code };
        if (table === "students" && ownerId) payload.mentor_id = ownerId;
        if (table === "mentors" && ownerId) payload.created_by = ownerId;
        return supabase.from(table).insert(payload);
      };

      let code = Math.floor(100000 + Math.random() * 900000).toString();

      let { error: dbErr } = await tryInsert(code);

      // Retry once on unique conflict
      if (dbErr?.message?.includes("unique") || dbErr?.code === "23505") {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        ({ error: dbErr } = await tryInsert(code));
      }

      if (dbErr) {
        setError(dbErr.message.includes("unique") ? "That code is already in use." : dbErr.message);
        return;
      }
      setNewName("");
      setNewCode("");
      load();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await supabase.from(table).delete().eq("id", id);
      load();
    });
  };

  const toggleShow = (id: string) =>
    setShowCodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      {/* Your Code card — mentors tab only */}
      {table === "mentors" && session && (() => {
        const myRow = rows.find((r) => r.id === session.id) as MentorRow | undefined;
        if (!myRow) return null;
        const myDisplayName = myRow.mentor_name ?? myRow.name;
        return (
          <div className="rounded-xl border border-white/20 bg-white/5 p-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">
                Your Mentor Code
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.2em] text-zinc-100">
                {myRow.code}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Share this code with co-mentors only
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-sm font-bold text-zinc-100">
              {myDisplayName[0]?.toUpperCase()}
            </div>
          </div>
        );
      })()}

      {/* List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Existing {label}s
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-100" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No {label.toLowerCase()}s yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {rows.map((row) => {
              const mentorRow = row as MentorRow;
              const displayName = mentorRow.mentor_name ?? mentorRow.name;
              const teamName = mentorRow.mentor_name ? mentorRow.name : null;
              return (
              <li
                key={row.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300">
                  {displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {teamName && <span className="mr-2">{teamName}</span>}
                    <span className="font-mono">{showCodes.has(row.id) ? row.code : maskCode(row.code)}</span>
                  </p>
                </div>
                <button
                  onClick={() => toggleShow(row.id)}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:text-slate-300 transition-colors"
                  title={showCodes.has(row.id) ? "Hide code" : "Show code"}
                >
                  {showCodes.has(row.id) ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  title={`Delete ${label.toLowerCase()}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="mb-4 text-sm font-semibold text-slate-300">
          Add New {label}
        </p>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`${label} name`}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${accentClass} disabled:opacity-50`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Add {label}
          </button>
        </form>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Manage Challenges Tab ────────────────────────────────────────────────────

function ManageChallengesTab() {
  const [rows, setRows] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const session = typeof window !== "undefined" ? getSession() : null;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("challenges")
      .select("id, title, difficulty, xp, created_by")
      .order("id");
    setRows((data ?? []) as ChallengeRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await supabase.from("challenges").delete().eq("id", id);
      load();
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
    </div>
  );

  if (rows.length === 0) return (
    <p className="py-12 text-center text-sm text-slate-500">
      No custom challenges yet. Create one in the &quot;Create Challenge&quot; tab.
    </p>
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Custom Challenges ({rows.length})
        </span>
      </div>
      <ul className="divide-y divide-slate-800/60">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/30 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold text-slate-400">
              {row.id}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{row.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500">{row.difficulty}</span>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-500">{row.xp} XP</span>
                {row.created_by === session?.id && (
                  <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300 uppercase tracking-wide">
                    Yours
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(row.id)}
              disabled={isPending}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Delete challenge"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Create Challenge Tab ─────────────────────────────────────────────────────

function CreateChallengeTab() {
  const [title, setTitle] = useState("");
  const [gist, setGist] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [xp, setXp] = useState("100");
  const [instructions, setInstructions] = useState("");
  const [hints, setHints] = useState<string[]>([""]);
  const [starterCode, setStarterCode] = useState("");
  const [tags, setTags] = useState("");
  const [objectives, setObjectives] = useState<string[]>([""]);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genError, setGenError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const session = typeof window !== "undefined" ? getSession() : null;

  const handleGenerate = async () => {
    if (!gist.trim()) { setGenError("Please enter a description first."); return; }
    setGenError("");
    setGenerating(true);

    try {
      const res = await fetch("/api/generate-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gist, title }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();

      if (json.title) setTitle(json.title);
      if (json.instructions) setInstructions(json.instructions);
      if (json.hints?.length) setHints(json.hints);
      if (json.starterCode) setStarterCode(json.starterCode);
      if (json.tags?.length) setTags(json.tags.join(", "));
      if (json.objectives?.length) setObjectives(json.objectives);
      if (json.difficulty) setDifficulty(json.difficulty);
      if (json.xp) setXp(String(json.xp));
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instructions.trim()) return;
    setSaving(true);
    setSaveSuccess(false);

    const { error } = await supabase.from("challenges").insert({
      title: title.trim(),
      difficulty,
      description: gist.trim() || instructions.slice(0, 140),
      xp: Number(xp) || 100,
      estimated_time: "30 min",
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      objectives: objectives.filter(Boolean),
      instructions: instructions.trim(),
      starter_code: starterCode,
      hints: hints.filter(Boolean),
      concepts_covered: [],
      created_by: session?.id ?? null,
    });

    setSaving(false);
    if (!error) {
      setSaveSuccess(true);
      setTitle("");
      setGist("");
      setInstructions("");
      setHints([""]);
      setStarterCode("");
      setTags("");
      setObjectives([""]);
    }
  };

  const updateHint = (i: number, val: string) =>
    setHints((prev) => prev.map((h, idx) => (idx === i ? val : h)));
  const addHint = () => setHints((prev) => [...prev, ""]);
  const removeHint = (i: number) =>
    setHints((prev) => prev.filter((_, idx) => idx !== i));

  const updateObj = (i: number, val: string) =>
    setObjectives((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  const addObj = () => setObjectives((prev) => [...prev, ""]);
  const removeObj = (i: number) =>
    setObjectives((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Servo Control Basics"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30"
        />
      </div>

      {/* Gist + AI generate */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Gist / Description (for AI)
        </label>
        <textarea
          value={gist}
          onChange={(e) => setGist(e.target.value)}
          rows={3}
          placeholder="Briefly describe what this challenge should teach..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 resize-none"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="mt-2 flex items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/15 transition-all disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generating ? "Generating…" : "Generate with AI"}
        </button>
        {genError && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="text-xs text-red-400">{genError}</span>
          </div>
        )}
      </div>

      {/* Difficulty + XP */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-zinc-400 focus:outline-none"
          >
            {["Beginner", "Intermediate", "Advanced"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            XP
          </label>
          <input
            type="number"
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            min={0}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30"
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Motors, Servos, TeleOp"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30"
        />
      </div>

      {/* Objectives */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Objectives
        </label>
        <div className="space-y-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={obj}
                onChange={(e) => updateObj(i, e.target.value)}
                placeholder={`Objective ${i + 1}`}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30"
              />
              {objectives.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeObj(i)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addObj}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-zinc-100 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add objective
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Full Problem Statement
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          placeholder="Detailed challenge instructions shown to students..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 resize-y font-mono"
        />
      </div>

      {/* Hints */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Hints
        </label>
        <div className="space-y-2">
          {hints.map((hint, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={hint}
                onChange={(e) => updateHint(i, e.target.value)}
                placeholder={`Hint ${i + 1}`}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30"
              />
              {hints.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeHint(i)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addHint}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-zinc-100 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add hint
          </button>
        </div>
      </div>

      {/* Starter code */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Starter Code (Java)
        </label>
        <textarea
          value={starterCode}
          onChange={(e) => setStarterCode(e.target.value)}
          rows={12}
          placeholder="// Starter code shown in the editor..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 resize-y font-mono text-xs leading-relaxed"
        />
      </div>

      {/* Save button */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-300">
            Challenge saved! Students can see it now.
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !title.trim() || !instructions.trim()}
        className="flex items-center gap-2 rounded-xl btn-primary px-6 py-3 text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Code2 className="h-4 w-4" />
        )}
        {saving ? "Saving…" : "Save Challenge"}
      </button>
    </form>
  );
}

// ─── Grade Submissions Tab ────────────────────────────────────────────────────

function GradeSubmissionsTab({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [gradeInputs, setGradeInputs] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const session = typeof window !== "undefined" ? getSession() : null;

  const load = useCallback(async () => {
    if (!session?.id) return;
    setLoading(true);

    const ownerId = classOwner(session);
    const { data: students } = await supabase
      .from("students")
      .select("id, name")
      .eq("mentor_id", ownerId);

    if (!students || students.length === 0) {
      setSubmissions([]);
      onCountChange?.(0);
      setLoading(false);
      return;
    }

    const studentIds = (students as { id: string }[]).map((s) => s.id);

    const [{ data: subs }, { data: dbChallenges }] = await Promise.all([
      supabase
        .from("challenge_submissions")
        .select("*")
        .in("student_id", studentIds)
        .order("submitted_at", { ascending: false }),
      supabase.from("challenges").select("id, title"),
    ]);

    const allChallengeTitles = [
      ...staticChallenges.map((c) => ({ id: c.id, title: c.title })),
      ...((dbChallenges ?? []) as { id: number; title: string }[]).map((c) => ({
        id: c.id,
        title: c.title,
      })),
    ];

    const enriched: EnrichedSubmission[] = ((subs ?? []) as SubmissionRow[]).map((sub) => ({
      ...sub,
      studentName:
        (students as { id: string; name: string }[]).find((s) => s.id === sub.student_id)?.name ??
        "Unknown",
      challengeTitle:
        allChallengeTitles.find((c) => c.id === sub.challenge_id)?.title ??
        `Challenge ${sub.challenge_id}`,
    }));

    setSubmissions(enriched);

    const pendingCount = enriched.filter((s) => s.status === "pending").length;
    onCountChange?.(pendingCount);

    setGradeInputs((prev) => {
      const next = { ...prev };
      enriched
        .filter((s) => s.status === "pending")
        .forEach((s) => {
          if (!(s.id in next)) {
            next[s.id] = { grade: "pass", feedback: "" };
          }
        });
      return next;
    });

    setLoading(false);
  }, [session?.id, session?.parentMentorId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function timeAgo(ts: string): string {
    const diffMs = Date.now() - new Date(ts).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  }

  function gradeBadge(grade: SubmissionRow["grade"]) {
    if (!grade) return null;
    const cfg = {
      pass: { label: "Pass", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
      "needs-work": { label: "Needs Work", cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
      redo: { label: "Redo", cls: "bg-red-500/10 text-red-300 border-red-500/20" },
    } as const;
    const c = cfg[grade];
    return (
      <span
        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${c.cls}`}
      >
        {c.label}
      </span>
    );
  }

  const handleGrade = async (sub: EnrichedSubmission) => {
    const input = gradeInputs[sub.id];
    if (!input?.grade || !session?.id) return;
    setSaving((prev) => ({ ...prev, [sub.id]: true }));
    await supabase
      .from("challenge_submissions")
      .update({
        status: "graded",
        grade: input.grade,
        feedback: input.feedback || null,
        graded_at: new Date().toISOString(),
        graded_by: session.id,
      })
      .eq("id", sub.id);
    setSaving((prev) => ({ ...prev, [sub.id]: false }));
    load();
  };

  const pending = submissions.filter((s) => s.status === "pending");
  const graded = submissions.filter((s) => s.status === "graded");

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
      </div>
    );

  if (submissions.length === 0)
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        No submissions yet. Students will appear here once they submit mentor-created challenges.
      </p>
    );

  return (
    <div className="space-y-8">
      {/* ── Pending Reviews ──────────────────────────────────────────── */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Pending Reviews
          {pending.length > 0 && (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              {pending.length}
            </span>
          )}
        </h3>

        {pending.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">All caught up — no pending reviews.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((sub) => {
              const isExpanded = expandedIds.has(sub.id);
              const input = gradeInputs[sub.id] ?? { grade: "pass", feedback: "" };
              const isSaving = saving[sub.id] ?? false;
              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(sub.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-bold text-slate-300">
                      {sub.studentName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-slate-200">
                        {sub.studentName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {sub.challengeTitle} · {timeAgo(sub.submitted_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                      Pending
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-800 px-5 py-4 space-y-4">
                      <pre className="max-h-64 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
                        {sub.code_snapshot}
                      </pre>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="sm:w-44">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Grade
                          </label>
                          <select
                            value={input.grade}
                            onChange={(e) =>
                              setGradeInputs((prev) => ({
                                ...prev,
                                [sub.id]: { ...input, grade: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                          >
                            <option value="pass">Pass</option>
                            <option value="needs-work">Needs Work</option>
                            <option value="redo">Redo</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-slate-500">
                            Feedback
                          </label>
                          <textarea
                            value={input.feedback}
                            onChange={(e) =>
                              setGradeInputs((prev) => ({
                                ...prev,
                                [sub.id]: { ...input, feedback: e.target.value },
                              }))
                            }
                            rows={3}
                            placeholder="Write feedback for the student…"
                            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleGrade(sub)}
                        disabled={isSaving}
                        className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-all hover:bg-amber-400 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {isSaving ? "Saving…" : "Submit Grade"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Previously Graded ────────────────────────────────────────── */}
      {graded.length > 0 && (
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Previously Graded
          </h3>
          <div className="space-y-3">
            {graded.map((sub) => {
              const isExpanded = expandedIds.has(sub.id);
              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(sub.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-bold text-slate-300">
                      {sub.studentName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-slate-200">
                        {sub.studentName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{sub.challengeTitle}</p>
                    </div>
                    {gradeBadge(sub.grade)}
                    <span className="shrink-0 text-xs text-slate-600">
                      {sub.graded_at ? timeAgo(sub.graded_at) : ""}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-800 px-5 py-4 space-y-4">
                      <pre className="max-h-64 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
                        {sub.code_snapshot}
                      </pre>
                      {sub.feedback && (
                        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                          <p className="mb-1 text-xs font-medium text-slate-500">Feedback</p>
                          <p className="text-sm leading-relaxed text-slate-300">
                            {sub.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MentorDashboardPage() {
  const [tab, setTab] = useState<Tab>("progress");
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending submission count on mount for the tab badge
  useEffect(() => {
    const session = typeof window !== "undefined" ? getSession() : null;
    if (!session?.id) return;
    (async () => {
      const ownerId = classOwner(session);
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("mentor_id", ownerId);
      if (!students || students.length === 0) return;
      const studentIds = (students as { id: string }[]).map((s) => s.id);
      const { count } = await supabase
        .from("challenge_submissions")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    })();
  }, []);

  return (
    <div className="min-h-full px-6 py-10 max-w-5xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">Mentor Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Team Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor progress, manage access codes, and create new challenges.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-1 border-b border-slate-800/60 pb-0">
        <TabButton
          active={tab === "progress"}
          onClick={() => setTab("progress")}
          icon={BarChart3}
          label="Student Progress"
        />
        <TabButton
          active={tab === "mentors"}
          onClick={() => setTab("mentors")}
          icon={Shield}
          label="Manage Mentors"
        />
        <TabButton
          active={tab === "students"}
          onClick={() => setTab("students")}
          icon={Users}
          label="Manage Students"
        />
        <TabButton
          active={tab === "challenges"}
          onClick={() => setTab("challenges")}
          icon={Code2}
          label="Custom Challenges"
        />
        <TabButton
          active={tab === "create"}
          onClick={() => setTab("create")}
          icon={PlusCircle}
          label="Create Challenge"
        />
        <TabButton
          active={tab === "grade"}
          onClick={() => setTab("grade")}
          icon={ClipboardCheck}
          label="Grade Submissions"
          badge={pendingCount}
        />
      </div>

      {/* Tab content */}
      {tab === "progress" && <ProgressTab />}
      {tab === "mentors" && (
        <CodeManager
          table="mentors"
          label="Mentor"
          accentClass="bg-zinc-200 text-slate-950 hover:bg-white"
        />
      )}
      {tab === "students" && (
        <CodeManager
          table="students"
          label="Student"
          accentClass="btn-primary"
        />
      )}
      {tab === "challenges" && <ManageChallengesTab />}
      {tab === "create" && <CreateChallengeTab />}
      {tab === "grade" && (
        <GradeSubmissionsTab onCountChange={setPendingCount} />
      )}
    </div>
  );
}
