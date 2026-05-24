import { Info, AlertTriangle, Lightbulb } from "lucide-react";

// ─── NoteBox ──────────────────────────────────────────────────
type NoteType = "info" | "warning" | "tip";

const noteStyles: Record<NoteType, { wrapper: string; label: string; icon: React.ElementType }> = {
  info: {
    wrapper: "border-blue-500/25 bg-blue-500/5 text-blue-300",
    label: "Info",
    icon: Info,
  },
  warning: {
    wrapper: "border-amber-500/25 bg-amber-500/5 text-amber-300",
    label: "Warning",
    icon: AlertTriangle,
  },
  tip: {
    wrapper: "border-emerald-500/25 bg-emerald-500/5 text-emerald-300",
    label: "Tip",
    icon: Lightbulb,
  },
};

export function NoteBox({
  type,
  children,
}: {
  type: NoteType;
  children: React.ReactNode;
}) {
  const s = noteStyles[type];
  const Icon = s.icon;
  return (
    <div className={`my-4 flex gap-3 rounded-xl border px-4 py-3.5 text-sm leading-relaxed ${s.wrapper}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
      <div>
        <span className="font-semibold">{s.label}: </span>
        {children}
      </div>
    </div>
  );
}

// ─── SpecTable ────────────────────────────────────────────────
interface SpecRow {
  label: string;
  value: string;
  note?: string;
}

export function SpecTable({ rows }: { rows: SpecRow[] }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-800/60">
          {rows.map((row, i) => (
            <tr key={`${row.label}-${i}`} className="group">
              <td className="w-40 py-2.5 pl-4 pr-3 font-medium text-slate-400 align-top group-hover:bg-slate-800/20">
                {row.label}
              </td>
              <td className="py-2.5 pr-4 font-mono text-slate-300 align-top group-hover:bg-slate-800/20">
                {row.value}
              </td>
              {row.note && (
                <td className="py-2.5 pr-4 text-slate-600 align-top group-hover:bg-slate-800/20">
                  {row.note}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── StepList ────────────────────────────────────────────────
export function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="my-4 space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-slate-400 leading-relaxed">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-400">
            {i + 1}
          </span>
          <span className="flex-1 pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// ─── InfoGrid ────────────────────────────────────────────────
interface InfoGridItem {
  label: string;
  value: string;
  sub?: string;
}

export function InfoGrid({ items }: { items: InfoGridItem[] }) {
  return (
    <div className="my-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={`${item.label}-${item.value}-${i}`}
          className="rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-3"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600 mb-1">
            {item.label}
          </p>
          <p className="text-sm font-semibold text-slate-200">{item.value}</p>
          {item.sub && (
            <p className="text-[10px] text-slate-600 mt-0.5">{item.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SectionProse ────────────────────────────────────────────
/** Thin wrapper around a block of prose paragraphs + children */
export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}
