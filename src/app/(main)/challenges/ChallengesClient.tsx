"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Zap,
  Code2,
  ChevronRight,
  ArrowRight,
  Trophy,
  Flame,
} from "lucide-react";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import {
  challenges as staticChallenges,
  difficultyConfig,
  difficultyOrder,
  type Challenge,
  type Difficulty,
} from "@/data/challenges";

// ─── Individual card ──────────────────────────────────────────────────────

function ChallengeCard({ challenge, isCompleted, hydrated }: { challenge: Challenge; isCompleted: (id: number) => boolean; hydrated: boolean }) {

  const diff = difficultyConfig[challenge.difficulty];
  const done = isCompleted(challenge.id);

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className={`group relative flex flex-col gap-4 rounded-xl border p-5 transition-all duration-200 cursor-pointer ${
        done
          ? "border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/20 hover:border-emerald-500/40"
          : "border-slate-800 bg-slate-900 hover:border-amber-500/30 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-amber-500/5"
      }`}
    >
      {/* Shimmer on hover */}
      <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.02] to-transparent" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Number / check badge */}
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-all ${
              done
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-slate-700 bg-slate-800 text-slate-400 group-hover:border-amber-500/30 group-hover:text-amber-400"
            }`}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <span>{challenge.id}</span>
            )}
          </div>

          {/* Title + difficulty */}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
              {challenge.title}
            </h3>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${diff.badgeClass}`}
            >
              {diff.label}
            </span>
          </div>
        </div>

        {/* XP pill */}
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1">
          <Zap className="h-3 w-3 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400">
            {challenge.xp} XP
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-slate-400 line-clamp-2">
        {challenge.description}
      </p>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
        {challenge.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-slate-800 bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-500"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer: status + time */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {/* Status badge */}
        {!hydrated ? (
          <span className="h-4 w-20 animate-pulse rounded bg-slate-800" />
        ) : done ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-amber-400 transition-colors">
            <span>Start challenge</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
          <Clock className="h-3 w-3" />
          {challenge.estimatedTime}
        </div>
      </div>
    </Link>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────

function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────

export default function ChallengesClient({
  dbChallenges = [],
}: {
  dbChallenges?: Challenge[];
}) {
  // Merge static + DB challenges (DB entries override static on same ID)
  const dbIds = new Set(dbChallenges.map((c) => c.id));
  const challenges = [
    ...staticChallenges.filter((c) => !dbIds.has(c.id)),
    ...dbChallenges,
  ].sort((a, b) => a.id - b.id);

  const local = useChallengeProgress();
  const db = useSupabaseProgress();

  const isCompleted = (id: number) =>
    local.isCompleted(id) || db.isCompleted(id);
  const hydrated = local.hydrated;

  const completedIds = challenges
    .map((c) => c.id)
    .filter((id) => isCompleted(id));
  const completedCount = completedIds.length;

  const totalXP = completedIds.reduce((sum, id) => {
    const c = challenges.find((ch) => ch.id === id);
    return sum + (c?.xp ?? 0);
  }, 0);

  const totalChallenges = challenges.length;
  const nextChallenge = challenges.find((c) => !isCompleted(c.id));

  const byDifficulty: Record<Difficulty, Challenge[]> = {
    Beginner: challenges.filter((c) => c.difficulty === "Beginner"),
    Intermediate: challenges.filter((c) => c.difficulty === "Intermediate"),
    Advanced: challenges.filter((c) => c.difficulty === "Advanced"),
  };

  return (
    <div className="min-h-full px-6 py-8 max-w-4xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1">
          <Code2 className="h-3 w-3 text-blue-400" />
          <span className="text-xs font-medium uppercase tracking-widest text-blue-400">
            Coding Challenges
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          Programming Challenges
        </h1>
        <p className="mt-1 text-slate-400">
          Practice real FTC concepts — from basic motor control to advanced
          autonomous pathing. Complete challenges to earn XP.
        </p>
      </div>

      {/* ── Progress overview ────────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center gap-6 mb-4">
          {[
            {
              icon: Trophy,
              label: "Completed",
              value: hydrated
                ? `${completedCount} / ${totalChallenges}`
                : "— / —",
              color: "text-amber-400",
              iconColor: "text-amber-400",
            },
            {
              icon: Zap,
              label: "XP Earned",
              value: hydrated ? `${totalXP} XP` : "— XP",
              color: "text-purple-400",
              iconColor: "text-purple-400",
            },
            {
              icon: Flame,
              label: "Remaining",
              value: hydrated
                ? `${totalChallenges - completedCount} left`
                : "— left",
              color: "text-slate-300",
              iconColor: "text-slate-500",
            },
          ].map(({ icon: Icon, label, value, color, iconColor }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon className={`h-4 w-4 ${iconColor}`} />
              <div>
                <p className={`text-base font-bold leading-none ${color}`}>
                  {value}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <ProgressBar
          completed={hydrated ? completedCount : 0}
          total={totalChallenges}
        />
        <p className="mt-2 text-[10px] text-slate-600">
          {hydrated
            ? completedCount === totalChallenges
              ? "All challenges complete! 🎉"
              : `${totalChallenges - completedCount} challenge${
                  totalChallenges - completedCount !== 1 ? "s" : ""
                } remaining`
            : "Loading progress…"}
        </p>
      </div>

      {/* ── Next up CTA ──────────────────────────────────────────────────── */}
      {hydrated && nextChallenge && (
        <Link
          href={`/challenges/${nextChallenge.id}`}
          className="group mb-8 flex items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-amber-600/3 px-5 py-4 hover:border-amber-500/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/70">
                Up next
              </p>
              <p className="text-sm font-semibold text-slate-200">
                {nextChallenge.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400/70 group-hover:text-amber-400 transition-colors">
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      )}

      {/* ── Challenge grid by difficulty ──────────────────────────────────── */}
      {difficultyOrder.map((difficulty) => {
        const items = byDifficulty[difficulty];
        if (items.length === 0) return null;

        const doneInSection = items.filter((c) =>
          isCompleted(c.id)
        ).length;

        return (
          <div key={difficulty} className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {difficulty}
              </h2>
              <div className="h-px flex-1 bg-slate-800" />
              {hydrated && (
                <span className="text-[11px] text-slate-600">
                  {doneInSection} / {items.length} done
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} isCompleted={isCompleted} hydrated={hydrated} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
