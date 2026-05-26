"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, LogOut, Palette, Shield } from "lucide-react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import ThemePanel from "./ThemePanel";
import DashboardDocSearch from "./DashboardDocSearch";
import { getSession, setSession as persistSession, clearSession, type Session } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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
  const router = useRouter();
  const pathname = usePathname();
  const lockScroll = pathname === "/dashboard";
  const showHeaderSearch = pathname !== "/dashboard";

  useEffect(() => {
    const stored = getSession();
    setSession(stored);
    setMounted(true);

    if (stored?.role === "mentor") {
      (async () => {
        const { data: mentorRow } = await supabase
          .from("mentors")
          .select("name, mentor_name, class_name, created_by")
          .eq("id", stored.id)
          .single();
        if (!mentorRow) return;

        const row = mentorRow as {
          name: string;
          mentor_name?: string | null;
          class_name?: string | null;
          created_by?: string | null;
        };
        let personalName: string = row.mentor_name ?? row.name;
        let teamName: string = row.name;
        let resolvedClassName: string | undefined = row.class_name?.trim() || undefined;
        let parentMentorId: string | undefined = row.created_by ?? undefined;

        if (parentMentorId) {
          const { data: parentRow } = await supabase
            .from("mentors")
            .select("name, class_name")
            .eq("id", parentMentorId)
            .single();
          if (parentRow) {
            const parent = parentRow as { name: string; class_name?: string | null };
            teamName = parent.name;
            resolvedClassName = parent.class_name?.trim() || undefined;
          }
        }

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
  }, []);

  const handleSignOut = () => {
    clearSession();
    router.push("/onboarding");
  };

  const displayName = session
    ? session.role === "mentor"
      ? session.teamName || session.name
      : session.name
    : null;

  const initials = displayName ? getInitials(displayName) : "?";

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

          {showHeaderSearch && (
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
              <div className="flex shrink-0 items-baseline gap-1 lg:hidden">
                <span className="text-sm font-semibold tracking-tight text-slate-200">
                  FTC Hub
                </span>
                <span className="text-[10px] font-normal text-slate-600">Programming</span>
              </div>
              <DashboardDocSearch variant="header" />
            </div>
          )}

          {!showHeaderSearch && <div className="flex-1" />}

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
          {children}
        </main>
      </div>
    </div>
  );
}
