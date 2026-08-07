"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Code2,
  ClipboardList,
  X,
  Trophy,
  Archive,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  PenLine,
} from "lucide-react";
import { getSession, isSoloSession } from "@/lib/auth";
import DiscordLink from "./DiscordLink";
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  /** Only show this item to mentor sessions. */
  mentorOnly?: boolean;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    section: "General",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: "Learn",
    items: [
      {
        label: "Learn",
        href: "/learn",
        icon: GraduationCap,
        badge: "Start Here",
      },
      {
        label: "Coding Challenges",
        href: "/challenges",
        icon: Code2,
      },
      {
        label: "Code Playground",
        href: "/playground",
        icon: PenLine,
      },
      {
        label: "Challenge Answer Key",
        href: "/challenges/answer-key",
        icon: KeyRound,
        mentorOnly: true,
        badge: "Mentor",
      },
      {
        label: "Coding Homework",
        href: "/homework",
        icon: ClipboardList,
      },
      {
        label: "Team Past Programs",
        href: "/past-programs",
        icon: Archive,
        badge: "Real Code",
      },
    ],
  },
  {
    section: "Reference",
    items: [
      {
        label: "Documentation",
        href: "/docs",
        icon: BookOpen,
      },
      {
        label: "FTC Blocks",
        href: "/docs/blocks",
        icon: LayoutGrid,
      },
    ],
  },
];

/**
 * Longest matching href wins, so /docs/blocks highlights "FTC Blocks" rather
 * than also lighting up its "/docs" parent (same for the answer key under
 * /challenges).
 */
function resolveActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.length)) {
      best = item.href;
    }
  }
  return best;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavLink({
  href,
  icon: Icon,
  label,
  badge,
  isActive,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`nav-active-bar group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-all duration-150 ${
        isActive
          ? "is-active"
          : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300 font-normal"
      }`}
    >
      <Icon
        className={`nav-icon h-3.5 w-3.5 shrink-0 transition-colors ${
          isActive ? "" : "text-slate-600 group-hover:text-slate-400"
        }`}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide ${
          badge === "New"
            ? "bg-blue-500/15 text-blue-400"
            : badge === "Start Here"
            ? "bg-amber-500/15 text-amber-400"
            : "bg-slate-800 text-slate-500"
        }`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isStudent, setIsStudent] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const syncRole = () => {
      const session = getSession();
      setIsStudent(session?.role === "student");
      setIsMentor(session?.role === "mentor");
      setIsSolo(isSoloSession(session));
      setSignedIn(session !== null);
    };
    syncRole();
    window.addEventListener("ftc-session-updated", syncRole);
    return () => window.removeEventListener("ftc-session-updated", syncRole);
  }, []);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const visibleNavigation = navigation.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (item.href !== "/homework" || (isStudent && !isSolo)) &&
        (!item.mentorOnly || isMentor)
    ),
  }));

  const activeHref = resolveActiveHref(
    pathname,
    visibleNavigation.flatMap((section) => section.items)
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-950 border-r border-slate-800/60 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 border border-slate-700/60">
              <Trophy className="h-3 w-3 text-slate-300" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-slate-200 tracking-tight">
                FTC Hub
              </span>
              <span className="text-[10px] text-slate-600 font-normal">
                Programming
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-4 px-3 space-y-5">
          {visibleNavigation.map((section) => (
            <div key={section.section}>
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-widest text-slate-700">
                {section.section}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                    isActive={activeHref === item.href}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800/60 px-4 py-3 space-y-2.5">
          {/* Community invite is for members only — never shown to signed-out visitors. */}
          {signedIn && <DiscordLink variant="sidebar" />}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full accent-dot accent-shadow" />
            <span className="text-[10px] text-slate-600 font-medium">DECODE 2025–26</span>
          </div>
        </div>
      </aside>
    </>
  );
}
