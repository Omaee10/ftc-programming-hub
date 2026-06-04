"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Challenge } from "@/data/challenges";
import type { ChallengeSolution } from "@/data/challengeSolutions";
import ChallengeWorkspace from "@/components/ChallengeWorkspace";
import { getSession } from "@/lib/auth";

/**
 * Client-side mentor guard for an answer-key detail page. Non-mentors are
 * bounced back to the challenge catalog (mirrors the server guard in proxy.ts);
 * mentors see the locked, read-only reference solution.
 */
export default function AnswerKeyGuard({
  challenge,
  solution,
}: {
  challenge: Challenge;
  solution: ChallengeSolution;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session?.role === "mentor") {
      setAllowed(true);
    } else {
      router.replace("/challenges");
    }
  }, [router]);

  if (!allowed) {
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
