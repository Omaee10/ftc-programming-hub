"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { getAuthUserId } from "@/lib/authSession";
import CodeInput from "@/components/CodeInput";

export default function LinkMentorPage() {
  const router = useRouter();
  const [mentorCode, setMentorCode] = useState("");
  const [error, setError] = useState("");
  const [linked, setLinked] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = mentorCode.trim();
    if (trimmed.length !== 6) {
      setError("Please enter the full 6-digit mentor code.");
      return;
    }
    setError("");

    startTransition(async () => {
      const userId = await getAuthUserId();
      if (!userId) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/auth/link-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorCode: trimmed }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to link mentor workspace.");
        return;
      }

      setLinked(true);
    });
  };

  if (linked) {
    return (
      <div className="flex min-h-screen bg-slate-950 px-4">
        <div className="m-auto w-full max-w-sm py-16 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-4" />
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight mb-2">
            Workspace linked
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Your mentor workspace is ready. Pick it from your class list.
          </p>
          <button
            type="button"
            onClick={() => router.push("/signin")}
            className="inline-flex items-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold"
          >
            Go to your classes
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 px-4">
      <button
        type="button"
        onClick={() => router.push("/onboarding")}
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
            <Shield className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
              Link mentor workspace
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Already have an account? Enter a mentor or co-mentor code to join another class.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
              Mentor or co-mentor code
            </label>
            <CodeInput value={mentorCode} onChange={setMentorCode} disabled={isPending} />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/15 bg-red-500/8 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || mentorCode.trim().length !== 6}
            className="flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                Link workspace
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
