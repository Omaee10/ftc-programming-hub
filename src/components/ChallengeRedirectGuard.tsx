"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Challenge } from "@/data/challenges";
import ChallengeWorkspace from "@/components/ChallengeWorkspace";
import { useHomeworkAssignments } from "@/hooks/useHomeworkAssignments";
import { getSession } from "@/lib/auth";

export default function ChallengeRedirectGuard({
  challenge,
}: {
  challenge: Challenge;
}) {
  const router = useRouter();
  const { isAssigned, hydrated } = useHomeworkAssignments();
  const session = getSession();

  useEffect(() => {
    if (!hydrated) return;
    if (session?.role === "student" && isAssigned(challenge.id)) {
      router.replace(`/homework/${challenge.id}`);
    }
  }, [hydrated, isAssigned, challenge.id, router, session?.role]);

  if (!hydrated && session?.role === "student") {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (session?.role === "student" && isAssigned(challenge.id)) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return <ChallengeWorkspace challenge={challenge} />;
}
