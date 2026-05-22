"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  PlusCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/auth";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function CreateClassPage() {
  const router = useRouter();
  const [mentorName, setMentorName] = useState("");
  const [className, setClassName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorName.trim()) { setError("Your name is required."); return; }
    if (!className.trim()) { setError("Class name is required."); return; }
    if (!teamName.trim()) { setError("Robotics team name is required."); return; }
    setError("");

    startTransition(async () => {
      let code = generateCode();

      const tryInsert = async (c: string) => {
        const { data, error: dbErr } = await supabase
          .from("mentors")
          .insert({ name: teamName.trim(), mentor_name: mentorName.trim(), code: c })
          .select("id, name, mentor_name, code")
          .single();
        return { data, dbErr };
      };

      let { data, dbErr } = await tryInsert(code);

      if (dbErr?.message?.includes("unique") || dbErr?.code === "23505") {
        code = generateCode();
        ({ data, dbErr } = await tryInsert(code));
      }

      if (dbErr || !data) {
        setError(dbErr?.message ?? "Failed to create class. Please try again.");
        return;
      }

      const personalName = (data as { mentor_name?: string | null }).mentor_name ?? (data.name as string);
      setSession({ role: "mentor", id: data.id as string, name: personalName, teamName: data.name as string });
      setCreatedCode(data.code as string);
      setCreatedName(teamName.trim());
    });
  };

  const handleCopy = async () => {
    if (!createdCode) return;
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Success screen ────────────────────────────────────────────────────────
  if (createdCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-4 py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
            <Trophy className="h-5 w-5 text-zinc-100" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Class Created!
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {createdName} is ready to go
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-slate-300 font-medium">
              Your mentor account has been created
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Your Mentor Code
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3">
              <span className="flex-1 font-mono text-3xl font-bold tracking-[0.2em] text-zinc-100">
                {createdCode}
              </span>
              <button
                onClick={handleCopy}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Save this code — you&apos;ll use it to sign in as mentor
            </p>
          </div>

          <button
            onClick={() => router.push("/mentor/dashboard")}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white transition-all shadow-sm shadow-white/10"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Form screen ───────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-4 py-12">
      {/* Back button */}
      <button
        onClick={() => router.push("/onboarding")}
        className="absolute top-5 left-5 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Logo */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
          <Trophy className="h-5 w-5 text-zinc-100" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Create a New Class
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            We&apos;ll generate a unique 6-digit mentor access code for you
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Your Name
            </label>
            <input
              type="text"
              value={mentorName}
              onChange={(e) => setMentorName(e.target.value)}
              placeholder="e.g. Coach Smith"
              disabled={isPending}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 disabled:opacity-50 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Class Name
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Period 3 Robotics"
              disabled={isPending}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 disabled:opacity-50 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Robotics Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Iron Wolves #12345"
              disabled={isPending}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/30 disabled:opacity-50 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white transition-all shadow-sm shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                Create Class &amp; Get My Code
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
