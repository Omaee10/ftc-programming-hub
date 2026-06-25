"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Challenge } from "@/data/challenges";
import ChallengeRedirectGuard from "@/components/ChallengeRedirectGuard";
import { getSession } from "@/lib/auth";
import { fetchClassChallengeById } from "@/lib/classChallenges";

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

      const session = getSession();
      if (!session) {
        if (!cancelled) {
          setError("Sign in and choose a class to open this challenge.");
          setLoading(false);
        }
        return;
      }

      const loaded = await fetchClassChallengeById(session, challengeId);

      if (cancelled) return;

      if (!loaded) {
        setError("Challenge not found or you don't have access.");
        setLoading(false);
        return;
      }

      setChallenge(loaded);
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
