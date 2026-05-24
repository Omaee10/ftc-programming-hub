import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import TocSidebar, { type TocItem } from "./TocSidebar";

export interface DocSection {
  /** Stable kebab-case anchor used by the ToC. */
  id: string;
  title: string;
  content: React.ReactNode;
}

interface DocPageLayoutProps {
  breadcrumbs: { label: string; href?: string }[];
  title: string;
  description: string;
  badge?: string;
  badgeColor?: "amber" | "blue" | "violet" | "emerald";
  readingTime?: string;
  sections: DocSection[];
}

const badgeColorMap: Record<string, string> = {
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function DocPageLayout({
  breadcrumbs,
  title,
  description,
  badge,
  badgeColor = "amber",
  readingTime,
  sections,
}: DocPageLayoutProps) {
  const tocItems: TocItem[] = sections.map((s) => ({
    label: s.title,
    anchor: s.id,
  }));

  return (
    <div className="min-h-full px-6 py-10 page-enter">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 mb-8 text-xs text-slate-600">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-slate-800" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="link-accent hover:text-slate-400 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-400">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex gap-14">
          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            {/* Page header */}
            <div className="mb-12 pb-8 border-b border-slate-800/60">
              <div className="flex flex-wrap items-center gap-2.5 mb-5">
                {badge && (
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${badgeColorMap[badgeColor]}`}
                  >
                    {badge}
                  </span>
                )}
                {readingTime && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                    <Clock className="h-3 w-3" />
                    {readingTime} read
                  </span>
                )}
              </div>
              <h1 className="text-[1.875rem] font-semibold text-slate-50 tracking-tight leading-tight mb-4">
                {title}
              </h1>
              <p className="text-slate-400 leading-relaxed text-[0.9375rem] max-w-2xl">
                {description}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-16">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <div className="mb-6">
                    <a
                      href={`#${section.id}`}
                      className="group inline-flex items-center gap-2 text-slate-100 hover:accent-text transition-colors"
                    >
                      <h2 className="text-lg font-semibold tracking-tight">
                        {section.title}
                      </h2>
                      <span className="text-slate-700 group-hover:accent-text transition-colors text-xs">#</span>
                    </a>
                  </div>
                  <div className="doc-content">{section.content}</div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-20 pt-6 border-t border-slate-800/60">
              <p className="text-xs text-slate-700">
                Found an error or want to contribute? Reach out to the team.
              </p>
            </div>
          </div>

          {/* ── Sticky ToC ── */}
          <aside className="hidden xl:block w-48 shrink-0">
            <div className="sticky top-10 max-h-[calc(100vh-5rem)] overflow-y-auto sidebar-scroll">
              <TocSidebar items={tocItems} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
