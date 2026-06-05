"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  UserPlus,
  AlertCircle,
  Loader2,
  ArrowRight,
  Mail,
  ChevronDown,
  ChevronUp,
  User,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import CodeInput from "@/components/CodeInput";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"student" | "mentor" | null>(null);
  const [showCodeSection, setShowCodeSection] = useState(false);
  const [codeType, setCodeType] = useState<"student" | "mentor">("student");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasCode = showCodeSection && accessCode.trim().length === 6;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      setError("Email and password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!hasCode && !name.trim()) {
      setError("Your name is required.");
      return;
    }
    if (!hasCode && !accountType) {
      setError("Select whether you are a student or mentor.");
      return;
    }
    if (showCodeSection && accessCode.trim().length !== 6) {
      setError("Enter the full 6-digit code or collapse the code section.");
      return;
    }
    setError("");

    startTransition(async () => {
      const payload: Record<string, string> = {
        email: trimmedEmail,
        password,
      };
      if (!hasCode) {
        payload.name = name.trim();
        if (accountType) payload.accountType = accountType;
      }
      if (hasCode) {
        if (codeType === "student") {
          payload.studentCode = accessCode.trim();
        } else {
          payload.mentorCode = accessCode.trim();
        }
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to create account.");
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInErr) {
        setError("Account created but sign-in failed. Try logging in.");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 px-4">
      <div className="m-auto w-full max-w-sm py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <Trophy className="h-4 w-4 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">FTC Programming Hub</p>
            <p className="text-xs text-slate-600">Create your account</p>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Sign up</h1>
          <p className="mt-1 text-sm text-slate-500">
            New here? Create an account to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                disabled={isPending}
                autoComplete="email"
                className="w-full rounded-md border border-slate-700/60 bg-slate-800/60 py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-700 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/30 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={isPending}
              autoComplete="new-password"
              className="rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/30 disabled:opacity-50 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              disabled={isPending}
              autoComplete="new-password"
              className="rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/30 disabled:opacity-50 transition-all"
            />
          </div>

          {!hasCode && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  disabled={isPending}
                  autoComplete="name"
                  className="rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/30 disabled:opacity-50 transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
                  I am a
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType("student")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-all ${
                      accountType === "student"
                        ? "border-slate-500 bg-slate-700/80 text-slate-100"
                        : "border-slate-800/60 bg-slate-900/40 text-slate-500 hover:border-slate-700/60 hover:text-slate-300"
                    }`}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("mentor")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-all ${
                      accountType === "mentor"
                        ? "border-slate-500 bg-slate-700/80 text-slate-100"
                        : "border-slate-800/60 bg-slate-900/40 text-slate-500 hover:border-slate-700/60 hover:text-slate-300"
                    }`}
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    Mentor
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="rounded-lg border border-slate-800/60 bg-slate-900/40">
            <button
              type="button"
              onClick={() => setShowCodeSection((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Have a student or mentor code?</span>
              {showCodeSection ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </button>

            {showCodeSection && (
              <div className="border-t border-slate-800/60 px-4 pb-4 pt-3 flex flex-col gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeType("student")}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      codeType === "student"
                        ? "bg-slate-700 text-slate-100"
                        : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Student code
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeType("mentor")}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      codeType === "mentor"
                        ? "bg-slate-700 text-slate-100"
                        : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Mentor code
                  </button>
                </div>
                <CodeInput value={accessCode} onChange={setAccessCode} disabled={isPending} />
                <p className="text-xs text-slate-600">
                  {codeType === "mentor"
                    ? "Enter your mentor or co-mentor sign-in code from the class dashboard."
                    : "Link your existing student account — you'll be added to your class automatically."}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/15 bg-red-500/8 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !email.trim() || !password || !confirmPassword}
            className="flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Create Account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="text-slate-400 hover:text-slate-200 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
