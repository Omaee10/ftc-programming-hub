"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  User,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSession, setSession as persistSession } from "@/lib/auth";
import { getAuthUserId } from "@/lib/authSession";

const inputClass =
  "rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:border-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500/30 disabled:opacity-50 transition-all";

const labelClass =
  "text-[10px] font-medium uppercase tracking-widest text-slate-600";

function StatusMessage({ type, message }: { type: "error" | "success"; message: string }) {
  const isError = type === "error";
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
        isError
          ? "border-red-500/15 bg-red-500/8"
          : "border-emerald-500/15 bg-emerald-500/8"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      )}
      <span className={`text-xs ${isError ? "text-red-400" : "text-emerald-400"}`}>
        {message}
      </span>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [nameMsg, setNameMsg] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [emailMsg, setEmailMsg] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [namePending, startNameTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const userId = await getAuthUserId();
      if (!userId) {
        router.replace("/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();

      if (profile?.display_name) {
        setDisplayName(profile.display_name);
      }

      setLoading(false);
    })();
  }, [router]);

  const backHref = (() => {
    const session = getSession();
    if (!session) return "/onboarding";
    return session.role === "mentor" ? "/mentor/dashboard" : "/dashboard";
  })();

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameMsg({ type: "error", text: "Your name is required." });
      return;
    }
    setNameMsg(null);

    startNameTransition(async () => {
      const userId = await getAuthUserId();
      if (!userId) {
        router.replace("/login");
        return;
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", userId);

      if (profileErr) {
        setNameMsg({ type: "error", text: profileErr.message });
        return;
      }

      await supabase.from("students").update({ name: trimmed }).eq("user_id", userId);
      await supabase.from("mentors").update({ mentor_name: trimmed }).eq("user_id", userId);

      const session = getSession();
      if (session) {
        persistSession({ ...session, name: trimmed });
        window.dispatchEvent(new CustomEvent("ftc-session-updated"));
      }

      setNameMsg({ type: "success", text: "Name updated." });
    });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) {
      setEmailMsg({ type: "error", text: "Enter a new email address." });
      return;
    }
    if (!emailPassword) {
      setEmailMsg({ type: "error", text: "Enter your current password to confirm." });
      return;
    }
    if (trimmedEmail.toLowerCase() === email.toLowerCase()) {
      setEmailMsg({ type: "error", text: "That is already your email address." });
      return;
    }
    setEmailMsg(null);

    startEmailTransition(async () => {
      const userId = await getAuthUserId();
      if (!userId) {
        router.replace("/login");
        return;
      }

      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: emailPassword,
      });

      if (reauthErr) {
        setEmailMsg({ type: "error", text: "Current password is incorrect." });
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ email: trimmedEmail });

      if (updateErr) {
        setEmailMsg({ type: "error", text: updateErr.message });
        return;
      }

      await supabase.from("profiles").update({ email: trimmedEmail }).eq("id", userId);

      setEmailMsg({
        type: "success",
        text: "Confirmation sent — check your inbox to finish changing your email.",
      });
      setNewEmail("");
      setEmailPassword("");
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMsg({ type: "error", text: "Enter your current password." });
      return;
    }
    if (!newPassword) {
      setPasswordMsg({ type: "error", text: "Enter a new password." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPasswordMsg(null);

    startPasswordTransition(async () => {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (reauthErr) {
        setPasswordMsg({ type: "error", text: "Current password is incorrect." });
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });

      if (updateErr) {
        setPasswordMsg({ type: "error", text: updateErr.message });
        return;
      }

      setPasswordMsg({ type: "success", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 px-4">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="m-auto w-full max-w-sm py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <Trophy className="h-4 w-4 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">FTC Programming Hub</p>
          </div>
        </div>

        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <Settings className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
              Account settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Update your name, email, or password.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  disabled={namePending}
                  autoComplete="name"
                  className={`w-full py-2.5 pl-10 pr-3 ${inputClass}`}
                />
              </div>
            </div>
            {nameMsg && <StatusMessage type={nameMsg.type} message={nameMsg.text} />}
            <button
              type="submit"
              disabled={namePending || !displayName.trim()}
              className="flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {namePending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save name"
              )}
            </button>
          </form>

          <div className="h-px bg-slate-800/80" />

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Current Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className={`w-full py-2.5 pl-10 pr-3 ${inputClass} opacity-60 cursor-default`}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>New Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@school.edu"
                disabled={emailPending}
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Current Password</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Confirm with your password"
                disabled={emailPending}
                autoComplete="current-password"
                className={inputClass}
              />
            </div>
            {emailMsg && <StatusMessage type={emailMsg.type} message={emailMsg.text} />}
            <button
              type="submit"
              disabled={emailPending || !newEmail.trim() || !emailPassword}
              className="flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Update email"
              )}
            </button>
          </form>

          <div className="h-px bg-slate-800/80" />

          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                disabled={passwordPending}
                autoComplete="current-password"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                disabled={passwordPending}
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
                disabled={passwordPending}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            {passwordMsg && <StatusMessage type={passwordMsg.type} message={passwordMsg.text} />}
            <button
              type="submit"
              disabled={
                passwordPending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Update password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
