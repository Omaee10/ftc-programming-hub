"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { challenges as staticChallenges } from "@/data/challenges";

interface ProgressRow {
  challenge_id: number;
  completed: boolean;
  updated_at: string;
}

interface DashboardStats {
  completedCount: number;
  totalChallenges: number;
  xpEarned: number;
  streak: number;
  attempted: number;
}

interface ActivityItem {
  label: string;
  time: string;
  type: "completed" | "started";
}

interface NextChallenge {
  id: number;
  title: string;
  description: string;
}

function calcStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(completedDates.map((d) => d.slice(0, 10)))
  ).sort((a, b) => (a > b ? -1 : 1)); // descending

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // streak must include today or yesterday to be "active"
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / 86_400_000
    );
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
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

export default function DashboardClient({ name }: { name?: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [nextChallenge, setNextChallenge] = useState<NextChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "student") {
      // No student session — show first challenge as default Up Next
      setNextChallenge({
        id: staticChallenges[0].id,
        title: staticChallenges[0].title,
        description: staticChallenges[0].description,
      });
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("student_challenge_progress")
        .select("challenge_id, completed, updated_at")
        .eq("student_id", session.id)
        .order("updated_at", { ascending: false });

      const rows: ProgressRow[] = (data as ProgressRow[]) ?? [];

      // ── Completed challenges ──────────────────────────────────────────────
      const completedRows = rows.filter((r) => r.completed);
      const completedIds = new Set(completedRows.map((r) => r.challenge_id));

      // ── XP: sum XP of completed static challenges ─────────────────────────
      const xpEarned = staticChallenges
        .filter((c) => completedIds.has(c.id))
        .reduce((sum, c) => sum + c.xp, 0);

      // ── Streak: based on days with any completed challenge activity ────────
      const streak = calcStreak(completedRows.map((r) => r.updated_at));

      // ── Stats ─────────────────────────────────────────────────────────────
      setStats({
        completedCount: completedRows.length,
        totalChallenges: staticChallenges.length,
        xpEarned,
        streak,
        attempted: rows.length,
      });

      // ── Recent activity: last 5 progress events ───────────────────────────
      const recentItems: ActivityItem[] = rows.slice(0, 5).map((r) => {
        const challenge = staticChallenges.find((c) => c.id === r.challenge_id);
        const title = challenge?.title ?? `Challenge #${r.challenge_id}`;
        return {
          label: r.completed ? `Completed: ${title}` : `Started: ${title}`,
          time: relativeTime(r.updated_at),
          type: r.completed ? "completed" : "started",
        };
      });
      setActivity(recentItems);

      // ── Next challenge: first static challenge not yet completed ──────────
      const next = staticChallenges.find((c) => !completedIds.has(c.id))
                ?? staticChallenges[0]; // fallback to first if all somehow marked done
      setNextChallenge({ id: next.id, title: next.title, description: next.description });

      setLoading(false);
    })();
  }, []);

  const displayName = name ?? getSession()?.name ?? "there";

  const statCards = stats
    ? [
        {
          label: "Challenges Completed",
          value: String(stats.completedCount),
          total: String(stats.totalChallenges),
          icon: Code2,
          color: "amber",
        },
        {
          label: "XP Earned",
          value: String(stats.xpEarned),
          total: null,
          icon: Star,
          color: "purple",
        },
        {
          label: "Current Streak",
          value: String(stats.streak),
          total: null,
          suffix: "days",
          icon: Flame,
          color: "orange",
        },
        {
          label: "Challenges Attempted",
          value: String(stats.attempted),
          total: String(stats.totalChallenges),
          icon: BookOpen,
          color: "blue",
        },
      ]
    : null;

  return (
    <div className="min-h-full px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
          Welcome back{displayName ? `, ${displayName}` : ""} 👋
        </h1>
        <p className="mt-1 text-slate-400">
          Track your progress and continue learning FTC programming.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 animate-pulse"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-800 mb-3" />
                <div className="h-6 w-16 rounded bg-slate-800 mb-1" />
                <div className="h-3 w-24 rounded bg-slate-800" />
              </div>
            ))
          : (statCards ?? []).map((stat) => {
              const colors = statColorMap[stat.color];
              const Icon = stat.icon;
              const pct =
                stat.total
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                  <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-slate-800" />
                    <div className="h-2 w-1/3 rounded bg-slate-800" />
                  </div>
                </div>
              ))
            ) : activity.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                No activity yet — start a challenge!
              </div>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  {item.type === "completed" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  )}
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
          {!loading && nextChallenge && (
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
          {!loading && !nextChallenge && (
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
