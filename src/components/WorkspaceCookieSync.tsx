"use client";

import { useEffect } from "react";
import { syncWorkspaceCookiesFromStorage } from "@/lib/auth";

/** Restore workspace cookies from localStorage on every page load (pages without AppShell). */
export default function WorkspaceCookieSync() {
  useEffect(() => {
    syncWorkspaceCookiesFromStorage();
  }, []);

  return null;
}
