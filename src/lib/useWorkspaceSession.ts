"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSession, type Session } from "@/lib/auth";
import { formatLoadError, withTimeout } from "@/lib/withTimeout";

export const TAB_LOADER_TIMEOUT_MS = 15_000;

/** Reactive workspace session — AppShell may hydrate localStorage after first paint. */
export function useWorkspaceSession(): Session | null {
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window === "undefined") return null;
    return getSession();
  });

  useEffect(() => {
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener("ftc-session-updated", sync);
    return () => window.removeEventListener("ftc-session-updated", sync);
  }, []);

  return session;
}

/**
 * Standard tab data loader — always clears loading (including missing session),
 * re-runs when AppShell hydrates session, and ignores stale results after unmount.
 */
export function useTabLoader(loadFn: (session: Session) => Promise<void>) {
  const session = useWorkspaceSession();
  const [loading, setLoading] = useState(true);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadFnRef = useRef(loadFn);
  const mountedRef = useRef(true);

  loadFnRef.current = loadFn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    const s = getSession();
    if (!s?.id) {
      if (mountedRef.current) {
        setSessionMissing(true);
        setLoadError(null);
        setLoading(false);
      }
      return;
    }

    if (mountedRef.current) {
      setSessionMissing(false);
      setLoadError(null);
      setLoading(true);
    }

    try {
      await withTimeout(
        loadFnRef.current(s),
        TAB_LOADER_TIMEOUT_MS,
        "Loading class data"
      );
    } catch (error) {
      if (mountedRef.current) setLoadError(formatLoadError(error));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, session?.id, session?.parentMentorId]);

  return { loading, session, sessionMissing, loadError, reload };
}
