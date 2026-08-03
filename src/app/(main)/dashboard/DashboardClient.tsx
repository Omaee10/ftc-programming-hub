"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Code2,
  ArrowRight,
  CheckCircle2,
  Users,
  ClipboardList,
  ChevronRight,
  GraduationCap,
  Archive,
  Layers,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { difficultyOrder, difficultyConfig, type Difficulty } from "@/data/challengeConstants";
import { builtinChallengeMeta } from "@/data/challengeMeta";
import type { Challenge } from "@/data/challenges";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import { useHomeworkAssignments } from "@/hooks/useHomeworkAssignments";
import {
  filterOutAssigned,
  computeDisplayNumbers,
  mergeChallenges,
} from "@/lib/homeworkUtils";
import { fetchClassChallenges } from "@/lib/classChallenges";
import { fetchOverviewData } from "@/lib/mentorDashboardApi";
import DashboardDocSearch from "@/components/DashboardDocSearch";
import DiscordLink from "@/components/DiscordLink";

function calcStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(completedDates.map((d) => d.slice(0, 10)))
  ).sort((a, b) => (a > b ? -1 : 1));

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / 86_400_000
    );
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDisplayName(name: string): string {
  if (!name || name === "there") return name;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const DIFFICULTY_BAR: Record<Difficulty, string> = {
  Beginner: "bg-emerald-500",
  Intermediate: "bg-amber-500",
  Advanced: "bg-violet-500",
};

const STUDENT_SHORTCUTS = [
  { label: "All challenges", href: "/challenges", icon: Code2 },
  { label: "Java basics", href: "/docs/java-basics", icon: GraduationCap },
  { label: "Past programs", href: "/past-programs", icon: Archive },
] as const;

function DifficultyProgressStrip({
  completedSet,
  hydrated,
}: {
  completedSet: Set<number>;
  hydrated: boolean;
}) {
  const tiers = difficultyOrder.map((diff) => {
    const all = builtinChallengeMeta.filter((c) => c.difficulty === diff);
    const done = all.filter((c) => completedSet.has(c.id)).length;
    const pct = all.length > 0 ? Math.round((done / all.length) * 100) : 0;
    return { diff, done, total: all.length, pct };
  });

  return (
    <div className="dash-surface-card mt-4 shrink-0 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-600">
          Progress by level
        </p>
        <Link href="/challenges" className="text-[10px] link-accent flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiers.map(({ diff, done, total, pct }) => (
          <div key={diff}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${difficultyConfig[diff].badgeClass}`}>
                {difficultyConfig[diff].label}
              </span>
              <span className="text-[10px] tabular-nums text-slate-500">
                {hydrated ? `${done}/${total}` : "—"}
              </span>
            </div>
            <div className="progress-track h-1">
              <div
                className={`h-full rounded-full transition-all duration-500 ${DIFFICULTY_BAR[diff]}`}
                style={{ width: hydrated ? `${pct}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t dash-divider pt-3">
        {STUDENT_SHORTCUTS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="dash-list-item inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-200"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("ftc-open-doc-search"))}
          className="dash-list-item inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-all duration-200 hover:text-slate-300"
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          Search docs
          <kbd className="dash-search-kbd ml-0.5 text-[9px]">⌘K</kbd>
        </button>
      </div>
    </div>
  );
}

// ─── Mentor dashboard ──────────────────────────────────────────────────────

