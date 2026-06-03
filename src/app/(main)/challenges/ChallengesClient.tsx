"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Zap,
  Code2,
  ArrowRight,
  Trophy,
  Flame,
} from "lucide-react";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import { useHomeworkAssignments } from "@/hooks/useHomeworkAssignments";
import { getSession } from "@/lib/auth";
import { useState, useEffect } from "react";
import {
  challenges as staticChallenges,
  difficultyConfig,
  difficultyOrder,
  type Challenge,
  type Difficulty,
} from "@/data/challenges";
import {
  COURSE_TRACK_LABELS,
  type CourseTrack,
} from "@/data/challengeBlocksMeta";
import {
  rowToChallenge,
  mergeChallenges,
  filterOutAssigned,
  computeDisplayNumbers,
} from "@/lib/homeworkUtils";
import { fetchClassChallenges, isCustomChallengeId } from "@/lib/classChallenges";

// ─── Individual card ──────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  displayNumber,
  isCompleted,
  hydrated,
  isCustom = false,
}: {
  challenge: Challenge;
  displayNumber: number;
  isCompleted: (id: number) => boolean;
  hydrated: boolean;
  isCustom?: boolean;
}) {
  const diff = difficultyConfig[challenge.difficulty];
  const done = isCompleted(challenge.id);

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className={`group relative flex flex-col gap-3 rounded-lg border p-4 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
        done
          ? "border-emerald-500/15 bg-emerald-950/10 hover:border-emerald-500/25"
          : "border-slate-800/80 bg-slate-900/40 card-accent-hover hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Number / check badge */}
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-medium transition-all ${
              done
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-slate-800/80 text-slate-500 group-hover:accent-text"
            }`}
          >
            {done ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : isCustom ? (
              <span className="text-[9px] font-semibold uppercase tracking-wide">C</span>
            ) : (
              <span>{displayNumber}</span>
            )}
          </div>

          {/* Title */}
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors truncate">
              {challenge.title}
            </h3>
          </div>
        </div>

        {/* XP — subtle */}
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
          <Zap className="h-3 w-3" />
          <span>{challenge.xp}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">
        {challenge.description}
      </p>

      {/* Footer: difficulty + time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${diff.badgeClass}`}
          >
            {isCustom ? "Class challenge" : diff.label}
          </span>
          {!isCustom && challenge.blocksSupport === "java-only" && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-800/80 text-slate-500 border border-slate-700/60">
              Java only
            </span>
          )}
          {!isCustom && challenge.blocksSupport === "full" && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Blocks
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!hydrated ? (
            <span className="h-3 w-16 animate-pulse rounded bg-slate-800" />
          ) : done ? (
            <span className="text-[11px] font-medium text-emerald-500">Completed</span>
          ) : (
            <span className="text-[11px] accent-text font-medium group-hover:accent-text transition-colors">
              Start →
            </span>
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

// ─── Progress bar ────────────────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="relative h-0.5 w-full rounded-full bg-slate-800 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full accent-fill transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────

export default function ChallengesClient() {
  const [dbChallenges, setDbChallenges] = useState<Challenge[]>([]);
  const [isMentor, setIsMentor] = useState(false);

  const local = useChallengeProgress();
  const db = useSupabaseProgress();
  const homework = useHomeworkAssignments();

  // Fetch only the challenges scoped to this user's mentor.
  // Students see only their own mentor's challenges.
  // Mentors see only their own created challenges.
  // This prevents cross-class data leakage.
  useEffect(() => {
    const session = getSession();
    if (!session) return;

    setIsMentor(session.role === "mentor");

    fetchClassChallenges(session).then((rows) => {
      setDbChallenges(rows.map(rowToChallenge));
    });
  }, []);

  const allChallenges = mergeChallenges(dbChallenges);
  const challenges = filterOutAssigned(
    allChallenges,
    isMentor ? [] : homework.assignedIds
  );

  const isCompleted = (id: number) => local.isCompleted(id) || db.isCompleted(id);
  const hydrated = local.hydrated;
  const progress = local.progress;

  const completedIds = challenges
    .map((c) => c.id)
    .filter((id) => isCompleted(id));
  const completedCount = completedIds.length;

  const totalXP = completedIds.reduce((sum, id) => {
    const c = challenges.find((ch) => ch.id === id);
    return sum + (c?.xp ?? 0);
  }, 0);

  const customChallenges = challenges.filter((c) => isCustomChallengeId(c.id));
  const catalogChallenges = challenges.filter((c) => !isCustomChallengeId(c.id));

  const [courseTrackFilter, setCourseTrackFilter] = useState<CourseTrack | "all">(
    "all"
  );

  const filteredCatalog =
    courseTrackFilter === "all"
      ? catalogChallenges
      : catalogChallenges.filter((c) => c.courseTrack === courseTrackFilter);

  const courseTrackOptions: (CourseTrack | "all")[] = [
    "all",
    "intro",
    "movement",
    "sensors",
    "teleop",
    "autonomous",
    "advanced",
  ];

  const byDifficulty: Record<Difficulty, Challenge[]> = {
    Beginner: filteredCatalog.filter((c) => c.difficulty === "Beginner"),
    Intermediate: filteredCatalog.filter((c) => c.difficulty === "Intermediate"),
    Advanced: filteredCatalog.filter((c) => c.difficulty === "Advanced"),
  };

  const { displayNumbers, orderedChallenges: orderedCatalog } =
    computeDisplayNumbers(catalogChallenges);
  const orderedChallenges = [...customChallenges, ...orderedCatalog];

  const totalChallenges = challenges.length;

  const nextChallenge = (() => {
    if (!hydrated) return orderedChallenges[0] ?? null;
    const entries = Object.entries(progress) as [string, string][];
    let mostRecentId: number | null = null;
    if (entries.length > 0) {
      const best = entries.reduce((a, b) => (a[1] >= b[1] ? a : b));
      mostRecentId = Number(best[0]);
    }
    const startIdx = mostRecentId !== null
      ? orderedChallenges.findIndex((c) => c.id === mostRecentId)
      : -1;
    for (let i = startIdx + 1; i < orderedChallenges.length; i++) {
      if (!isCompleted(orderedChallenges[i].id)) return orderedChallenges[i];
    }
    return orderedChallenges.find((c) => !isCompleted(c.id)) ?? null;
  })();

  return (
    <div className="min-h-full px-6 py-10 max-w-4xl mx-auto page-enter">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">
          FTC Programming Hub
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Coding Challenges
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-xl">
          Practice real FTC concepts — from basic motor control to advanced
          autonomous pathing.
        </p>
      </div>

      {/* ── Progress — open, inline ──────────────────────────────────────── */}
      {!isMentor && (
        <div className="mb-10 pb-8 border-b border-slate-800/60">
          <div className="flex flex-wrap items-center gap-8 mb-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold stat-number accent-stat">
                  {hydrated ? completedCount : "—"}
                </span>
                <span className="text-lg text-slate-700 font-light">/ {totalChallenges}</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">completed</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xl font-semibold stat-number text-purple-400">
                  {hydrated ? totalXP : "—"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">XP earned</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-slate-600" />
                <span className="text-xl font-semibold stat-number text-slate-400">
                  {hydrated ? totalChallenges - completedCount : "—"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">remaining</p>
            </div>
          </div>
          <div className="max-w-sm">
            <ProgressBar
              completed={hydrated ? completedCount : 0}
              total={totalChallenges}
            />
            <p className="mt-1.5 text-[11px] text-slate-700">
              {hydrated
                ? completedCount === totalChallenges
                  ? "All challenges complete!"
                  : `${Math.round((completedCount / totalChallenges) * 100)}% complete`
                : "Loading progress…"}
            </p>
          </div>
        </div>
      )}

      {/* ── Next up ──────────────────────────────────────────────────── */}
      {!isMentor && hydrated && nextChallenge && (
        <Link
          href={`/challenges/${nextChallenge.id}`}
          className="group mb-10 flex items-center justify-between gap-4 rounded-lg border accent-border-subtle accent-bg-subtle px-4 py-3.5 card-accent-hover transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 flex items-center justify-center rounded-md accent-bg border accent-border-subtle">
              <Code2 className="h-3.5 w-3.5 accent-text" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
                Continue
              </p>
              <p className="text-sm font-medium text-slate-200">
                {nextChallenge.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:accent-text transition-colors">
            <Trophy className="h-3.5 w-3.5" />
            <span>{nextChallenge.xp} XP</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </div>
        </Link>
      )}

      {/* ── Class challenges (mentor-created) ─────────────────────────────── */}
      {customChallenges.length > 0 && (
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-[11px] font-medium uppercase tracking-widest text-slate-600">
              Class Challenges
            </h2>
            <div className="h-px flex-1 bg-slate-800/80" />
            <span className="text-[11px] text-slate-700">
              {customChallenges.length} from your mentor
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {customChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                displayNumber={challenge.id}
                isCompleted={isCompleted}
                hydrated={hydrated}
                isCustom
              />
            ))}
          </div>
        </div>
      )}

      {/* ── FTC Sim–style course tracks ───────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap gap-2">
        {courseTrackOptions.map((track) => (
          <button
            key={track}
            type="button"
            onClick={() => setCourseTrackFilter(track)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              courseTrackFilter === track
                ? "bg-slate-700/90 text-slate-100 border border-slate-600/80"
                : "bg-slate-900/60 text-slate-500 border border-slate-800/80 hover:text-slate-300"
            }`}
          >
            {track === "all" ? "All tracks" : COURSE_TRACK_LABELS[track]}
          </button>
        ))}
      </div>

      {/* ── Challenge grid by difficulty ──────────────────────────────────── */}
      {difficultyOrder.map((difficulty) => {
        const items = byDifficulty[difficulty];
        if (items.length === 0) return null;

        const doneInSection = items.filter((c) => isCompleted(c.id)).length;

        return (
          <div key={difficulty} className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-slate-600">
                {difficulty}
              </h2>
              <div className="h-px flex-1 bg-slate-800/80" />
              {hydrated && (
                <span className="text-[11px] text-slate-700">
                  {doneInSection} / {items.length}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {items.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  displayNumber={displayNumbers[challenge.id]}
                  isCompleted={isCompleted}
                  hydrated={hydrated}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
