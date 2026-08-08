"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Loader2,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { challengeCreatedBy, fetchClassChallengeById } from "@/lib/classChallenges";

type MentorChallengeEditorProps = {
  mode: "create" | "edit";
  challengeId?: number;
  onSaved?: () => void;
  onCancel?: () => void;
};

export default function MentorChallengeEditor({
  mode,
  challengeId,
  onSaved,
  onCancel,
}: MentorChallengeEditorProps) {
  const [title, setTitle] = useState("");
  const [gist, setGist] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [xp, setXp] = useState("100");
  const [instructions, setInstructions] = useState("");
  const [hints, setHints] = useState<string[]>([""]);
  const [starterCode, setStarterCode] = useState("");
  const [tags, setTags] = useState("");
  const [objectives, setObjectives] = useState<string[]>([""]);

  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Auto-dismiss the "saved" banner so it doesn't linger over a freshly-cleared
  // (create mode) or subsequently-edited form, implying unsaved work is saved.
  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => setSaveSuccess(false), 4000);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  useEffect(() => {
    if (mode !== "edit" || !challengeId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError("");

      const session = getSession();
      if (!session) {
        setLoadError("No workspace selected.");
        setLoading(false);
        return;
      }

      const challenge = await fetchClassChallengeById(session, challengeId);

      if (cancelled) return;

      if (!challenge) {
        setLoadError("Challenge not found.");
        setLoading(false);
        return;
      }

      setTitle(challenge.title);
      setGist(challenge.description);
      setDifficulty(challenge.difficulty);
      setXp(String(challenge.xp));
      setInstructions(challenge.instructions);
      setHints(challenge.hints.length > 0 ? challenge.hints : [""]);
      setStarterCode(challenge.starterCode);
      setTags(challenge.tags.join(", "));
      setObjectives(
        challenge.objectives.length > 0 ? challenge.objectives : [""]
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, challengeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instructions.trim()) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError("");

    const authorId = challengeCreatedBy(getSession());
    if (!authorId) {
      setSaving(false);
      setSaveError("Session expired. Sign in again.");
      return;
    }

    const payload = {
      title: title.trim(),
      difficulty,
      description: gist.trim() || instructions.slice(0, 140),
      xp: Number(xp) || 100,
      estimated_time: "30 min",
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      objectives: objectives.filter(Boolean),
      instructions: instructions.trim(),
      starter_code: starterCode,
      hints: hints.filter(Boolean),
      concepts_covered: [],
    };

    // The edit does not filter on created_by. RLS is the gate
    // (challenges_update_mentor / rls_class_challenge_writer_ids): any mentor in
    // the class may edit any challenge in it. INSERT is scoped separately and
    // more tightly, to the caller's own mentor rows, so `created_by: authorId`
    // below is both the attribution and the only value the policy will accept.
    //
    // Both branches still `.select("id")` — an UPDATE matching zero rows is not
    // a Postgres error, so without it a write RLS refused reported success.
    const result =
      mode === "edit" && challengeId
        ? await supabase
            .from("challenges")
            .update(payload)
            .eq("id", challengeId)
            .select("id")
        : await supabase
            .from("challenges")
            .insert({
              ...payload,
              created_by: authorId,
            })
            .select("id");

    setSaving(false);

    if (result.error) {
      setSaveError(result.error.message);
      return;
    }

    if (!result.data?.length) {
      setSaveError(
        mode === "edit"
          ? "Nothing was saved. This challenge may have been deleted, or you may no longer be a mentor of this class."
          : "Nothing was saved. Reload the page and try again."
      );
      return;
    }

    setSaveSuccess(true);

    if (mode === "create") {
      setTitle("");
      setGist("");
      setInstructions("");
      setHints([""]);
      setStarterCode("");
      setTags("");
      setObjectives([""]);
    }

    onSaved?.();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-red-300">{loadError}</p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {mode === "edit" && onCancel && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Edit Challenge #{challengeId}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Gist / Description
        </label>
        <textarea
          value={gist}
          onChange={(e) => setGist(e.target.value)}
          rows={3}
          placeholder="Briefly describe what this challenge should teach..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 resize-none"
        />
      </div>

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

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-300">
            {mode === "edit"
              ? "Challenge updated successfully."
              : (
                <>
                  Challenge saved! It appears under <strong>Class Challenges</strong> on the{" "}
                  <a href="/challenges" className="underline hover:text-emerald-200">
                    Coding Challenges
                  </a>{" "}
                  page and in the Manage Challenges tab.
                </>
              )}
          </span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-300">{saveError}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
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
          {saving
            ? "Saving…"
            : mode === "edit"
              ? "Save Changes"
              : "Save Challenge"}
        </button>
        {mode === "edit" && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
