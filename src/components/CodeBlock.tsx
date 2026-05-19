import { getHighlighter, type SupportedLang } from "@/lib/highlighter";
import CopyButton from "./CopyButton";

interface CodeBlockProps {
  code: string;
  lang?: SupportedLang;
  filename?: string;
}

export default async function CodeBlock({
  code,
  lang = "java",
  filename,
}: CodeBlockProps) {
  const hl = await getHighlighter();
  const trimmed = code.trim();
  const html = hl.codeToHtml(trimmed, { lang, theme: "github-dark" });

  return (
    <div className="group relative my-5 rounded-xl border border-slate-800 overflow-hidden shadow-lg shadow-black/20">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Decorative traffic-light dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700/80" />
          </div>
          {filename ? (
            <span className="font-mono text-[11px] text-slate-400">
              {filename}
            </span>
          ) : (
            <span className="text-[11px] font-medium uppercase tracking-widest text-slate-600">
              {lang}
            </span>
          )}
        </div>
        <CopyButton code={trimmed} />
      </div>

      {/* Highlighted code */}
      <div
        className="shiki-wrapper overflow-x-auto px-2 py-4 text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
