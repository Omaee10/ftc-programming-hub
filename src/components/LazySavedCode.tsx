"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { fetchMentorSnapshotCode, type MentorSnapshotRequest } from "@/lib/mentorDashboardApi";

interface LazySavedCodeProps {
  request: MentorSnapshotRequest;
  /** Show the expand control when the row may have saved work. */
  showWhen?: boolean;
  summaryClassName?: string;
  preClassName?: string;
}

export default function LazySavedCode({
  request,
  showWhen = true,
  summaryClassName = "cursor-pointer text-[10px] text-slate-600 hover:text-slate-400 select-none",
  preClassName = "mt-1 max-h-32 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-400 font-mono",
}: LazySavedCodeProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCode = useCallback(async () => {
    if (loaded || loading) return;
    const session = getSession();
    if (!session?.id) return;

    setLoading(true);
    setError(null);
    try {
      const text = await fetchMentorSnapshotCode(session, request);
      setCode(text);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load code.");
    } finally {
      setLoading(false);
    }
  }, [loaded, loading, request]);

  if (!showWhen) return null;

  return (
    <details
      className="mt-1"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open) {
          void loadCode();
        }
      }}
    >
      <summary className={summaryClassName}>View saved code</summary>
      {loading && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading…
        </div>
      )}
      {error && <p className="mt-2 text-[10px] text-red-400">{error}</p>}
      {!loading && loaded && !code && !error && (
        <p className="mt-2 text-[10px] text-slate-600">No saved code for this item.</p>
      )}
      {code && (
        <pre className={preClassName}>{code}</pre>
      )}
    </details>
  );
}

/** Loads submission code when the mentor expands a grade row. */
export function SubmissionCodePanel({
  submissionId,
  active,
}: {
  submissionId: string;
  active: boolean;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || loaded || loading) return;
    const session = getSession();
    if (!session?.id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchMentorSnapshotCode(session, { kind: "submission", submissionId })
      .then((text) => {
        if (cancelled) return;
        setCode(text);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load code.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, loaded, loading, submissionId]);

  if (!active) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading submission…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-400">{error}</p>;
  }

  if (!code) {
    return <p className="text-xs text-slate-500">No submission code on file.</p>;
  }

  return (
    <pre className="max-h-64 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
      {code}
    </pre>
  );
}
