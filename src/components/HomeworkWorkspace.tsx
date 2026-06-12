"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Challenge } from "@/data/challenges";
import ChallengeWorkspace from "@/components/ChallengeWorkspace";
import { useHomeworkAssignments } from "@/hooks/useHomeworkAssignments";
import { supabase, type ChallengeRow } from "@/lib/supabase";
import { CHALLENGE_DETAIL_COLUMNS } from "@/lib/supabase/progressColumns";
import { getSession } from "@/lib/auth";
import { rowToChallenge } from "@/lib/homeworkUtils";

export default function HomeworkWorkspace({
  challengeId,
  initialChallenge,
}: {
  challengeId: number;
  initialChallenge: Challenge | null;
}) {
  const router = useRouter();
  const {
    isAssigned,
    isHomeworkComplete,
    markHomeworkComplete,
    hydrated,
  } = useHomeworkAssignments();
  const [challenge, setChallenge] = useState<Challenge | null>(initialChallenge);

  useEffect(() => {
    const session = getSession();
    if (session?.role === "mentor") {
      router.replace("/mentor/dashboard");
      return;
    }
    if (!hydrated) return;
    if (!isAssigned(challengeId)) {
      router.replace("/homework");
    }
  }, [hydrated, isAssigned, challengeId, router]);

  useEffect(() => {
    if (challenge) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("challenges")
          .select(CHALLENGE_DETAIL_COLUMNS)
          .eq("id", challengeId)
          .single();
        if (data) {
          setChallenge(rowToChallenge(data as ChallengeRow));
        }
      } catch {
        // static-only challenge — initialChallenge should have been set server-side
      }
    })();
  }, [challengeId, challenge]);

  if (!hydrated || !isAssigned(challengeId)) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const homeworkCompleted = isHomeworkComplete(challengeId);

  return (
    <ChallengeWorkspace
      challenge={challenge}
      homeworkMode
      homeworkCompleted={homeworkCompleted}
      onHomeworkComplete={(code) => markHomeworkComplete(challengeId, code)}
      backHref="/homework"
      backLabel="Homework"
    />
  );
}
