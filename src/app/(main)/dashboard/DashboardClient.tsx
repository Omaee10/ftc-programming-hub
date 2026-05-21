"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Code2,
  Star,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  GitBranch,
  Navigation,
  ChevronRight,
  Flame,
  Users,
  ClipboardList,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { challenges as staticChallenges } from "@/data/challenges";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import { supabase } from "@/lib/supabase";

function calcStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(completedDates.map((d) => d.slice(0, 10)))
  ).sort((a, b) => (a > b ? -1 : 1)); // descending

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

const quickLinks = [
  {
    title: "goBILDA Hardware",
    description: "Motors, servos, and structural components",
    href: "/docs/gobilda",
    icon: Cpu,
    tag: "Hardware",
    tagColor: "amber",
  },
  {
    title: "REV Robotics",
    description: "Control Hub, Expansion Hub, and electronics",
    href: "/docs/rev-robotics",
    icon: Zap,
    tag: "Electronics",
    tagColor: "blue",
  },
  {
    title: "Road Runner",
    description: "Trajectory-based autonomous motion",
    href: "/docs/road-runner",
    icon: GitBranch,
    tag: "Autonomous",
    tagColor: "violet",
  },
  {
    title: "Pedro Pathing",
    description: "Follower-based path-following library",
    href: "/docs/pedro-pathing",
    icon: Navigation,
    tag: "Autonomous",
    tagColor: "emerald",
  },
];

