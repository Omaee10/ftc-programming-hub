"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { useHomeworkAssignments } from "@/hooks/useHomeworkAssignments";
import { getSession } from "@/lib/auth";
import { supabase, type ChallengeRow } from "@/lib/supabase";
import {
  rowToChallenge,
  resolveChallenge,
  formatDueDate,
  isOverdue,
} from "@/lib/homeworkUtils";
import {
  difficultyConfig,
  type Challenge,
} from "@/data/challenges";

function HomeworkCard({
  challenge,
  completed,
  dueDate,
}: {
  challenge: Challenge;
  completed: boolean;
  dueDate: string | null;
}) {
  const diff = difficultyConfig[challenge.difficulty];
  const overdue = !completed && isOverdue(dueDate);
  const dueLabel = formatDueDate(dueDate);

  return (
    <Link
      href={`/homework/${challenge.id}`}
      className={`group relative flex flex-col gap-3 rounded-lg border p-4 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
        completed
          ? "border-emerald-500/15 bg-emerald-950/10 hover:border-emerald-500/25"
          : overdue
          ? "border-red-500/20 bg-red-950/10 hover:border-red-500/30"
          : "border-slate-800/80 bg-slate-900/40 card-accent-hover hover:shadow-md hover:shadow-black/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-medium ${
              completed
                ? "bg-emerald-500/10 text-emerald-500"
                : overdue
                ? "bg-red-500/10 text-red-400"
                : "bg-slate-800/80 text-slate-500 group-hover:accent-text"
            }`}
          >
            {completed ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : overdue ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <ClipboardList className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
              {challenge.title}
            </h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
          <Zap className="h-3 w-3" />
          <span>{challenge.xp}</span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">
        {challenge.description}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${diff.badgeClass}`}
        >
          {diff.label}
        </span>
        <div className="flex items-center gap-2">
          {dueLabel && (
            <span
              className={`text-[11px] ${overdue ? "text-red-400 font-medium" : "text-slate-600"}`}
            >
              Due {dueLabel}
            </span>
          )}
          {completed ? (
            <span className="text-[11px] font-medium text-emerald-500">Completed</span>
          ) : (
            <span className="text-[11px] accent-text font-medium">Start →</span>
          )}
          <div className="flex items-center gap-1 text-[11px] text-slate-700">
            <Clock className="h-3 w-3" />
            {challenge.estimatedTime}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomeworkClient() {
  const router = useRouter();
  const { assignments, hydrated } = useHomeworkAssignments();
  const [dbChallenges, setDbChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    const session = getSession();
    if (session?.role === "mentor") {
      router.replace("/mentor/dashboard");
    }
  }, [router]);

  useEffect(() => {
    const session = getSession();
    if (!session?.mentorId) return;

    (async () => {
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .eq("created_by", session.mentorId!)
        .order("id", { ascending: true });

      setDbChallenges((data ?? []).map((row) => rowToChallenge(row as ChallengeRow)));
    })();
  }, []);

  const pending = assignments.filter((a) => !a.completed);
  const completed = assignments.filter((a) => a.completed);

  const resolve = (challengeId: number) =>
    resolveChallenge(challengeId, dbChallenges);

  return (
    <div className="min-h-full px-6 py-10 max-w-4xl mx-auto page-enter">
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">
          FTC Programming Hub
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Coding Homework
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-xl">
          Complete challenges assigned by your mentor. Homework is separate from
          the self-paced Coding Challenges track.
        </p>
      </div>

      {!hydrated ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-slate-800/60 bg-slate-900/40"
            />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-6 py-12 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">No homework assigned yet.</p>
          <p className="mt-1 text-xs text-slate-600">
            Your mentor will assign challenges here when ready.
          </p>
          <Link
            href="/challenges"
            className="mt-4 inline-flex items-center gap-1 text-xs accent-text hover:underline"
          >
            Browse Coding Challenges
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-4">
                Pending ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((a) => {
                  const ch = resolve(a.challenge_id);
                  if (!ch) return null;
                  return (
                    <HomeworkCard
                      key={a.id}
                      challenge={ch}
                      completed={false}
                      dueDate={a.due_date}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-4">
                Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map((a) => {
                  const ch = resolve(a.challenge_id);
                  if (!ch) return null;
                  return (
                    <HomeworkCard
                      key={a.id}
                      challenge={ch}
                      completed
                      dueDate={a.due_date}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
