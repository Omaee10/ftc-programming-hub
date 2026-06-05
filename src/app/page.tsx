"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAuthUserId } from "@/lib/authSession";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const userId = await getAuthUserId();
      if (!userId) {
        router.replace("/login");
        return;
      }

      const session = getSession();
      if (!session) {
        router.replace("/onboarding");
        return;
      }

      if (session.role === "mentor") {
        router.replace("/mentor/dashboard");
      } else {
        router.replace("/dashboard");
      }
    })();
  }, [router]);

  return null;
}
