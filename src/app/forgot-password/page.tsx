"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Lock,
  AlertCircle,
  Loader2,
  ArrowRight,
  Mail,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { clearSession } from "@/lib/auth";
import CodeInput from "@/components/CodeInput";

const inputClass =
  "rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/30 disabled:opacity-50 transition-all";

const labelClass =
  "text-[10px] font-medium uppercase tracking-widest text-slate-600";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    setError("");
    setInfo("");

    startTransition(async () => {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

      if (resetErr) {
        setError(resetErr.message);
        return;
      }

      setStep("reset");
      setInfo("We sent a 6-digit security code to your email. Enter it below with your new password.");
    });
  };

  const handleResendCode = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setError("");
    setInfo("");

    startTransition(async () => {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

      if (resetErr) {
        setError(resetErr.message);
        return;
      }

      setInfo("A new security code was sent to your email.");
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (trimmedCode.length !== 6) {
      setError("Enter the full 6-digit security code from your email.");
      return;
    }
    if (!newPassword) {
      setError("Enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setInfo("");

    startTransition(async () => {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedCode,
        type: "recovery",
      });

      if (verifyErr) {
        setError("Invalid or expired security code. Try again or request a new one.");
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      clearSession();
      await supabase.auth.signOut();

      router.push("/login?reset=success");
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 px-4">
      <Link
        href="/login"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <div className="m-auto w-full max-w-sm py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <Trophy className="h-4 w-4 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">FTC Programming Hub</p>
            <p className="text-xs text-slate-600">Reset your password</p>
          </div>
        </div>

        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <KeyRound className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
              {step === "email" ? "Forgot password?" : "Set new password"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === "email"
                ? "Enter your email and we'll send you a security code."
                : "Enter the code from your email and choose a new password."}
            </p>
          </div>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  disabled={isPending}
                  autoComplete="email"
                  className={`w-full py-2.5 pl-10 pr-3 ${inputClass}`}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/15 bg-red-500/8 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <span className="text-xs text-red-400">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                <>
                  Send security code
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <label className={`${labelClass} text-center`}>Security Code</label>
              <CodeInput value={code} onChange={setCode} disabled={isPending} />
              <p className="text-center text-xs text-slate-600">
                Sent to <span className="text-slate-400">{email.trim()}</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                disabled={isPending}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={isPending}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/15 bg-red-500/8 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <span className="text-xs text-red-400">{error}</span>
              </div>
            )}

            {info && !error && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/15 bg-emerald-500/8 px-3 py-2">
                <span className="text-xs text-emerald-400">{info}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isPending ||
                code.trim().length !== 6 ||
                !newPassword ||
                !confirmPassword
              }
              className="flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Reset password
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isPending}
              className="text-sm text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              Didn&apos;t get a code? Send again
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setNewPassword("");
                setConfirmPassword("");
                setError("");
                setInfo("");
              }}
              disabled={isPending}
              className="text-sm text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
