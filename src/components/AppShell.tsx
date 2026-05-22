"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, LogOut, User, Sun, Moon, Shield } from "lucide-react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import { getSession, setSession as persistSession, clearSession, type Session } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const stored = getSession();
    setSession(stored);
    setMounted(true);

    // For mentors, always resolve the correct team name from Supabase.
    // This fixes stale sessions and co-mentors whose teamName wasn't set.
    if (stored?.role === "mentor") {
      (async () => {
        const { data: mentorRow } = await supabase
          .from("mentors")
          .select("name, mentor_name, created_by")
          .eq("id", stored.id)
          .single();
        if (!mentorRow) return;

        const row = mentorRow as { name: string; mentor_name?: string | null; created_by?: string | null };
        let personalName: string = row.mentor_name ?? row.name;
        let teamName: string = row.name;
        let parentMentorId: string | undefined = row.created_by ?? undefined;

        if (parentMentorId) {
          const { data: parentRow } = await supabase
            .from("mentors")
            .select("name")
            .eq("id", parentMentorId)
            .single();
          if (parentRow) teamName = (parentRow as { name: string }).name;
        }

        const updated: Session = {
          ...stored,
          name: personalName,
          teamName,
          ...(parentMentorId ? { parentMentorId } : {}),
        };
        setSession(updated);        // update React state
        persistSession(updated);    // update localStorage so next load is instant
        window.dispatchEvent(new CustomEvent("ftc-session-updated"));
      })();
    }
  }, []);

  const handleSignOut = () => {
    clearSession();
    router.push("/onboarding");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col lg:ml-64 min-h-full">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-slate-800/80 bg-slate-950/95 px-4 backdrop-blur">
          {/* Mobile menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Created by — top left */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600 hidden sm:block">Created by</span>
            <span className="text-xs font-semibold text-slate-400 tracking-tight">FTC Team 21171</span>
          </div>

          <div className="flex-1" />

          {/* Mentor dashboard shortcut */}
          {session?.role === "mentor" && (
            <Link
              href="/mentor/dashboard"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 transition-all"
            >
              <Shield className="h-3.5 w-3.5" />
              Manage Class
            </Link>
          )}

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}

          {/* User chip */}
          {session && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5">
                <User className="h-3 w-3 text-slate-400" />
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-medium text-slate-300">
                    {session.role === "mentor"
                      ? (session.teamName || session.name)
                      : session.name}
                  </span>
                  {session.role === "mentor" && session.teamName && session.teamName !== session.name && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                      {session.name}
                    </span>
                  )}
                  {session.role === "student" && session.teamName && session.teamName !== session.name && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                      {session.teamName}
                    </span>
                  )}
                </div>
                {session.role === "mentor" ? (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-100">
                    Mentor
                  </span>
                ) : session.teamName ? (
                  <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300 truncate max-w-[80px]">
                    {session.teamName}
                  </span>
                ) : null}
              </div>

              <button
                onClick={handleSignOut}
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
