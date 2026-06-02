"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
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
import { generateAccessCode, isUniqueViolation } from "@/lib/accessCodes";

export default function CreateClassPage() {
  const router = useRouter();
  const [mentorName, setMentorName] = useState("");
  const [className, setClassName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [createdMentorCode, setCreatedMentorCode] = useState<string | null>(null);
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [copiedMentor, setCopiedMentor] = useState(false);
  const [copiedClass, setCopiedClass] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorName.trim()) { setError("Your name is required."); return; }
    if (!className.trim()) { setError("Class name is required."); return; }
    if (!teamName.trim()) { setError("Robotics team name is required."); return; }
    setError("");

    startTransition(async () => {
      let mentorCode = generateAccessCode();
      let classCodeValue = generateAccessCode();

      let data: Record<string, unknown> | null = null;
      let dbErr: { message?: string; code?: string } | null = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const result = await supabase
          .from("mentors")
          .insert({
            name: teamName.trim(),
            class_name: className.trim(),
            mentor_name: mentorName.trim(),
            code: mentorCode,
            class_code: classCodeValue,
          })
          .select("id, name, class_name, mentor_name, code, class_code")
          .single();

        data = result.data as Record<string, unknown> | null;
        dbErr = result.error;

        if (!dbErr && data) break;

        if (isUniqueViolation(dbErr)) {
          mentorCode = generateAccessCode();
          classCodeValue = generateAccessCode();
          continue;
        }
        break;
      }

      if (dbErr || !data) {
        setError(dbErr?.message ?? "Failed to create class. Please try again.");
        return;
      }

      const personalName = (data.mentor_name as string | null) ?? (data.name as string);
      const savedClassName = (data.class_name as string | null) ?? className.trim();
      setSession({
        role: "mentor",
        id: data.id as string,
        name: personalName,
        teamName: data.name as string,
        className: savedClassName,
      });
      setCreatedMentorCode(data.code as string);
      setCreatedClassCode((data.class_code as string | null) ?? classCodeValue);
      setCreatedName(savedClassName);
    });
  };

  const copyText = async (text: string, which: "mentor" | "class") => {
    await navigator.clipboard.writeText(text);
    if (which === "mentor") {
      setCopiedMentor(true);
      setTimeout(() => setCopiedMentor(false), 2000);
    } else {
      setCopiedClass(true);
      setTimeout(() => setCopiedClass(false), 2000);
    }
  };

  // ─── Success screen ────────────────────────────────────────────────────────
  if (createdMentorCode && createdClassCode) {
    return (
      <div className="flex min-h-screen bg-slate-950 px-4">
        <div className="m-auto w-full max-w-sm py-16">
          {/* Brand */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
              <Trophy className="h-4 w-4 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">FTC Programming Hub</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-400">Class created</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
              {createdName} is ready
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Save both codes below — mentor code for you, class code for students.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-5 mb-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600 mb-3">
              Class Code
            </p>
            <div className="flex items-center gap-3">
              <span className="flex-1 font-mono text-3xl font-bold tracking-[0.18em] text-slate-100 stat-number">
                {createdClassCode}
              </span>
              <button
                type="button"
                onClick={() => void copyText(createdClassCode, "class")}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/60 bg-slate-800/60 text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 transition-all"
                title="Copy class code"
              >
                {copiedClass ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Share this code with students so they can join your class.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-5 mb-6">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600 mb-3">
              Your Mentor Code
            </p>
            <div className="flex items-center gap-3">
              <span className="flex-1 font-mono text-3xl font-bold tracking-[0.18em] text-slate-100 stat-number">
                {createdMentorCode}
              </span>
              <button
                type="button"
                onClick={() => void copyText(createdMentorCode, "mentor")}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/60 bg-slate-800/60 text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 transition-all"
                title="Copy mentor code"
              >
                {copiedMentor ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Use this code to sign in as a mentor. Share with co-mentors only.
            </p>
          </div>

          <button
            onClick={() => router.push("/mentor/dashboard")}
            className="w-full flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
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
    <div className="flex min-h-screen bg-slate-950 px-4">
      {/* Back */}
      <button
        onClick={() => router.push("/onboarding")}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="m-auto w-full max-w-sm py-16">
        {/* Brand */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <Trophy className="h-4 w-4 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">FTC Programming Hub</p>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            Create a class
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            We&apos;ll generate mentor and class codes for your workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: "Your Name", value: mentorName, setter: setMentorName, placeholder: "e.g. Coach Smith" },
            { label: "Class Name", value: className, setter: setClassName, placeholder: "e.g. Period 3 Robotics" },
            { label: "Robotics Team Name", value: teamName, setter: setTeamName, placeholder: "e.g. Iron Wolves #12345" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
                {label}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                disabled={isPending}
                className="rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/30 disabled:opacity-50 transition-all"
              />
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/15 bg-red-500/8 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Create Class
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
