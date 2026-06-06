"use client";

import { useEffect, useState } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    const session = getSession();
    if (session?.role === "student" && isAssigned(challenge.id)) {
      router.replace(`/homework/${challenge.id}`);
      return;
    }

    setReady(true);
  }, [hydrated, isAssigned, challenge.id, router]);

  if (!ready) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return <ChallengeWorkspace challenge={challenge} />;
}
