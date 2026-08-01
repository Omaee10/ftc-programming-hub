import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Archive,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Cpu,
  FileCode,
  Tag,
} from "lucide-react";

import { getProgramById, pastProgramCatalog, categoryColors } from "@/data/pastPrograms";
import ArchiveBackLink from "@/components/ArchiveBackLink";
import CodeBlock from "@/components/CodeBlock";

// ─── Static generation ────────────────────────────────────────────────────────

export function generateStaticParams() {
  return pastProgramCatalog.map((p) => ({ programId: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ programId: string }>;
}): Promise<Metadata> {
  const { programId } = await params;
  const program = getProgramById(programId);
  if (!program) return { title: "Not Found" };
  return {
    title: `${program.name} — FTC Hub`,
    description: program.summary,
  };
}

// ─── Inline description renderer ─────────────────────────────────────────────

function DescriptionBlock({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
      {text.split("\n\n").map((block, i) => {
        // Fenced code blocks  ```...```
        if (block.startsWith("```") && block.endsWith("```")) {
          const inner = block.slice(3, -3).replace(/^\w+\n/, "");
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs text-slate-300 leading-relaxed"
            >
              {inner}
            </pre>
          );
        }

        const parts = block.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**"))
                return (
                  <strong key={j} className="font-semibold text-slate-200">
                    {part.slice(2, -2)}
                  </strong>
                );
              if (part.startsWith("`") && part.endsWith("`"))
                return (
                  <code
                    key={j}
                    className="rounded bg-zinc-200/10 px-1 py-0.5 font-mono text-[0.78rem] text-zinc-200 border border-zinc-200/15"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const program = getProgramById(programId);
  if (!program) notFound();

  const colors = categoryColors[program.category];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 lg:px-8 space-y-6 page-enter">
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-600">
        <ArchiveBackLink className="flex items-center gap-1 hover:text-slate-300 transition-colors">
          <Archive className="h-3 w-3" />
          Past Programs
        </ArchiveBackLink>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-400">{program.name}</span>
      </nav>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-100">{program.name}</h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colors.border} ${colors.bg} ${colors.text}`}
            >
              {program.category}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {program.season}
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1 font-mono">
              <FileCode className="h-3 w-3" />
              {program.filename}
            </span>
          </div>
        </div>

        <ArchiveBackLink className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-all">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to archive
        </ArchiveBackLink>
      </div>

      {/* ── Tags ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {program.tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-500"
          >
            <Tag className="h-2.5 w-2.5" />
            {tag}
          </span>
        ))}
      </div>

      {/* ── Main two-column layout ────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        {/* ── LEFT: Description + hardware map ────────────────────────────── */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* Description */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              About This Program
            </h2>
            <DescriptionBlock text={program.description} />
          </section>

          {/* Hardware map */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Hardware Map
              </h2>
              <span className="ml-auto text-[10px] text-slate-700">
                {program.hardware.length} device{program.hardware.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Exact configuration names used in the Driver Station Robot
              Configuration file. Adapt these strings to match your own build.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-1.5 pr-4 text-left font-semibold text-slate-600 whitespace-nowrap">
                      Config Name
                    </th>
                    <th className="pb-1.5 pr-4 text-left font-semibold text-slate-600 whitespace-nowrap">
                      Type
                    </th>
                    <th className="pb-1.5 text-left font-semibold text-slate-600">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {program.hardware.map((d, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-800/40 last:border-0"
                    >
                      <td className="py-2 pr-4 font-mono text-zinc-200/80 whitespace-nowrap">
                        {d.configName}
                      </td>
                      <td className="py-2 pr-4 font-mono text-zinc-300/80 whitespace-nowrap">
                        {d.type}
                      </td>
                      <td className="py-2 text-slate-500 leading-snug">
                        {d.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ── RIGHT: Syntax-highlighted code ──────────────────────────────── */}
        <div className="min-w-0">
          <CodeBlock
            code={program.code}
            lang="java"
            filename={program.filename}
          />
        </div>
      </div>
    </div>
  );
}
