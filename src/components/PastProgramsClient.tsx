"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Calendar,
  Code2,
  Eye,
  FileCode,
  Filter,
  Tag,
} from "lucide-react";
import {
  pastPrograms,
  categoryColors,
  type ProgramCategory,
} from "@/data/pastPrograms";

const ALL = "All" as const;
type FilterValue = typeof ALL | ProgramCategory;

const FILTERS: FilterValue[] = [
  ALL,
  "TeleOp",
  "Autonomous",
  "Vision / Diagnostics",
  "Subsystem Tuning",
];

export default function PastProgramsClient() {
  const [active, setActive] = useState<FilterValue>(ALL);

  const visible =
    active === ALL
      ? pastPrograms
      : pastPrograms.filter((p) => p.category === active);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
            <Archive className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Team Past Programs
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Open-source archive of our team&apos;s actual competition code from the
          2025–26 <span className="text-slate-300 font-medium">DECODE</span> season.
          Study real-world OpModes covering full TeleOp orchestration, Pedro
          Pathing autonomous, Limelight 3A vision, and subsystem tuning.
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 pt-1">
          {(
            [
              { label: "Programs", value: pastPrograms.length, icon: FileCode, color: "text-amber-400" },
              { label: "Season",   value: "2025–26",           icon: Calendar, color: "text-blue-400"  },
              { label: "Language", value: "Java",              icon: Code2,    color: "text-violet-400"},
            ] as const
          ).map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5"
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className="text-xs text-slate-500">{label}:</span>
              <span className="text-xs font-semibold text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category filter ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mr-1">
          <Filter className="h-3 w-3" />
          Filter:
        </div>
        {FILTERS.map((f) => {
          const isAll = f === ALL;
          const colors = isAll ? null : categoryColors[f as ProgramCategory];
          const isActive = active === f;
          return (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                isActive
                  ? isAll
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : `${colors!.border} ${colors!.bg} ${colors!.text}`
                  : "border-slate-800 bg-slate-900/40 text-slate-500 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              {f}
              {f !== ALL && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  ({pastPrograms.filter((p) => p.category === f).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Program grid ──────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <p className="text-sm text-slate-600 italic">No programs in this category.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
          {visible.map((program) => {
            const colors = categoryColors[program.category];
            return (
              <Link
                key={program.id}
                href={`/past-programs/${program.id}`}
                className="group relative flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900 hover:shadow-lg hover:shadow-black/20"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colors.border} ${colors.bg}`}>
                      <FileCode className={`h-4 w-4 ${colors.text}`} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {program.name}
                      </h2>
                      <p className="font-mono text-[11px] text-slate-600 truncate">
                        {program.filename}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors.border} ${colors.bg} ${colors.text}`}
                  >
                    {program.category}
                  </span>
                </div>

                {/* Season */}
                <div className="flex items-center gap-1.5 mb-3">
                  <Calendar className="h-3 w-3 text-slate-600 shrink-0" />
                  <span className="text-xs text-slate-500">{program.season}</span>
                </div>

                {/* Summary */}
                <p className="flex-1 text-xs leading-relaxed text-slate-400 mb-4">
                  {program.summary}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {program.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-500"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                  {program.tags.length > 4 && (
                    <span className="text-[10px] text-slate-700 self-center">
                      +{program.tags.length - 4} more
                    </span>
                  )}
                </div>

                {/* Footer CTA */}
                <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <BookOpen className="h-3 w-3" />
                    {program.hardware.length} hardware devices
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-3 w-3" />
                    View code
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Attribution footer ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 px-5 py-4 flex items-start gap-3">
        <Archive className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed text-slate-600">
          All programs originate from the team&apos;s{" "}
          <span className="text-slate-500">v7 competition codebase</span> and are
          published here for educational purposes. Hardware configuration names
          (e.g.{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-400">
            front_left
          </code>
          ,{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-400">
            shooter_motor
          </code>
          ) are the exact strings used in the Driver Station Robot Configuration
          file — adapt them to match your own hardware map.
        </p>
      </div>
    </div>
  );
}
