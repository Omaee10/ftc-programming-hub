"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Lock, User, Shield, AlertCircle, Loader2 } from "lucide-react";
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
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const handleKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === "Backspace") {
      const next = digits.map((d, i) => (i === idx ? " " : d)).join("").trimEnd();
      onChange(next);
      const prev = document.getElementById(`digit-${e.currentTarget.dataset.group}-${idx - 1}`);
      (prev as HTMLInputElement | null)?.focus();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number,
    group: string
  ) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const next = digits
      .map((d, i) => (i === idx ? char : d === " " ? " " : d))
      .join("");
    onChange(next.trimEnd());
    const nextEl = document.getElementById(`digit-${group}-${idx + 1}`);
    (nextEl as HTMLInputElement | null)?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) onChange(pasted);
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`digit-${value.length > 0 ? "active" : "inactive"}-${i}`}
          data-group="input"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onKeyDown={(e) => handleKey(e, i)}
          onChange={(e) => handleChange(e, i, "input")}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-11 h-12 rounded-lg border border-slate-700 bg-slate-800 text-center text-lg font-bold text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all disabled:opacity-50 caret-transparent"
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
  onSuccess: (id: string, name: string) => void;
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
      const table = role === "mentor" ? "mentors" : "students";
      const { data, error: dbErr } = await supabase
        .from(table)
        .select("id, name")
        .eq("code", trimmed)
        .single();

      if (dbErr || !data) {
        const detail = dbErr?.message ?? "no data returned";
        setError(`Invalid code. (${detail})`);
        return;
      }
      onSuccess(data.id as string, data.name as string);
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

  const handleSuccess = (role: "mentor" | "student") => (id: string, name: string) => {
    setSession({ role, id, name });
    router.push(role === "mentor" ? "/mentor/dashboard" : "/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-950 px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <Trophy className="h-5 w-5 text-amber-400" />
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
          accentClass="bg-violet-500/10 text-violet-400"
          borderClass="border-violet-500/20"
          buttonClass="bg-violet-600 text-white hover:bg-violet-500 shadow-sm shadow-violet-500/20"
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
          accentClass="bg-amber-500/10 text-amber-400"
          borderClass="border-amber-500/20"
          buttonClass="bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-sm shadow-amber-500/20"
          onSuccess={handleSuccess("student")}
        />
      </div>
    </div>
  );
}
