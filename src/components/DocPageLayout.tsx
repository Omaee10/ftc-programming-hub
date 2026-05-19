import Link from "next/link";
import { ChevronRight, Clock, Hash } from "lucide-react";
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
    <div className="min-h-full px-6 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 mb-6 text-xs text-slate-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-slate-700" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-slate-300 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-300 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex gap-12">
          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            {/* Page header */}
            <div className="mb-10 pb-8 border-b border-slate-800/80">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {badge && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeColorMap[badgeColor]}`}
                  >
                    {badge}
                  </span>
                )}
                {readingTime && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {readingTime} read
                  </span>
                )}
              </div>
              <h1 className="text-[2rem] font-bold text-slate-50 tracking-tight leading-tight mb-3">
                {title}
              </h1>
              <p className="text-slate-400 leading-relaxed text-[0.9375rem] max-w-2xl">
                {description}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-14">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-20">
                  <div className="flex items-center gap-3 mb-6">
                    <a
                      href={`#${section.id}`}
                      className="group flex items-center gap-2 text-slate-100 hover:text-amber-400 transition-colors"
                    >
                      <Hash className="h-4 w-4 text-slate-700 group-hover:text-amber-400/70 transition-colors shrink-0" />
                      <h2 className="text-xl font-semibold tracking-tight">
                        {section.title}
                      </h2>
                    </a>
                  </div>
                  <div className="doc-content">{section.content}</div>
                </section>
              ))}
            </div>

            {/* Bottom navigation placeholder */}
            <div className="mt-16 pt-6 border-t border-slate-800/80">
              <p className="text-xs text-slate-600">
                Found an error or want to contribute? Edit this page on GitHub.
              </p>
            </div>
          </div>

          {/* ── Sticky ToC ── */}
          <aside className="hidden xl:block w-52 shrink-0">
            <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto sidebar-scroll">
              <TocSidebar items={tocItems} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
