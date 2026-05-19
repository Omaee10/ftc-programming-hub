"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Trophy, LogOut, User } from "lucide-react";
import Sidebar from "./Sidebar";
import { getSession, clearSession, type Session } from "@/lib/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    setSession(getSession());
  }, []);

  const handleSignOut = () => {
    clearSession();
    router.push("/onboarding");
  };

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:ml-64 min-h-full">
        {/* Top bar — visible on mobile always, on desktop only for the user chip */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-slate-800/80 bg-slate-950/95 px-4 backdrop-blur">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile brand */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 border border-amber-500/30">
              <Trophy className="h-3 w-3 text-amber-400" />
            </div>
            <span className="text-sm font-bold text-slate-100">FTC Hub</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User chip — shown once hydrated */}
          {session && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5">
                <User className="h-3 w-3 text-slate-400" />
                <span className="text-xs font-medium text-slate-300">
                  {session.name}
                </span>
                {session.role === "mentor" && (
                  <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-400">
                    Mentor
                  </span>
                )}
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

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
