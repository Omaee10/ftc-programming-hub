"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Code2,
  ChevronDown,
  ChevronRight,
  X,
  Cpu,
  Zap,
  GitBranch,
  Navigation,
  Trophy,
  Archive,
  Rocket,
  Shield,
  MonitorSmartphone,
  ScanEye,
  GraduationCap,
} from "lucide-react";
import { getSession } from "@/lib/auth";

interface NavChild {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
  badge?: string;
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
        label: "Documentation Hub",
        icon: BookOpen,
        children: [
          { label: "Java Basics", href: "/docs/java-basics", icon: GraduationCap, badge: "Start Here" },
          { label: "goBILDA", href: "/docs/gobilda", icon: Cpu },
          { label: "REV Robotics", href: "/docs/rev-robotics", icon: Zap },
          { label: "Motors & Servos", href: "/docs/motors-servos", icon: Cpu },
          { label: "Android Studio", href: "/docs/android-studio", icon: MonitorSmartphone },
          { label: "Limelight 3A", href: "/docs/limelight", icon: ScanEye },
          { label: "Road Runner", href: "/docs/road-runner", icon: GitBranch },
          { label: "Pedro Pathing", href: "/docs/pedro-pathing", icon: Navigation },
          {
            label: "Swyft Robotics",
            href: "/docs/swyft-robotics",
            icon: Rocket,
            badge: "New",
          },
        ],
      },
      {
        label: "Coding Challenges",
        href: "/challenges",
        icon: Code2,
      },
      {
        label: "Team Past Programs",
        href: "/past-programs",
        icon: Archive,
        badge: "Real Code",
      },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavLink({
  href,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
        isActive
          ? "bg-white/8 text-zinc-100 border border-white/15"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          isActive ? "text-zinc-100" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase tracking-wide">
          {badge}
        </span>
      )}
      {isActive && (
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-100 shrink-0" />
      )}
    </Link>
  );
}

function DocsGroup({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const isDocsActive = pathname.startsWith("/docs");

  // Tracks whether the user has manually toggled the section.
  // The section is shown expanded whenever we're on a docs route OR the user
  // has explicitly opened it — whichever is true.
  const [userExpanded, setUserExpanded] = useState(false);
  const isExpanded = isDocsActive || userExpanded;

  const docsChildren = navigation[1].items[0].children!;

  return (
    <div>
      <button
        onClick={() => setUserExpanded((prev) => !prev)}
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
          isDocsActive
            ? "bg-white/8 text-zinc-100 border border-white/15"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
        }`}
      >
        <BookOpen
          className={`h-4 w-4 shrink-0 ${
            isDocsActive ? "text-zinc-100" : "text-slate-500 group-hover:text-slate-300"
          }`}
        />
        <span className="flex-1 text-left">Documentation Hub</span>
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-1 ml-3 pl-3 border-l border-slate-800 space-y-0.5">
          {docsChildren.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              badge={child.badge}
              onClick={onLinkClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    setIsMentor(getSession()?.role === "mentor");
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-900 border-r border-slate-800/80 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8 border border-white/15">
              <Trophy className="h-3.5 w-3.5 text-zinc-100" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-slate-100 tracking-tight">
                FTC Hub
              </span>
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                Programming
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-4 px-3 space-y-6">
          {navigation.map((section) => (
            <div key={section.section}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {section.section}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) =>
                  item.children ? (
                    <DocsGroup key={item.label} onLinkClick={onClose} />
                  ) : (
                    <NavLink
                      key={item.href}
                      href={item.href!}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                      onClick={onClose}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Mentor section */}
        {isMentor && (
          <div className="shrink-0 border-t border-slate-800/80 px-3 py-3">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Manage
            </p>
            <Link
              href="/mentor/dashboard"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                pathname.startsWith("/mentor")
                  ? "bg-white/8 text-zinc-100 border border-white/15"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Shield className={`h-4 w-4 shrink-0 ${pathname.startsWith("/mentor") ? "text-zinc-100" : "text-slate-500"}`} />
              <span className="flex-1">Mentor Dashboard</span>
              {pathname.startsWith("/mentor") && (
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-100 shrink-0" />
              )}
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="text-xs text-slate-500">DECODE 2025–26</span>
          </div>
        </div>
      </aside>
    </>
  );
}
