"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PlaygroundWorkspace from "@/components/PlaygroundWorkspace";
import { getSession } from "@/lib/auth";

/** Client-side mentor guard — non-mentors are sent to the challenge catalog. */
export default function PlaygroundGuard() {
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

  return <PlaygroundWorkspace />;
}
