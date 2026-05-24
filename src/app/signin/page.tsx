"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Lock, User, Shield, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/auth";

// ─── Code input — auto-advances focus across 6 boxes ─────────────────────────

function CodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const focus = (idx: number) => refs.current[idx]?.focus();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[idx].trim()) {
        const next = digits.map((d, i) => (i === idx ? " " : d)).join("").trimEnd();
        onChange(next);
      } else if (idx > 0) {
        const next = digits.map((d, i) => (i === idx - 1 ? " " : d)).join("").trimEnd();
        onChange(next);
        focus(idx - 1);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      focus(idx - 1);
    } else if (e.key === "ArrowRight" && idx < 5) {
      focus(idx + 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const next = digits.map((d, i) => (i === idx ? char : d)).join("").trimEnd();
    onChange(next);
    if (idx < 5) focus(idx + 1);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      focus(Math.min(pasted.length, 5));
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onChange={(e) => handleChange(e, i)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className="w-12 h-14 rounded-lg border border-slate-700/60 bg-slate-800/60 text-center text-xl font-bold text-slate-100 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/40 transition-all disabled:opacity-50 caret-transparent"
        />
      ))}
    </div>
  );
}

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
          setError(`Invalid code. (${dbErr?.message ?? "no data returned"})`);
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
          setError(`Invalid code. (${dbErr?.message ?? "no data returned"})`);
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
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
          <Icon className="h-4.5 w-4.5 text-slate-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-200">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
            Access Code
          </label>
          <CodeInput value={code} onChange={setCode} disabled={isPending} />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/15 bg-red-500/8 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
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
    <div className="flex min-h-screen bg-slate-950 px-4">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="m-auto w-full max-w-3xl py-16">
        {/* Brand */}
        <div className="mb-12 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <Trophy className="h-4 w-4 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200 tracking-tight">
              FTC Programming Hub
            </p>
            <p className="text-xs text-slate-600">Sign in with your access code</p>
          </div>
        </div>

        {/* Panels — stack on mobile, side by side on desktop */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Student */}
          <div className="flex-1 rounded-xl border border-slate-800/60 bg-slate-900/50 p-8">
            <LoginPanel
              role="student"
              icon={User}
              title="Student"
              subtitle="Enter your 6-digit student code"
              buttonClass="btn-primary"
              onSuccess={handleSuccess("student")}
            />
          </div>

          {/* Desktop divider */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-0 shrink-0">
            <div className="flex-1 w-px bg-slate-800/60" />
            <span className="py-3 text-[11px] text-slate-700 shrink-0">or</span>
            <div className="flex-1 w-px bg-slate-800/60" />
          </div>

          {/* Mobile divider */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex-1 h-px bg-slate-800/60" />
            <span className="text-[11px] text-slate-700">or</span>
            <div className="flex-1 h-px bg-slate-800/60" />
          </div>

          {/* Mentor */}
          <div className="flex-1 rounded-xl border border-slate-800/60 bg-slate-900/50 p-8">
            <LoginPanel
              role="mentor"
              icon={Shield}
              title="Mentor"
              subtitle="Enter your 6-digit mentor code"
              buttonClass="bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60"
              onSuccess={handleSuccess("mentor")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
