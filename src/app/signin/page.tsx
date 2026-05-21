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
        // Clear current box
        const next = digits.map((d, i) => (i === idx ? " " : d)).join("").trimEnd();
        onChange(next);
      } else if (idx > 0) {
        // Current box already empty — clear previous and move back
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
          className="w-11 h-12 rounded-lg border border-slate-700 bg-slate-800 text-center text-lg font-bold text-slate-100 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/40 transition-all disabled:opacity-50 caret-transparent"
        />
      ))}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function LoginPanel({
  role,
  icon: Icon,
  title,
  subtitle,
  accentClass,
  borderClass,
  buttonClass,
  onSuccess,
}: {
  role: "mentor" | "student";
  icon: React.ElementType;
  title: string;
  subtitle: string;
  accentClass: string;
  borderClass: string;
  buttonClass: string;
  onSuccess: (id: string, name: string, teamName: string) => void;
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
          .select("id, name")
          .eq("code", trimmed)
          .single();
        if (dbErr || !data) {
          setError(`Invalid code. (${dbErr?.message ?? "no data returned"})`);
          return;
        }
        // For mentors, their name IS the team name
        onSuccess(data.id as string, data.name as string, data.name as string);
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
        onSuccess(data.id as string, data.name as string, mentorName);
      }
    });
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border ${borderClass} bg-slate-900 p-8 gap-6 w-full max-w-sm`}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${borderClass} ${accentClass}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Access Code
          </label>
          <CodeInput value={code} onChange={setCode} disabled={isPending} />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || code.trim().length !== 6}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
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

  const handleSuccess = (role: "mentor" | "student") => (id: string, name: string, teamName: string) => {
    setSession({ role, id, name, teamName });
    router.push(role === "mentor" ? "/mentor/dashboard" : "/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-950 px-4 py-12">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-5 left-5 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
          <Trophy className="h-5 w-5 text-zinc-100" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            FTC Programming Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with your access code to continue
          </p>
        </div>
      </div>

      {/* Panels */}
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <LoginPanel
          role="mentor"
          icon={Shield}
          title="Mentor Login"
          subtitle="Enter your 6-digit mentor code"
          accentClass="bg-white/5 text-zinc-300"
          borderClass="border-white/15"
          buttonClass="bg-zinc-200 text-slate-950 hover:bg-white shadow-sm shadow-white/10"
          onSuccess={handleSuccess("mentor")}
        />

        <div className="hidden items-center lg:flex">
          <div className="h-32 w-px bg-slate-800" />
        </div>
        <div className="flex items-center lg:hidden">
          <div className="h-px w-32 bg-slate-800" />
        </div>

        <LoginPanel
          role="student"
          icon={User}
          title="Student Login"
          subtitle="Enter your 6-digit student code"
          accentClass="bg-white/5 text-zinc-300"
          borderClass="border-white/15"
          buttonClass="bg-zinc-100 text-slate-950 hover:bg-white shadow-sm shadow-white/10"
          onSuccess={handleSuccess("student")}
        />
      </div>
    </div>
  );
}
