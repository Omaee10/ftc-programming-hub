"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/auth";
import { getAuthUserId } from "@/lib/authSession";
import { generateAccessCode, isUniqueViolation } from "@/lib/accessCodes";
import CodeInput from "@/components/CodeInput";

export default function JoinClassPage() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [classCode, setClassCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const userId = await getAuthUserId();
      if (!userId) {
        router.replace("/login");
        return;
      }
      setAuthUserId(userId);
    })();
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = classCode.trim();
    if (trimmedCode.length !== 6) {
      setError("Please enter the full 6-digit class code.");
      return;
    }
    setError("");

    startTransition(async () => {
      const userId = authUserId ?? (await getAuthUserId());
      if (!userId) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();

      const displayName = profile?.display_name?.trim() ?? "";
      if (!displayName) {
        setError("Your account has no name on file. Sign out and sign up again with your name.");
        return;
      }

      const { data: owner, error: lookupErr } = await supabase
        .from("mentors")
        .select("id, name, class_name")
        .eq("class_code", trimmedCode)
        .is("created_by", null)
        .single();

      if (lookupErr || !owner) {
        setError("Invalid class code. Check with your mentor and try again.");
        return;
      }

      const ownerRow = owner as {
        id: string;
        name: string;
        class_name?: string | null;
      };

      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", userId)
        .eq("mentor_id", ownerRow.id)
        .maybeSingle();

      if (existing) {
        setError("Class already joined with this email");
        return;
      }

      let code = generateAccessCode();
      let inserted: { id: string; code: string } | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error: insertErr } = await supabase
          .from("students")
          .insert({
            name: displayName,
            code,
            mentor_id: ownerRow.id,
            user_id: userId,
          })
          .select("id, code")
          .single();

        if (!insertErr && data) {
          inserted = data as { id: string; code: string };
          break;
        }

        if (isUniqueViolation(insertErr)) {
          if (insertErr?.message?.includes("students_user_mentor_unique")) {
            setError("Class already joined with this email");
            return;
          }
          code = generateAccessCode();
          continue;
        }

        setError(insertErr?.message ?? "Failed to join class. Please try again.");
        return;
      }

      if (!inserted) {
        setError("Failed to generate a unique student code. Please try again.");
        return;
      }

      setSession({
        role: "student",
        id: inserted.id,
        name: displayName,
        teamName: ownerRow.name,
        mentorId: ownerRow.id,
        ...(ownerRow.class_name?.trim()
          ? { className: ownerRow.class_name.trim() }
          : {}),
      });

      router.push("/dashboard");
      router.refresh();
    });
  };

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
            <UserPlus className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
              Join new class
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your mentor&apos;s class code to get started.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
              Class Code
            </label>
            <CodeInput value={classCode} onChange={setClassCode} disabled={isPending} />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/15 bg-red-500/8 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || classCode.trim().length !== 6}
            className="flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                Join Class
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