function MentorDashboard() {
  const [classTitle, setClassTitle] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [challengeCount, setChallengeCount] = useState<number | null>(null);

  const loadOverview = useCallback(async () => {
    const session = getSession();
    if (!session || session.role !== "mentor") return;

    try {
      const data = await fetchOverviewData(session);
      setStudentCount(data.studentCount);
      setPendingCount(data.pendingCount);
      setChallengeCount(data.challengeCount);

      const fromDb = data.className?.trim();
      if (fromDb) {
        setClassTitle(fromDb);
        return;
      }

      const fromSession = session.className?.trim();
      if (fromSession) {
        setClassTitle(fromSession);
      }
    } catch {
      // Keep null counts if the request fails.
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    window.addEventListener("ftc-session-updated", loadOverview);
    return () => window.removeEventListener("ftc-session-updated", loadOverview);
  }, [loadOverview]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hasPending = pendingCount !== null && pendingCount > 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:overflow-hidden px-5 py-4 max-w-5xl mx-auto page-enter">
      <DashboardDocSearch />

      <div className="mt-4 shrink-0">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-1">{today}</p>
        <h1 className="text-xl font-semibold text-slate-100 tracking-tight capitalize">
          {classTitle ?? "…"}
        </h1>
      </div>

      <div className="mt-4 grid shrink-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="dash-panel px-4 py-3.5 lg:col-span-2">
          <div className="grid grid-cols-3 divide-x dash-divider">
            {[
              { label: "Students", value: studentCount },
              { label: "Pending Review", value: pendingCount, highlight: hasPending },
              { label: "Challenges Created", value: challengeCount },
            ].map((s) => (
              <div key={s.label} className="px-0 first:pl-0 pl-5">
                <p className={`text-2xl font-semibold ${s.highlight ? "stat-value-warning" : "stat-value-muted"}`}>
                  {s.value !== null ? s.value : "—"}
                </p>
                <p className="stat-label mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {hasPending ? (
          <Link
            href="/mentor/dashboard"
            className="group dash-panel-warning flex items-center justify-between px-4 py-3 lg:col-span-1"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ClipboardList className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-sm font-medium text-slate-200 truncate">
                {pendingCount} pending review
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
          </Link>
        ) : (
          pendingCount !== null && (
            <div className="dash-panel-success flex items-center gap-3 px-4 py-3 lg:col-span-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-slate-400">All caught up</p>
            </div>
          )
        )}
      </div>

      <div className="mt-3 min-h-0 flex-1">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 font-medium mb-2">Quick access</p>
        <div className="dash-panel overflow-hidden dash-divide">
          {[
            { label: "Mentor Portal", sub: "Students, challenges, submissions", href: "/mentor/dashboard", icon: Users },
            { label: "Coding Challenges", sub: `${builtinChallengeMeta.length} built-in challenges`, href: "/challenges", icon: Code2 },
            { label: "Team Past Programs", sub: "Real competition OpMode archive", href: "/past-programs", icon: Archive },
          ].map(({ label, sub, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group dash-row flex items-center justify-between px-4 py-3.5 card-accent-hover"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 text-slate-600 group-hover:accent-text transition-colors shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">{label}</p>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{sub}</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("ftc-open-doc-search"))}
          className="dash-list-item inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition-all duration-200 hover:text-slate-300"
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          Search docs
          <kbd className="dash-search-kbd ml-0.5 text-[9px]">⌘K</kbd>
        </button>
      </div>
    </div>
  );
}

// ─── Student dashboard ─────────────────────────────────────────────────────

export default function DashboardClient({ name }: { name?: string }) {
  const local = useChallengeProgress();
  const db = useSupabaseProgress();
  const homework = useHomeworkAssignments();

  const hydrated = local.hydrated;
  const completedIds = hydrated
    ? Array.from(
        new Set([
          ...local.completedIds,
          ...(db.hydrated ? db.completedIds : []),
        ])
      )
    : [];
  const progress = local.progress;

  const attemptedCount = hydrated
    ? new Set([
        ...Object.keys(local.progress).map(Number),
        ...(db.hydrated ? db.attemptedIds : []),
      ]).size
    : 0;

  const [dbChallenges, setDbChallenges] = useState<Challenge[]>([]);
  useEffect(() => {
    const session = getSession();
    if (!session) return;

    fetchClassChallenges(session).then(setDbChallenges);
  }, []);

  const [displayName, setDisplayName] = useState<string>(name ?? "there");
  const [isMentor, setIsMentor] = useState(false);

  const syncFromSession = () => {
    const session = getSession();
    setDisplayName(name ?? session?.name ?? "there");
    setIsMentor(session?.role === "mentor");
  };

  useEffect(() => {
    syncFromSession();
    window.addEventListener("ftc-session-updated", syncFromSession);
    return () => window.removeEventListener("ftc-session-updated", syncFromSession);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (isMentor) {
    return <MentorDashboard />;
  }

  // ── Derived stats ──────────────────────────────────────────────────────
  const availableChallenges = filterOutAssigned(
    mergeChallenges(dbChallenges),
    homework.assignedIds
  );
  const { orderedChallenges } = computeDisplayNumbers(availableChallenges);
  const availableIds = new Set(availableChallenges.map((c) => c.id));

  const filteredCompletedIds = completedIds.filter((id) => availableIds.has(id));
  const completedCount = filteredCompletedIds.length;
  const totalChallenges = availableChallenges.length;

  const xpEarned = filteredCompletedIds.reduce((sum, id) => {
    const c = availableChallenges.find((ch) => ch.id === id);
    return sum + (c?.xp ?? 0);
  }, 0);

  const completedSet = new Set(filteredCompletedIds);

  const completedDates = filteredCompletedIds
    .map((id) => progress[id])
    .filter(Boolean as unknown as (v: string | undefined) => v is string);

  const streak = hydrated ? calcStreak(completedDates) : 0;

  const pct = totalChallenges > 0
    ? Math.round((completedCount / totalChallenges) * 100)
    : 0;

  const recentActivity = hydrated
    ? filteredCompletedIds
        .map((id) => ({ id, date: progress[id] }))
        .filter((x): x is { id: number; date: string } => !!x.date)
        .sort((a, b) => (a.date > b.date ? -1 : 1))
        .slice(0, 2)
        .map(({ id, date }) => {
          const challenge = availableChallenges.find((c) => c.id === id);
          return {
            label: challenge?.title ?? `Challenge #${id}`,
            time: relativeTime(date),
          };
        })
    : [];

  const nextChallenge = hydrated
    ? (() => {
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
          if (!completedSet.has(orderedChallenges[i].id)) return orderedChallenges[i];
        }
        return orderedChallenges.find((c) => !completedSet.has(c.id)) ?? null;
      })()
    : orderedChallenges[0] ?? null;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:overflow-hidden px-5 py-4 max-w-5xl mx-auto page-enter">
      <DashboardDocSearch />

      <div className="mt-4 shrink-0">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-1">{today}</p>
        <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
          Welcome back{displayName ? `, ${formatDisplayName(displayName)}` : ""}
        </h1>
      </div>

      <div className="dash-stats-card mt-4 shrink-0 p-4">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="stat-label mb-2">Challenges</p>
            <div className="flex flex-col">
              <span className="text-4xl font-black tracking-tight tabular-nums stat-hero-value">
                {hydrated ? completedCount : "—"}
              </span>
              <span className="dash-stat-sub mt-0.5">
                / {totalChallenges} challenges
              </span>
            </div>
            <div className="progress-track mt-3 w-44">
              <div
                className="progress-fill"
                style={{ width: hydrated ? `${pct}%` : "0%" }}
              />
            </div>
            <p className="progress-caption">
              {hydrated ? `${pct}% complete` : "Loading…"}
            </p>
          </div>

          <div className="flex gap-8 pb-0.5">
            <div>
              <p className="text-xl font-semibold stat-value">{hydrated ? xpEarned : "—"}</p>
              <p className="stat-label mt-1">XP earned</p>
            </div>
            <div>
              <p className="text-xl font-semibold stat-value">{hydrated ? streak : "—"}</p>
              <p className="stat-label mt-1">day streak</p>
            </div>
            <div>
              <p className="text-xl font-semibold stat-value">{hydrated ? attemptedCount : "—"}</p>
              <p className="stat-label mt-1">attempted</p>
            </div>
          </div>
        </div>
      </div>

      <DifficultyProgressStrip completedSet={completedSet} hydrated={hydrated} />

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="dash-surface-card px-4 py-3.5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-slate-600">
            Recent Activity
          </p>
          <div className="flex flex-col gap-0.5">
            {!hydrated ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                  <div className="h-3 w-3 shrink-0 rounded-full bg-slate-100/10" />
                  <div className="h-2.5 flex-1 rounded bg-slate-100/10" />
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-600">No activity yet.</p>
                <Link
                  href="/challenges"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs link-accent"
                >
                  Start a challenge <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-400">{item.label}</p>
                  <span className="shrink-0 text-[10px] text-slate-700">{item.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {hydrated && nextChallenge ? (
          <div className="dash-panel-accent p-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-slate-600">
              Up Next
            </p>
            <p className="text-sm font-medium text-slate-200">{nextChallenge.title}</p>
            <p className="mt-0.5 mb-3 line-clamp-2 text-xs text-slate-600">
              {nextChallenge.description}
            </p>
            <Link
              href={`/challenges/${nextChallenge.id}`}
              className="inline-flex items-center gap-1.5 rounded-md btn-primary px-3 py-1.5 text-xs font-semibold active:scale-[0.98]"
            >
              Start challenge <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : hydrated && !nextChallenge ? (
          <div className="dash-panel-success p-4">
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-400">All Done</span>
            </div>
            <p className="text-xs text-slate-400">
              You&apos;ve completed all available challenges.
            </p>
          </div>
        ) : (
          <div className="dash-surface-card flex items-center justify-center p-4">
            <p className="text-xs text-slate-600">Loading your next challenge…</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap gap-2">
        <DiscordLink />
      </div>
    </div>
  );
}
