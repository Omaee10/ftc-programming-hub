"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, LogOut, Palette, Shield, Copy, Check, Settings, Info, X, UserPlus } from "lucide-react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import ThemePanel from "./ThemePanel";
import DashboardDocSearch from "./DashboardDocSearch";
import { getSession, setSession as persistSession, clearWorkspaceSession, type Session, isSoloSession, isSoloBannerDismissed, dismissSoloBanner } from "@/lib/auth";
import { prefetchHomework } from "@/hooks/useHomeworkAssignments";
import { supabase } from "@/lib/supabase";
import { signOutAll, getAuthUserId, getProfileDisplayName } from "@/lib/authSession";
import { fetchClassCode } from "@/lib/mentorDashboardApi";
import { fetchWorkspacesResult, sessionMatchesWorkspaces } from "@/lib/workspaceValidation";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [classCode, setClassCode] = useState<string | null>(null);
  const [classCodeCopied, setClassCodeCopied] = useState(false);
  const [soloBannerHidden, setSoloBannerHidden] = useState(false);
  /** Workspace ownership could not be confirmed (offline / server error). */
  const [workspaceCheckFailed, setWorkspaceCheckFailed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const lockScroll = pathname === "/dashboard";
  const showHeaderSearch = pathname !== "/dashboard";

  useEffect(() => {
    let cancelled = false;

    const onSessionUpdated = () => {
      const next = getSession();
      setSession(next);
      if (isSoloSession(next)) {
        setSoloBannerHidden(isSoloBannerDismissed());
      }
    };

    (async () => {
      const stored = getSession();

      if (stored && !isSoloSession(stored)) {
        const result = await fetchWorkspacesResult();
        if (cancelled) return;

        // Only drop the session when the server actually told us it is no longer
        // valid — a confirmed mismatch, or a 401. "unreachable" (offline,
        // timeout, 5xx) proves nothing about the stored workspace, and clearing
        // on it signed people out mid-session and discarded unsaved editor work.
        const definitivelyInvalid =
          (result.ok && !sessionMatchesWorkspaces(stored, result.data))
          || (!result.ok && result.reason === "unauthorized");

        if (definitivelyInvalid) {
          clearWorkspaceSession();
          setSession(null);
          setMounted(true);
          router.replace("/signin");
          return;
        }

        // Could not verify. Keep working and offer a retry.
        setWorkspaceCheckFailed(!result.ok);
      }

      if (cancelled) return;

      if (stored) {
        persistSession(stored);
        if (stored.role === "student" && !isSoloSession(stored)) {
          prefetchHomework();
        }
      }
      setSession(stored);
      setSoloBannerHidden(isSoloBannerDismissed());
      setMounted(true);

      window.addEventListener("ftc-session-updated", onSessionUpdated);

      if (stored?.role === "mentor") {
        (async () => {
          const userId = await getAuthUserId();
          const profileName = userId ? await getProfileDisplayName(userId) : null;

          const { data: mentorRow } = await supabase
            .from("mentors")
            .select("name, mentor_name, class_name, created_by")
            .eq("id", stored.id)
            .single();
          if (!mentorRow || cancelled) return;

          const row = mentorRow as {
            name: string;
            mentor_name?: string | null;
            class_name?: string | null;
            created_by?: string | null;
          };
          const personalName: string = profileName ?? row.mentor_name ?? row.name;
          let teamName: string = row.name;
          let resolvedClassName: string | undefined = row.class_name?.trim() || undefined;
          const parentMentorId: string | undefined = row.created_by ?? undefined;

          if (profileName && row.mentor_name !== profileName) {
            void supabase
              .from("mentors")
              .update({ mentor_name: profileName })
              .eq("id", stored.id);
          }

          try {
            const { classCode: code, className: apiClassName, teamName: apiTeamName } =
              await fetchClassCode(stored);
            if (cancelled) return;
            setClassCode(code);
            if (apiClassName) {
              resolvedClassName = apiClassName;
            }
            if (parentMentorId && apiTeamName) {
              teamName = apiTeamName;
            }
          } catch {
            if (!cancelled) setClassCode(null);
          }

          if (cancelled) return;

          const updated: Session = {
            ...stored,
            name: personalName,
            teamName,
            ...(resolvedClassName ? { className: resolvedClassName } : {}),
            ...(parentMentorId ? { parentMentorId } : {}),
          };
          setSession(updated);
          persistSession(updated);
          window.dispatchEvent(new CustomEvent("ftc-session-updated"));
        })();
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("ftc-session-updated", onSessionUpdated);
    };
  }, [router]);

  const handleSignOut = () => {
    router.push("/login");
    router.refresh();
    void signOutAll();
  };

  const displayName = session
    ? session.role === "mentor"
      ? session.teamName || session.name
      : session.name
    : null;

  const initials = displayName ? getInitials(displayName) : "?";

  const handleCopyClassCode = async () => {
    if (!classCode) return;
    await navigator.clipboard.writeText(classCode);
    setClassCodeCopied(true);
    setTimeout(() => setClassCodeCopied(false), 2000);
  };

  const handleDismissSoloBanner = () => {
    dismissSoloBanner();
    setSoloBannerHidden(true);
  };

  /**
   * Re-run the workspace ownership check after an unreachable result.
   * Clears the session only on a definitive answer, same rule as on mount.
   */
  const retryWorkspaceCheck = async () => {
    const stored = getSession();
    if (!stored || isSoloSession(stored)) {
      setWorkspaceCheckFailed(false);
      return;
    }

    const result = await fetchWorkspacesResult();
    if (result.ok && !sessionMatchesWorkspaces(stored, result.data)) {
      clearWorkspaceSession();
      setSession(null);
      router.replace("/signin");
      return;
    }
    if (!result.ok && result.reason === "unauthorized") {
      clearWorkspaceSession();
      setSession(null);
      router.replace("/signin");
      return;
    }
    setWorkspaceCheckFailed(!result.ok);
  };

  const showSoloBanner = isSoloSession(session) && !soloBannerHidden;

  return (
    <div className="flex h-full min-w-0 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-64">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-slate-800/60 bg-slate-950/90 px-4 backdrop-blur-md">
          {/* Mobile menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:text-slate-300 transition-colors lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Mentor class code — top-left branding area */}
          {session?.role === "mentor" && classCode && (
            <div className="hidden sm:flex shrink-0 items-center gap-2 rounded-md border border-slate-800/80 bg-slate-900/60 px-2.5 py-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                  Class Code
                </span>
                <span className="font-mono text-sm font-semibold tracking-wider text-slate-200">
                  {classCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyClassCode()}
                title="Copy class code"
                className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                {classCodeCopied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          )}

          {showHeaderSearch && (
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
              <div className="flex shrink-0 items-baseline gap-1 lg:hidden">
                <span className="text-sm font-semibold tracking-tight text-slate-200">
                  FTC Hub
                </span>
                <span className="text-[10px] font-normal text-slate-600">Programming</span>
              </div>
              {session?.role === "mentor" && classCode && (
                <div className="flex sm:hidden shrink-0 items-center gap-1.5 rounded-md border border-slate-800/80 bg-slate-900/60 px-2 py-0.5">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-slate-600">
                    Class
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    {classCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyClassCode()}
                    className="text-slate-500"
                    aria-label="Copy class code"
                  >
                    {classCodeCopied ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              )}
              <DashboardDocSearch variant="header" />
            </div>
          )}

          {!showHeaderSearch && (
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {session?.role === "mentor" && classCode && (
                <div className="flex sm:hidden shrink-0 items-center gap-1.5 rounded-md border border-slate-800/80 bg-slate-900/60 px-2 py-0.5">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-slate-600">
                    Class
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    {classCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyClassCode()}
                    className="text-slate-500"
                    aria-label="Copy class code"
                  >
                    {classCodeCopied ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              )}
              <div className="flex-1" />
            </div>
          )}

          {/* Mentor dashboard shortcut */}
          {session?.role === "mentor" && (
            <Link
              href="/mentor/dashboard"
              className="hidden sm:flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-150"
            >
              <Shield className="h-3.5 w-3.5" />
              Manage Class
            </Link>
          )}

          {/* Join a class — neither enrolled students nor solo practisers can
              reach /join-class otherwise; it's only linked from the pre-app
              onboarding and sign-in screens. Solo sessions have no class yet,
              so they get the "a class" wording instead of "another". */}
          {session?.role === "student" && (
            <Link
              href="/join-class?from=app"
              title={isSoloSession(session) ? "Join a class" : "Join another class"}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-150 sm:px-2.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Join class</span>
            </Link>
          )}

          {/* Theme editor */}
          {mounted && (
            <div className="relative">
              <button
                onClick={() => setThemePanelOpen((v) => !v)}
                title="Theme editor"
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
                  themePanelOpen
                    ? "accent-text accent-bg"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60",
                ].join(" ")}
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
              {themePanelOpen && (
                <ThemePanel onClose={() => setThemePanelOpen(false)} />
              )}
            </div>
          )}

          {/* User section */}
          {session && (
            <div className="flex items-center gap-1.5">
              {/* Avatar + name */}
              <div className="hidden sm:flex items-center gap-2 rounded-md px-2 py-1 bg-slate-800/50 border border-slate-700/50">
                {/* Initials avatar */}
                <div className="h-5 w-5 rounded-sm bg-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-semibold text-slate-300 leading-none">
                    {initials}
                  </span>
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-medium text-slate-300">
                    {session.role === "mentor"
                      ? (session.teamName || session.name)
                      : session.name}
                  </span>
                  {session.role === "mentor" && session.teamName && session.teamName !== session.name && (
                    <span className="text-[10px] text-slate-600 truncate max-w-[100px]">
                      {session.name}
                    </span>
                  )}
                  {session.role === "student" && session.teamName && session.teamName !== session.name && (
                    <span className="text-[10px] text-slate-600 truncate max-w-[100px]">
                      {session.teamName}
                    </span>
                  )}
                </div>
                {session.role === "mentor" && (
                  <span className="rounded-sm bg-slate-700/80 px-1 py-0.5 text-[9px] font-medium tracking-wide text-slate-400">
                    mentor
                  </span>
                )}
              </div>

              <Link
                href="/account"
                title="Account settings"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-all duration-150"
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>

              <button
                onClick={handleSignOut}
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-slate-800/60 transition-all duration-150"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </header>

        <main
          className={[
            "min-w-0 flex-1 overflow-x-hidden",
            lockScroll ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto",
          ].join(" ")}
        >
          {workspaceCheckFailed && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/8 px-4 py-3">
              <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-amber-300/90">
                  Couldn&apos;t reach the server
                </p>
                <p className="text-xs text-amber-300/70 mt-0.5">
                  We couldn&apos;t confirm your class just now. You can keep working — your
                  work is still being saved on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void retryWorkspaceCheck()}
                className="shrink-0 rounded-md border border-amber-500/25 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {showSoloBanner && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-sky-500/15 bg-sky-500/8 px-4 py-3">
              <Info className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sky-300/90">Solo practice mode</p>
                <p className="text-xs text-sky-300/70 mt-0.5">
                  Your progress is saved on this device only. It won&apos;t sync to other browsers
                  or devices, and clearing browser data may erase it.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissSoloBanner}
                title="Dismiss"
                className="shrink-0 rounded p-0.5 text-sky-400/60 hover:text-sky-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
