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
  Cpu,
  GitBranch,
  Navigation,
  Flame,
  Users,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { challenges as staticChallenges, difficultyOrder } from "@/data/challenges";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useSupabaseProgress } from "@/hooks/useSupabaseProgress";
import { supabase } from "@/lib/supabase";

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

const quickLinks = [
  {
    title: "goBILDA Hardware",
    description: "Motors, servos, structural components",
    href: "/docs/gobilda",
    icon: Cpu,
  },
  {
    title: "REV Robotics",
    description: "Control Hub, Expansion Hub, electronics",
    href: "/docs/rev-robotics",
    icon: Zap,
  },
  {
    title: "Road Runner",
    description: "Trajectory-based autonomous motion",
    href: "/docs/road-runner",
    icon: GitBranch,
  },
  {
    title: "Pedro Pathing",
    description: "Follower-based path-following library",
    href: "/docs/pedro-pathing",
    icon: Navigation,
  },
];

// ─── Mentor dashboard ──────────────────────────────────────────────────────

function MentorDashboard({ displayName }: { displayName: string }) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [challengeCount, setChallengeCount] = useState<number | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    const ownerId = session.parentMentorId ?? session.id;
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
            .eq("mentor_id", ownerId),
          supabase
            .from("challenges")
            .select("id", { count: "exact", head: true })
            .eq("created_by", ownerId),
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
    <div className="min-h-full px-8 py-10 max-w-5xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">{today}</p>
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
          {displayName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening in your class today.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stat row — open, no card box */}
          <div className="grid grid-cols-3 divide-x divide-slate-800/80 pb-6 border-b border-slate-800/60">
            {[
              { label: "Students", value: studentCount },
              { label: "Pending Review", value: pendingCount, highlight: hasPending },
              { label: "Challenges Created", value: challengeCount },
            ].map((s) => (
              <div key={s.label} className="px-0 first:pl-0 pl-6">
                <p className={`text-3xl font-semibold stat-number ${s.highlight ? "text-amber-400" : "text-slate-100"}`}>
                  {s.value !== null ? s.value : "—"}
                </p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Submissions callout */}
          {hasPending ? (
            <Link
              href="/mentor/dashboard"
              className="group flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-5 py-4 hover:bg-amber-500/8 hover:border-amber-500/30 transition-all duration-200"
            >
              <div className="flex items-center gap-3.5">
                <ClipboardList className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {pendingCount} submission{pendingCount !== 1 ? "s" : ""} waiting for review
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Open mentor portal to grade</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </Link>
          ) : (
            pendingCount !== null && (
              <div className="flex items-center gap-3.5 rounded-lg border border-slate-800/80 bg-slate-900/50 px-5 py-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-sm text-slate-400">All submissions reviewed — nothing pending.</p>
              </div>
            )
          )}

          {/* Info strip */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-3 font-medium">How it works</p>
            <ul className="space-y-2.5">
              {[
                "Students join using the 6-character code you share with them.",
                "Custom challenges you create are only visible to your students.",
                "Submissions appear in your portal once a student submits for review.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-500">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-700 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <p className="text-[11px] uppercase tracking-widest text-slate-600 font-medium mb-3">Quick access</p>
          <div className="rounded-lg border border-slate-800/80 overflow-hidden divide-y divide-slate-800/60">
            {[
              { label: "Mentor Portal", sub: "Students, challenges, submissions", href: "/mentor/dashboard", icon: Users },
              { label: "Coding Challenges", sub: "53 built-in challenges", href: "/challenges", icon: Code2 },
              { label: "Documentation", sub: "Hardware, SDK, motion libraries", href: "/docs/gobilda", icon: BookOpen },
            ].map(({ label, sub, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between bg-slate-900/40 hover:accent-bg-subtle px-4 py-3.5 transition-all duration-150"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-slate-600 group-hover:accent-text transition-colors shrink-0" />
                  <div>
                    <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">{label}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
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

  const hydrated = local.hydrated && db.hydrated;
  const completedIds = hydrated
    ? Array.from(new Set([...local.completedIds, ...db.completedIds]))
    : [];
  const completedCount = completedIds.length;
  const progress = local.progress;

  const attemptedCount = hydrated
    ? new Set([
        ...Object.keys(local.progress).map(Number),
        ...db.attemptedIds,
      ]).size
    : 0;

  const [dbChallengeXP, setDbChallengeXP] = useState<Record<number, number>>({});
  useEffect(() => {
    const session = getSession();
    if (!session) return;
    const mentorOwnerId = session.role === "mentor"
      ? (session.parentMentorId ?? session.id)
      : session.mentorId ?? null;

    if (!mentorOwnerId) return;

    supabase
      .from("challenges")
      .select("id, xp")
      .eq("created_by", mentorOwnerId)
      .then(({ data }) => {
        if (data) {
          const map: Record<number, number> = {};
          data.forEach((r: { id: number; xp: number }) => { map[r.id] = r.xp; });
          setDbChallengeXP(map);
        }
      });
  }, []);

  const [displayName, setDisplayName] = useState<string>(name ?? "there");
  const [isMentor, setIsMentor] = useState(false);

  const syncFromSession = () => {
    const session = getSession();
    const resolvedName = session?.role === "mentor"
      ? (session?.teamName || session?.name)
      : session?.name;
    setDisplayName(name ?? resolvedName ?? "there");
    setIsMentor(session?.role === "mentor");
  };

  useEffect(() => {
    syncFromSession();
    window.addEventListener("ftc-session-updated", syncFromSession);
    return () => window.removeEventListener("ftc-session-updated", syncFromSession);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (isMentor) {
    return <MentorDashboard displayName={displayName} />;
  }

  // ── Derived stats ──────────────────────────────────────────────────────
  const totalChallenges = staticChallenges.length;

  const xpEarned = completedIds.reduce((sum, id) => {
    const staticC = staticChallenges.find((c) => c.id === id);
    return sum + (staticC?.xp ?? dbChallengeXP[id] ?? 0);
  }, 0);

  const completedSet = new Set(completedIds);

  const completedDates = completedIds
    .map((id) => progress[id])
    .filter(Boolean as unknown as (v: string | undefined) => v is string);

  const streak = hydrated ? calcStreak(completedDates) : 0;

  const pct = totalChallenges > 0
    ? Math.round((completedCount / totalChallenges) * 100)
    : 0;

  const recentActivity = hydrated
    ? completedIds
        .map((id) => ({ id, date: progress[id] }))
        .filter((x): x is { id: number; date: string } => !!x.date)
        .sort((a, b) => (a.date > b.date ? -1 : 1))
        .slice(0, 5)
        .map(({ id, date }) => {
          const challenge = staticChallenges.find((c) => c.id === id);
          return {
            label: challenge?.title ?? `Challenge #${id}`,
            time: relativeTime(date),
          };
        })
    : [];

  const orderedChallenges = difficultyOrder.flatMap((diff) =>
    staticChallenges.filter((c) => c.difficulty === diff)
  );

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
    <div className="min-h-full px-6 py-10 max-w-5xl mx-auto page-enter">
      {/* ── Hero — open, no card ───────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">{today}</p>
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
          Welcome back{displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {hydrated && completedCount > 0
            ? `${completedCount} of ${totalChallenges} challenges done. Keep going.`
            : "Start your first challenge to track your progress."}
        </p>
      </div>

      {/* ── Progress feature ─────────────────────────────────────────────── */}
      <div className="mb-10 pb-10 border-b border-slate-800/60">
        <div className="flex flex-wrap items-end gap-8">
          {/* Primary stat */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-1.5">Challenges</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold stat-number accent-stat">
                {hydrated ? completedCount : "—"}
              </span>
              <span className="text-xl text-slate-700 font-light">/ {totalChallenges}</span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-0.5 w-52 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full accent-fill transition-all duration-700"
                style={{ width: hydrated ? `${pct}%` : "0%" }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-700">
              {hydrated ? `${pct}% complete` : "Loading…"}
            </p>
          </div>

          {/* Supporting stats */}
          <div className="flex gap-8 pb-1">
            <div>
              <p className="text-2xl font-semibold stat-number text-purple-400">
                {hydrated ? xpEarned : "—"}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">XP earned</p>
            </div>
            <div>
              <p className="text-2xl font-semibold stat-number text-orange-400">
                {hydrated ? streak : "—"}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">day streak</p>
            </div>
            <div>
              <p className="text-2xl font-semibold stat-number text-blue-400">
                {hydrated ? attemptedCount : "—"}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">attempted</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Documentation quick links */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] uppercase tracking-widest text-slate-600 font-medium">
              Documentation
            </p>
            <Link
              href="/docs/gobilda"
              className="text-xs link-accent flex items-center gap-1 transition-colors"
            >
              Browse all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Open list style — no card boxes */}
          <div className="divide-y divide-slate-800/60">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-4 py-3.5 card-accent-hover transition-all duration-150"
                >
                  <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-slate-900 border border-slate-800/80 group-hover:accent-border transition-colors">
                    <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:accent-text transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors truncate">
                      {link.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">
                      {link.description}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-500 shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>

          {/* All challenges link */}
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <Link
              href="/challenges"
              className="group flex items-center justify-between rounded-md accent-bg-subtle border accent-border-subtle px-4 py-3 card-accent-hover transition-all duration-150"
            >
              <div className="flex items-center gap-3">
                <Code2 className="h-4 w-4 text-slate-500 group-hover:accent-text transition-colors" />
                <div>
                  <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                    Coding Challenges
                  </p>
                  <p className="text-xs text-slate-600">53 challenges across 3 difficulty levels</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Right: recent activity + next challenge */}
        <div className="space-y-4">
          {/* Recent activity */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-slate-600 font-medium mb-3">
              Recent Activity
            </p>
            <div className="space-y-0.5">
              {!hydrated ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
                    <div className="h-3 w-3 rounded-full bg-slate-800 shrink-0" />
                    <div className="flex-1 h-2.5 rounded bg-slate-800" />
                  </div>
                ))
              ) : recentActivity.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-600">No activity yet.</p>
                  <Link
                    href="/challenges"
                    className="mt-2 inline-flex items-center gap-1 text-xs link-accent transition-colors"
                  >
                    Start a challenge <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    <p className="flex-1 min-w-0 text-xs text-slate-400 truncate">
                      {item.label}
                    </p>
                    <span className="text-[10px] text-slate-700 shrink-0">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Next challenge */}
          {hydrated && nextChallenge && (
            <div className="rounded-lg border accent-border-subtle accent-bg-subtle p-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-600 font-medium mb-2.5">
                Up Next
              </p>
              <p className="text-sm font-medium text-slate-200">
                {nextChallenge.title}
              </p>
              <p className="text-xs text-slate-600 mt-0.5 mb-3 line-clamp-2">
                {nextChallenge.description}
              </p>
              <Link
                href={`/challenges/${nextChallenge.id}`}
                className="inline-flex items-center gap-1.5 rounded-md btn-primary px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.98]"
              >
                Start challenge <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {hydrated && !nextChallenge && (
            <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-400">All Done</span>
              </div>
              <p className="text-xs text-slate-400">
                You&apos;ve completed all available challenges.
              </p>
            </div>
          )}

          {/* Sidebar stats */}
          <div className="pt-2">
            <p className="text-[11px] uppercase tracking-widest text-slate-600 font-medium mb-3">
              Quick Stats
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Star, label: "XP", value: hydrated ? xpEarned : "—", color: "text-purple-400" },
                { icon: Flame, label: "Streak", value: hydrated ? `${streak}d` : "—", color: "text-orange-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-md border border-slate-800/60 bg-slate-900/40 px-3 py-2.5">
                  <p className={`text-lg font-semibold stat-number ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
