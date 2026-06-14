"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Challenge } from "@/data/challenges";
import ChallengeRedirectGuard from "@/components/ChallengeRedirectGuard";
import { supabase, type ChallengeRow } from "@/lib/supabase";
import { CHALLENGE_DETAIL_COLUMNS } from "@/lib/supabase/progressColumns";
import { rowToChallenge } from "@/lib/homeworkUtils";

export default function CustomChallengeLoader({
  challengeId,
}: {
  challengeId: number;
}) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      const { data, error: fetchErr } = await supabase
        .from("challenges")
        .select(CHALLENGE_DETAIL_COLUMNS)
        .eq("id", challengeId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Challenge not found or you don't have access.");
        setLoading(false);
        return;
      }

      setChallenge(rowToChallenge(data as ChallengeRow));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  if (loading) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-slate-400">{error || "Challenge unavailable."}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  return <ChallengeRedirectGuard challenge={challenge} />;
}
