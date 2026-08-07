"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Clock } from "lucide-react";
import {
  docCatalog,
  docChallenges,
  docHref,
  docTracks,
  docsInTrack,
  startHereDoc,
  type DocEntry,
} from "@/data/docCatalog";
import { builtinChallengeMeta } from "@/data/challengeMeta";
import { difficultyConfig } from "@/data/challengeConstants";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import { getSession } from "@/lib/auth";

const NAV_BADGE_CLASS: Record<string, string> = {
  "Start Here": "bg-amber-500/15 text-amber-400",
  New: "bg-blue-500/15 text-blue-400",
};

/** Precomputed once — the tag matching never depends on progress. */
const CHALLENGES_BY_DOC = new Map(
  docCatalog.map((doc) => [doc.slug, docChallenges(doc)])
);

function DocRow({
  doc,
  completedSet,
  hydrated,
  showProgress,
}: {
  doc: DocEntry;
  completedSet: Set<number>;
  hydrated: boolean;
  showProgress: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const challenges = CHALLENGES_BY_DOC.get(doc.slug) ?? [];
  const total = challenges.length;
  const done = challenges.filter((c) => completedSet.has(c.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const Icon = doc.icon;

  // Docs with no linked challenges render without the trailing column, so the
  // row never shows a meaningless 0/0. Mentors keep the challenge list but
  // lose the counters — they don't track personal progress anywhere else.
  const hasChallenges = total > 0;

  return (
    <div className="dash-surface-card overflow-hidden">
      <div className="flex items-stretch">
        <Link
          href={docHref(doc)}
          className="group flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3.5 card-accent-hover transition-all duration-200"
        >
          <div className="dash-icon-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
            <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:accent-text transition-colors" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                {doc.title}
              </span>
              <span className="text-[11px] text-slate-600">
                {doc.readingTime} read
              </span>
              {doc.navBadge && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide ${NAV_BADGE_CLASS[doc.navBadge]}`}
                >
                  {doc.navBadge}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {doc.description}
            </p>
          </div>
        </Link>

        {hasChallenges && (
          <div className="flex shrink-0 items-center gap-3 border-l dash-divider px-4">
            <span className="text-[11px] tabular-nums text-slate-500">
              {showProgress
                ? hydrated
                  ? `${done}/${total}`
                  : `—/${total}`
                : `${total} challenges`}
            </span>
            {showProgress && (
              <div className="progress-track hidden h-1 w-20 sm:block">
                <div
                  className="progress-fill"
                  style={{ width: hydrated ? `${pct}%` : "0%" }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Hide" : "Show"} the ${total} challenges for ${doc.title}`}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-800/60 hover:text-slate-300 transition-colors"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        )}
      </div>

      {hasChallenges && expanded && (
        <div className="border-t dash-divider dash-divide">
          {challenges.map((challenge) => {
            const isDone = showProgress && hydrated && completedSet.has(challenge.id);
            return (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}`}
                className="group dash-row flex items-center gap-3 px-4 py-2.5 card-accent-hover"
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-700" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                  {challenge.title}
                </span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium ${difficultyConfig[challenge.difficulty].badgeClass}`}
                >
                  {challenge.difficulty}
                </span>
                <span className="hidden shrink-0 items-center gap-1 text-[10px] text-slate-700 sm:flex">
                  <Clock className="h-3 w-3" />
                  {challenge.estimatedTime}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LearnClient() {
  const local = useChallengeProgress();
  const db = useSupabaseProgress();
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => {
    const sync = () => setIsMentor(getSession()?.role === "mentor");
    sync();
    window.addEventListener("ftc-session-updated", sync);
    return () => window.removeEventListener("ftc-session-updated", sync);
  }, []);

  const hydrated = local.hydrated;
  const completedSet = new Set(
    hydrated
      ? [...local.completedIds, ...(db.hydrated ? db.completedIds : [])]
      : []
  );

  const totalChallenges = builtinChallengeMeta.length;
  const totalDone = builtinChallengeMeta.filter((c) =>
    completedSet.has(c.id)
  ).length;

  const showProgress = !isMentor;
  const StartIcon = startHereDoc.icon;

  return (
    <div className="min-h-full px-6 py-10 max-w-4xl mx-auto page-enter">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-slate-600">
          FTC Programming Hub
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Learn to program an FTC robot
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500">
          Learn Java, the FTC SDK, and the theory you need through bite-sized
          documentation lessons and hands-on challenges.
        </p>
      </div>

      {/* ── Start here ──────────────────────────────────────────────────── */}
      <Link
        href={docHref(startHereDoc)}
        className="group mb-10 flex items-center justify-between gap-4 rounded-lg border accent-border-subtle accent-bg-subtle px-4 py-3.5 card-accent-hover transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md accent-bg border accent-border-subtle">
            <StartIcon className="h-3.5 w-3.5 accent-text" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
              Start here
            </p>
            <p className="text-sm font-medium text-slate-200">
              {startHereDoc.title}
            </p>
            {showProgress && (
              <p className="mt-0.5 text-xs text-slate-600">
                {hydrated ? totalDone : "—"} of {totalChallenges} challenges done
                overall
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:accent-text transition-colors" />
      </Link>

      {/* ── Tracks ──────────────────────────────────────────────────────── */}
      {docTracks.map((track) => {
        const docs = docsInTrack(track.id);
        const trackChallenges = docs.flatMap(
          (d) => CHALLENGES_BY_DOC.get(d.slug) ?? []
        );
        const trackTotal = new Set(trackChallenges.map((c) => c.id)).size;
        const trackDone = new Set(
          trackChallenges.filter((c) => completedSet.has(c.id)).map((c) => c.id)
        ).size;

        return (
          <section key={track.id} className="mb-10">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-slate-200">
                {track.label}
              </h2>
              {trackTotal > 0 && (
                <span className="text-[11px] tabular-nums text-slate-600">
                  {showProgress
                    ? `${hydrated ? trackDone : "—"} / ${trackTotal} challenges`
                    : `${trackTotal} challenges`}
                </span>
              )}
            </div>
            <p className="mb-4 max-w-2xl text-xs text-slate-600">
              {track.description}
            </p>

            <div className="space-y-2.5">
              {docs.map((doc) => (
                <DocRow
                  key={doc.slug}
                  doc={doc}
                  completedSet={completedSet}
                  hydrated={hydrated}
                  showProgress={showProgress}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
