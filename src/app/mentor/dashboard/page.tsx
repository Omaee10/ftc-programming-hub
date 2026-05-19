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
  Loader2,
  Code2,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react";
import { supabase, type MentorRow, type StudentRow, type ChallengeRow, type ProgressRow } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { challenges as staticChallenges } from "@/data/challenges";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "progress" | "mentors" | "students" | "create";

interface StudentProgress {
  student: StudentRow;
  records: ProgressRow[];
  totalChallenges: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskCode(code: string) {
  return `${code.slice(0, 2)}••••`;
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─── Student Progress Tab ─────────────────────────────────────────────────────

function ProgressTab() {
  const [data, setData] = useState<StudentProgress[]>([]);
  const [dbChallenges, setDbChallenges] = useState<ChallengeRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const allChallenges = [
    ...staticChallenges.map((c) => ({
      id: c.id,
      title: c.title,
    })),
    ...dbChallenges.map((c) => ({ id: c.id, title: c.title })),
  ];

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: students }, { data: challenges }, { data: progress }] =
      await Promise.all([
        supabase.from("students").select("*").order("name"),
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
  }, []);

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
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
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
            className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden"
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
                    className="h-1.5 rounded-full bg-amber-500 transition-all"
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
    setLoading(true);
    const { data } = await supabase.from(table).select("*").order("name");
    setRows((data ?? []) as (MentorRow | StudentRow)[]);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setError("Name is required."); return; }
    if (!/^\d{6}$/.test(newCode)) { setError("Code must be exactly 6 digits."); return; }
    setError("");

    startTransition(async () => {
      const { error: dbErr } = await supabase.from(table).insert({
        name: newName.trim(),
        code: newCode,
      });
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
        const myRow = rows.find((r) => r.id === session.id);
        if (!myRow) return null;
        return (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-1">
                Your Mentor Code
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.2em] text-amber-400">
                {myRow.code}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Share this code with co-mentors only
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-sm font-bold text-amber-400">
              {myRow.name[0]?.toUpperCase()}
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
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No {label.toLowerCase()}s yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300">
                  {row.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {row.name}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {showCodes.has(row.id) ? row.code : maskCode(row.code)}
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
            ))}
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
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
          <div className="w-full sm:w-36">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              6-digit Code
            </label>
            <input
              type="text"
              value={newCode}
              onChange={(e) =>
                setNewCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              maxLength={6}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="mt-2 flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-50"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors"
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
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-y font-mono"
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
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors"
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
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-y font-mono text-xs leading-relaxed"
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
        className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-400 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MentorDashboardPage() {
  const [tab, setTab] = useState<Tab>("progress");

  return (
    <div className="min-h-full px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1">
          <Shield className="h-3 w-3 text-violet-400" />
          <span className="text-xs font-medium uppercase tracking-widest text-violet-400">
            Mentor Dashboard
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          Team Management
        </h1>
        <p className="mt-1 text-slate-400">
          Monitor progress, manage access codes, and create new challenges.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
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
          active={tab === "create"}
          onClick={() => setTab("create")}
          icon={PlusCircle}
          label="Create Challenge"
        />
      </div>

      {/* Tab content */}
      {tab === "progress" && <ProgressTab />}
      {tab === "mentors" && (
        <CodeManager
          table="mentors"
          label="Mentor"
          accentClass="bg-violet-600 text-white hover:bg-violet-500"
        />
      )}
      {tab === "students" && (
        <CodeManager
          table="students"
          label="Student"
          accentClass="bg-amber-500 text-slate-900 hover:bg-amber-400"
        />
      )}
      {tab === "create" && <CreateChallengeTab />}
    </div>
  );
}
