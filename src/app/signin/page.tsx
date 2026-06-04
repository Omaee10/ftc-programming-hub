"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, User, Shield, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/auth";
import CodeInput from "@/components/CodeInput";
import { Alert } from "@/components/ui";

// ─── Login panel ──────────────────────────────────────────────────────────────

function LoginPanel({
  role,
  icon: Icon,
  title,
  subtitle,
  buttonClass,
  onSuccess,
}: {
  role: "mentor" | "student";
  icon: React.ElementType;
  title: string;
  subtitle: string;
  buttonClass: string;
  onSuccess: (id: string, name: string, teamName: string, extra?: { parentMentorId?: string; mentorId?: string; className?: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");

    startTransition(async () => {
      if (role === "mentor") {
        const { data, error: dbErr } = await supabase
          .from("mentors")
          .select("id, name, mentor_name, class_name, created_by")
          .eq("code", trimmed)
          .single();
        if (dbErr || !data) {
          setError(`That code didn't work. Please double-check and try again.`);
          return;
        }
        const row = data as {
          id: string;
          name: string;
          mentor_name?: string | null;
          class_name?: string | null;
          created_by?: string | null;
        };
        const parentId = row.created_by ?? undefined;
        let personalName = row.mentor_name ?? row.name;
        let teamName = row.name;
        let className: string | undefined = row.class_name?.trim() || undefined;
        if (parentId) {
          const { data: parentData } = await supabase
            .from("mentors")
            .select("name, class_name")
            .eq("id", parentId)
            .single();
          if (parentData) {
            const parent = parentData as { name: string; class_name?: string | null };
            teamName = parent.name;
            className = parent.class_name?.trim() || undefined;
          }
        }
        onSuccess(row.id, personalName, teamName, {
          parentMentorId: parentId,
          ...(className ? { className } : {}),
        });
      } else {
        const { data, error: dbErr } = await supabase
          .from("students")
          .select("id, name, mentor_id, mentors(name)")
          .eq("code", trimmed)
          .single();
        if (dbErr || !data) {
          setError(`That code didn't work. Please double-check and try again.`);
          return;
        }
        const mentorName = (data.mentors as unknown as { name: string } | null)?.name ?? "";
        const mentorId = (data as { mentor_id?: string | null }).mentor_id ?? undefined;
        onSuccess(data.id as string, data.name as string, mentorName, { mentorId });
      }
    });
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30">
          <Icon className="h-4.5 w-4.5 text-rose-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            6-Digit Code
          </label>
          <CodeInput value={code} onChange={setCode} disabled={isPending} />
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
          />
        )}

        <button
          type="submit"
          disabled={isPending || code.trim().length !== 6}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${buttonClass} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Sign In
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignInPage() {
  const router = useRouter();

  const handleSuccess = (role: "mentor" | "student") => (
    id: string,
    name: string,
    teamName: string,
    extra?: { parentMentorId?: string; mentorId?: string; className?: string }
  ) => {
    setSession({
      role,
      id,
      name,
      teamName,
      ...(extra?.className ? { className: extra.className } : {}),
      ...(extra?.parentMentorId ? { parentMentorId: extra.parentMentorId } : {}),
      ...(extra?.mentorId ? { mentorId: extra.mentorId } : {}),
    });
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="m-auto w-full max-w-3xl py-16">
        {/* Brand */}
        <div className="mb-12 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30">
            <Sparkles className="h-4 w-4 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100 tracking-tight">
              FTC Programming Hub
            </p>
            <p className="text-xs text-slate-400">Welcome back! Sign in with your code</p>
          </div>
        </div>

        {/* Panels — stack on mobile, side by side on desktop */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Student */}
          <div className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 hover:bg-slate-800/50 transition-colors">
            <LoginPanel
              role="student"
              icon={User}
              title="Student"
              subtitle="Sign in with your code"
              buttonClass="btn-primary"
              onSuccess={handleSuccess("student")}
            />
          </div>

          {/* Desktop divider */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-0 shrink-0">
            <div className="flex-1 w-px bg-slate-800/60" />
            <span className="py-3 text-[11px] text-slate-500 shrink-0">or</span>
            <div className="flex-1 w-px bg-slate-800/60" />
          </div>

          {/* Mobile divider */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex-1 h-px bg-slate-800/60" />
            <span className="text-[11px] text-slate-500">or</span>
            <div className="flex-1 h-px bg-slate-800/60" />
          </div>

          {/* Mentor */}
          <div className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 hover:bg-slate-800/50 transition-colors">
            <LoginPanel
              role="mentor"
              icon={Shield}
              title="Mentor"
              subtitle="Sign in with your code"
              buttonClass="bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60"
              onSuccess={handleSuccess("mentor")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
