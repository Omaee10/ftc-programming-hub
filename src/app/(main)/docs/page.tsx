import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Layers } from "lucide-react";
import {
  docHref,
  docSectionCount,
  docTracks,
  docsInTrack,
  startHereDoc,
  type DocEntry,
} from "@/data/docCatalog";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Every FTC programming guide in one place — Java, the FTC SDK, driver control, autonomous pathing, and the hardware underneath it.",
};

const BADGE_CLASS: Record<DocEntry["badgeColor"], string> = {
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const NAV_BADGE_CLASS: Record<string, string> = {
  "Start Here": "bg-amber-500/15 text-amber-400",
  New: "bg-blue-500/15 text-blue-400",
};

function DocCard({ doc }: { doc: DocEntry }) {
  const Icon = doc.icon;
  const sections = docSectionCount(doc);

  return (
    <Link
      href={docHref(doc)}
      className="group flex flex-col gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 p-4 transition-all duration-200 card-accent-hover hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="dash-icon-tile flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
            <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:accent-text transition-colors" />
          </div>
          <h3 className="truncate text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
            {doc.title}
          </h3>
        </div>
        {doc.navBadge && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide ${NAV_BADGE_CLASS[doc.navBadge]}`}
          >
            {doc.navBadge}
          </span>
        )}
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
        {doc.description}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${BADGE_CLASS[doc.badgeColor]}`}
        >
          {doc.badge}
        </span>
        <div className="flex items-center gap-3 text-[11px] text-slate-700">
          {sections > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {sections} sections
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {doc.readingTime}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DocsIndexPage() {
  return (
    <div className="min-h-full px-6 py-10 max-w-4xl mx-auto page-enter">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-slate-600">
          FTC Programming Hub
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Documentation
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500">
          Every guide in one place. New to this? Start with{" "}
          <Link href={docHref(startHereDoc)} className="link-accent">
            {startHereDoc.title}
          </Link>
          , or follow the guided order on{" "}
          <Link href="/learn" className="link-accent">
            Learn
          </Link>
          .
        </p>
      </div>

      {/* ── Tracks ──────────────────────────────────────────────────────── */}
      {docTracks.map((track) => (
        <section key={track.id} className="mb-10">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-slate-200">
              {track.label}
            </h2>
            <Link
              href="/learn"
              className="flex items-center gap-1 text-[10px] link-accent"
            >
              Guided order <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="mb-4 max-w-2xl text-xs text-slate-600">
            {track.description}
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {docsInTrack(track.id).map((doc) => (
              <DocCard key={doc.slug} doc={doc} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