const tagColorMap: Record<string, string> = {
  amber: "bg-white/8 text-zinc-100 border-white/15",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  violet: "bg-white/6 text-zinc-300 border-white/12",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const statColorMap: Record<string, { icon: string; ring: string; bar: string }> = {
  amber:   { icon: "bg-white/8 text-zinc-100",            ring: "border-white/15",          bar: "bg-zinc-300"    },
  blue:    { icon: "bg-blue-500/10 text-blue-400",        ring: "border-blue-500/20",        bar: "bg-blue-400"    },
  purple:  { icon: "bg-purple-500/10 text-purple-400",    ring: "border-purple-500/20",      bar: "bg-purple-400"  },
  emerald: { icon: "bg-emerald-500/10 text-emerald-400",  ring: "border-emerald-500/20",     bar: "bg-emerald-400" },
  orange:  { icon: "bg-orange-500/10 text-orange-400",    ring: "border-orange-500/20",      bar: "bg-orange-400"  },
};

// ─── Mentor dashboard ──────────────────────────────────────────────────────

function MentorDashboard({ displayName }: { displayName: string }) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [challengeCount, setChallengeCount] = useState<number | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    (async () => {
      const [{ count: pending }, { count: students }, { count: challenges }] =
        await Promise.all([
          supabase
            .from("challenge_submissions")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("mentor_id", session.id),
          supabase
            .from("challenges")
            .select("id", { count: "exact", head: true })
            .eq("created_by", session.id),
        ]);
      setPendingCount(pending ?? 0);
      setStudentCount(students ?? 0);
      setChallengeCount(challenges ?? 0);
    })();
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hasPending = pendingCount !== null && pendingCount > 0;

  return (
    <div className="min-h-full px-8 py-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm text-slate-600 mb-1.5 tracking-wide">{today}</p>
        <h1 className="text-3xl font-semibold text-slate-100 tracking-tight">
          {displayName}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-5">
          {/* Stat row */}
          <div className="grid grid-cols-3 divide-x divide-slate-800 border border-slate-800 rounded-xl bg-slate-900">
            {[
              { label: "Students", value: studentCount },
              { label: "Pending Review", value: pendingCount, highlight: hasPending },
              { label: "Challenges Created", value: challengeCount },
            ].map((s) => (
              <div key={s.label} className="px-6 py-6">
                <p className={`text-3xl font-semibold tabular-nums ${s.highlight ? "text-amber-400" : "text-slate-100"}`}>
                  {s.value !== null ? s.value : "—"}
                </p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Submissions callout */}
          {hasPending ? (
            <Link
              href="/mentor/dashboard"
              className="group flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 px-6 py-5 hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <ClipboardList className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-base font-medium text-slate-200">
                    {pendingCount} submission{pendingCount !== 1 ? "s" : ""} waiting for review
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">Open mentor portal to grade</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </Link>
          ) : (
            pendingCount !== null && (
              <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 px-6 py-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <p className="text-base text-slate-400">All submissions reviewed — nothing pending.</p>
              </div>
            )
          )}

          {/* Info strip */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-5">
            <p className="text-xs text-slate-600 mb-4 uppercase tracking-widest font-medium">About this workspace</p>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-700 shrink-0" />
                Students join using the 6-character code you share with them.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-700 shrink-0" />
                Custom challenges you create are only visible to your students.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-700 shrink-0" />
                Submissions appear in your portal once a student submits for review.
              </li>
            </ul>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <p className="text-xs text-slate-600 uppercase tracking-widest font-medium mb-4">Quick access</p>
          <div className="space-y-px rounded-xl border border-slate-800 overflow-hidden">
            {[
              { label: "Mentor Portal", sub: "Students, challenges, submissions", href: "/mentor/dashboard", icon: Users },
              { label: "Coding Challenges", sub: "53 built-in challenges", href: "/challenges", icon: Code2 },
              { label: "Documentation", sub: "Hardware, SDK, motion libraries", href: "/docs/gobilda", icon: BookOpen },
            ].map(({ label, sub, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between bg-slate-900 hover:bg-slate-800 px-5 py-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Icon className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
                  <div>
                    <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors font-medium">{label}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Student dashboard ─────────────────────────────────────────────────────

export default function DashboardClient({ name }: { name?: string }) {
  const local = useChallengeProgress();
  const db = useSupabaseProgress();

  // Merge localStorage + Supabase completions (same pattern as ChallengesClient)
  const hydrated = local.hydrated && db.hydrated;
  const completedIds = hydrated
    ? Array.from(new Set([...local.completedIds, ...db.completedIds]))
    : [];
  const completedCount = completedIds.length;
  const progress = local.progress;

  // Defer localStorage read to after mount to avoid SSR/client hydration mismatch.
  // Server always renders "there"; client updates to the real name after hydration.
  const [displayName, setDisplayName] = useState<string>(name ?? "there");
  const [isMentor, setIsMentor] = useState(false);
  useEffect(() => {
    const session = getSession();
    setDisplayName(name ?? session?.name ?? "there");
    setIsMentor(session?.role === "mentor");
  }, [name]);

  if (isMentor) {
    return <MentorDashboard displayName={displayName} />;
  }

  // ── Derived stats (recalculate whenever progress changes) ──────────────
  const totalChallenges = staticChallenges.length;

  const xpEarned = staticChallenges
    .filter((c) => completedIds.includes(c.id))
    .reduce((sum, c) => sum + c.xp, 0);

  const completedSet = new Set(completedIds);

  const completedDates = completedIds
    .map((id) => progress[id])
    .filter(Boolean as unknown as (v: string | undefined) => v is string);

  const streak = hydrated ? calcStreak(completedDates) : 0;

  // Last 5 completions — only show ones with a known timestamp
  const recentActivity = hydrated
    ? completedIds
        .map((id) => ({ id, date: progress[id] }))
        .filter((x): x is { id: number; date: string } => !!x.date)
        .sort((a, b) => (a.date > b.date ? -1 : 1))
        .slice(0, 5)
        .map(({ id, date }) => {
          const challenge = staticChallenges.find((c) => c.id === id);
          return {
            label: `Completed: ${challenge?.title ?? `Challenge #${id}`}`,
            time: relativeTime(date),
            type: "completed" as const,
          };
        })
    : [];

  const nextChallenge = hydrated
    ? staticChallenges.find((c) => !completedSet.has(c.id)) ?? null
    : staticChallenges[0];

  const statCards = [
    {
      label: "Challenges Completed",
      value: hydrated ? String(completedCount) : "—",
      total: String(totalChallenges),
      icon: Code2,
      color: "amber",
    },
    {
      label: "XP Earned",
      value: hydrated ? String(xpEarned) : "—",
      total: null,
      icon: Star,
      color: "purple",
    },
    {
      label: "Current Streak",
      value: hydrated ? String(streak) : "—",
      total: null,
      suffix: "days",
      icon: Flame,
      color: "orange",
    },
    {
      label: "Challenges Attempted",
      value: hydrated ? String(completedCount) : "—",
      total: String(totalChallenges),
      icon: BookOpen,
      color: "blue",
    },
  ];

  return (
    <div className="min-h-full px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
          Welcome back{displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="mt-1 text-slate-400">
          Track your progress and continue learning FTC programming.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {statCards.map((stat) => {
              const colors = statColorMap[stat.color];
              const Icon = stat.icon;
              const pct =
                stat.total && stat.value !== "—"
                  ? Math.round(
                      (parseInt(stat.value) / parseInt(stat.total)) * 100
                    )
                  : null;

              return (
                <div
                  key={stat.label}
                  className={`rounded-xl border ${colors.ring} bg-slate-900 p-4`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`rounded-lg p-2 ${colors.icon}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {pct !== null && (
                      <span className="text-xs font-medium text-slate-500">
                        {pct}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-slate-100">
                      {stat.value}
                    </span>
                    {stat.total && (
                      <span className="text-sm text-slate-600">
                        / {stat.total}
                      </span>
                    )}
                    {"suffix" in stat && stat.suffix && (
                      <span className="text-sm text-slate-500">
                        {stat.suffix}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
                  {pct !== null && (
                    <div className="mt-3 h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick links */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Documentation
            </h2>
            <Link
              href="/docs/gobilda"
              className="text-xs text-zinc-300 hover:text-zinc-100 flex items-center gap-1 transition-colors"
            >
              Browse all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg border border-slate-700/60 bg-slate-800 p-2">
                      <Icon className="h-4 w-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tagColorMap[link.tagColor]}`}
                    >
                      {link.tag}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {link.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {link.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
                    <span>Read docs</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Recent Activity
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
            {!hydrated ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                  <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-slate-800" />
                    <div className="h-2 w-1/3 rounded bg-slate-800" />
                  </div>
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                No activity yet — start a challenge!
              </div>
            ) : (
              recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Next challenge CTA */}
          {hydrated && nextChallenge && (
            <div className="mt-4 rounded-xl border border-white/15 bg-white/4 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Code2 className="h-4 w-4 text-zinc-100" />
                <span className="text-xs font-semibold text-zinc-100 uppercase tracking-wide">
                  Up Next
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {nextChallenge.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 mb-3 line-clamp-2">
                {nextChallenge.description}
              </p>
              <Link
                href={`/challenges/${nextChallenge.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-white transition-colors"
              >
                Start Challenge <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          {hydrated && !nextChallenge && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                  All Done!
                </span>
              </div>
              <p className="text-sm text-slate-300">
                You&apos;ve completed all available challenges. Check back soon for new ones.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
