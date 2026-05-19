import type { Metadata } from "next";
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
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

const stats = [
  {
    label: "Challenges Completed",
    value: "3",
    total: "12",
    icon: Code2,
    color: "amber",
  },
  {
    label: "Docs Sections Read",
    value: "7",
    total: "24",
    icon: BookOpen,
    color: "blue",
  },
  {
    label: "XP Earned",
    value: "420",
    total: null,
    icon: Star,
    color: "purple",
  },
  {
    label: "Current Streak",
    value: "5",
    total: null,
    suffix: "days",
    icon: Zap,
    color: "emerald",
  },
];

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
    tag: "New",
    tagColor: "emerald",
  },
];

const recentActivity = [
  {
    type: "completed",
    label: "Completed: Hello Robot challenge",
    time: "2h ago",
  },
  {
    type: "read",
    label: "Read: REV Control Hub setup guide",
    time: "Yesterday",
  },
  {
    type: "completed",
    label: "Completed: Encoder basics challenge",
    time: "3 days ago",
  },
  {
    type: "read",
    label: "Read: goBILDA motor overview",
    time: "1 week ago",
  },
];

const tagColorMap: Record<string, string> = {
  amber: "bg-white/8 text-zinc-100 border-white/15",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  violet: "bg-white/6 text-zinc-300 border-white/12",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const statColorMap: Record<
  string,
  { icon: string; ring: string; bar: string }
> = {
  amber: {
    icon: "bg-white/8 text-zinc-100",
    ring: "border-white/15",
    bar: "bg-zinc-300",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-400",
    ring: "border-blue-500/20",
    bar: "bg-blue-400",
  },
  purple: {
    icon: "bg-purple-500/10 text-purple-400",
    ring: "border-purple-500/20",
    bar: "bg-purple-400",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-400",
    ring: "border-emerald-500/20",
    bar: "bg-emerald-400",
  },
};

export default function DashboardPage() {
  return (
    <div className="min-h-full px-6 py-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
          Welcome back 👋
        </h1>
        <p className="mt-1 text-slate-400">
          Track your progress and continue learning FTC programming.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {stats.map((stat) => {
          const colors = statColorMap[stat.color];
          const Icon = stat.icon;
          const pct = stat.total
            ? Math.round((parseInt(stat.value) / parseInt(stat.total)) * 100)
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
                  <span className="text-sm text-slate-600">/ {stat.total}</span>
                )}
                {stat.suffix && (
                  <span className="text-sm text-slate-500">{stat.suffix}</span>
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
        {/* Quick links — 2/3 width */}
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

        {/* Recent activity — 1/3 width */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Recent Activity
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
            {recentActivity.map((item, i) => (
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
            ))}
          </div>

          {/* Next challenge CTA */}
          <div className="mt-4 rounded-xl border border-white/15 bg-white/4 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="h-4 w-4 text-zinc-100" />
              <span className="text-xs font-semibold text-zinc-100 uppercase tracking-wide">
                Up Next
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-200">
              PID Controller Basics
            </p>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">
              Implement a simple PID loop for motor control.
            </p>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-white transition-colors"
            >
              Start Challenge <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
