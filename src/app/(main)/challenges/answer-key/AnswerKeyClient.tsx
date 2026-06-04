"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Blocks, Clock, KeyRound, Loader2, Zap } from "lucide-react";
import {
  challenges as staticChallenges,
  difficultyConfig,
  difficultyOrder,
  type Challenge,
  type Difficulty,
} from "@/data/challenges";
import { getChallengeSolution } from "@/data/challengeSolutions";
import { isBlocksEnabled } from "@/data/blockChallenges";
import { getSession } from "@/lib/auth";

function AnswerCard({ challenge }: { challenge: Challenge }) {
  const diff = difficultyConfig[challenge.difficulty];
  const hasBlocks = !!getChallengeSolution(challenge.id)?.blocks || isBlocksEnabled(challenge.id);

  return (
    <Link
      href={`/challenges/answer-key/${challenge.id}`}
      className="group relative flex flex-col gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 p-4 transition-all duration-200 cursor-pointer card-accent-hover hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800/80 text-xs font-medium text-slate-500 group-hover:accent-text transition-all">
            {challenge.id}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors truncate">
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
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${diff.badgeClass}`}
          >
            {diff.label}
          </span>
          {hasBlocks && (
            <span className="inline-flex items-center gap-1 rounded border border-slate-700/60 bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              <Blocks className="h-2.5 w-2.5" />
              Blocks
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] accent-text font-medium">View →</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-700">
            <Clock className="h-3 w-3" />
            {challenge.estimatedTime}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function AnswerKeyClient() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session?.role === "mentor") {
      setAllowed(true);
    } else {
      router.replace("/challenges");
    }
  }, [router]);

  // Only static challenges that ship a reference solution.
  const solved = staticChallenges
    .filter((c) => !!getChallengeSolution(c.id))
    .sort((a, b) => a.id - b.id);

  const byDifficulty: Record<Difficulty, Challenge[]> = {
    Beginner: solved.filter((c) => c.difficulty === "Beginner"),
    Intermediate: solved.filter((c) => c.difficulty === "Intermediate"),
    Advanced: solved.filter((c) => c.difficulty === "Advanced"),
  };

  if (!allowed) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 py-10 max-w-4xl mx-auto page-enter">
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">
          FTC Programming Hub
        </p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Challenge Answer Key
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
            <KeyRound className="h-3 w-3" />
            Mentor
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500 max-w-xl">
          Complete, graded reference solutions for every challenge. Each opens a
          locked, read-only workspace showing the finished Java (and blocks where
          available). Visible to mentors only.
        </p>
      </div>

      {difficultyOrder.map((difficulty) => {
        const items = byDifficulty[difficulty];
        if (items.length === 0) return null;
        return (
          <div key={difficulty} className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-slate-600">
                {difficulty}
              </h2>
              <div className="h-px flex-1 bg-slate-800/80" />
              <span className="text-[11px] text-slate-700">{items.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {items.map((challenge) => (
                <AnswerCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </div>
        );
      })}

      {solved.length === 0 && (
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-6 py-12 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">No reference solutions available.</p>
          <Link
            href="/challenges"
            className="mt-4 inline-flex items-center gap-1 text-xs accent-text hover:underline"
          >
            Back to Coding Challenges
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
