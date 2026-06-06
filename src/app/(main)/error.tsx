"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="h-8 w-8 text-slate-400" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-100">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          This page hit an error while loading. Try again, or head back to your
          dashboard.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-white transition-colors"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
        >
          Dashboard
        </a>
      </div>
    </div>
  );
}
