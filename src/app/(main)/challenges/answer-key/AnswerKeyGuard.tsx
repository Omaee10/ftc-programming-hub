"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import type { Challenge } from "@/data/challenges";
// `import type` only — erased at compile, so no solution data reaches the bundle.
import type { ChallengeSolution } from "@/data/challengeSolutions";
import ChallengeWorkspace from "@/components/ChallengeWorkspace";
import { getSession } from "@/lib/auth";
import { fetchAnswerKeySolution } from "@/lib/mentorDashboardApi";

/**
 * Loads a challenge's reference solution for mentors.
 *
 * The solution is fetched from /api/mentor/answer-key rather than handed down as
 * a prop, so it is never present in the page HTML for a non-mentor. The session
 * role check below is a fast redirect only — localStorage is student-editable,
 * so the server's 403 is what actually protects the answer key.
 */
export default function AnswerKeyGuard({ challenge }: { challenge: Challenge }) {
  const router = useRouter();
  const [solution, setSolution] = useState<ChallengeSolution | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const session = getSession();
    if (session?.role !== "mentor") {
      router.replace("/challenges");
      return;
    }

    (async () => {
      const result = await fetchAnswerKeySolution(session, challenge.id);
      if (cancelled) return;

      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          router.replace("/challenges");
          return;
        }
        setLoadError(result.error);
        return;
      }
      setSolution(result.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, challenge.id]);

  if (loadError) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-slate-400">{loadError}</p>
        <Link
          href="/challenges/answer-key"
          className="inline-flex items-center gap-1 text-xs accent-text hover:underline"
        >
          Back to Answer Key
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  // ChallengeWorkspace seeds its editor state from `answerKey` on first render,
  // so it must not mount until the solution has actually arrived.
  if (!solution) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ChallengeWorkspace
      challenge={challenge}
      answerKey={solution}
      backHref="/challenges/answer-key"
      backLabel="Answer Key"
    />
  );
}
