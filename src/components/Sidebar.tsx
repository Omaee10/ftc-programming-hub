"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Code2,
  ChevronDown,
  ClipboardList,
  ChevronRight,
  X,
  Cpu,
  Zap,
  GitBranch,
  Navigation,
  Trophy,
  Archive,
  Rocket,
  MonitorSmartphone,
  ScanEye,
  GraduationCap,
  Gamepad2,
  MoveRight,
  ActivitySquare,
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
          { label: "Android Studio", href: "/docs/android-studio", icon: MonitorSmartphone },
          { label: "Motors & Servos", href: "/docs/motors-servos", icon: Cpu },
          { label: "Mecanum Drive", href: "/docs/mecanum-drive", icon: MoveRight },
          { label: "Gamepad & Telemetry", href: "/docs/gamepad", icon: Gamepad2 },
          { label: "PID & Control Loops", href: "/docs/pid-control", icon: ActivitySquare },
          { label: "goBILDA", href: "/docs/gobilda", icon: Cpu },
          { label: "REV Robotics", href: "/docs/rev-robotics", icon: Zap },
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
  indent = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  onClick?: () => void;
  indent?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`nav-active-bar group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-all duration-150 ${
        isActive
          ? "is-active"
          : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300 font-normal"
      } ${indent ? "pl-3" : ""}`}
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

function DocsGroup({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const isDocsActive = pathname.startsWith("/docs");

  const [userExpanded, setUserExpanded] = useState(false);
  const isExpanded = isDocsActive || userExpanded;

  const docsChildren = navigation[1].items[0].children!;

  return (
    <div>
      <button
        onClick={() => setUserExpanded((prev) => !prev)}
        className={`nav-active-bar group flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-all duration-150 ${
          isDocsActive
            ? "is-active"
            : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300 font-normal"
        }`}
      >
        <BookOpen
          className={`nav-icon h-3.5 w-3.5 shrink-0 transition-colors ${
            isDocsActive ? "" : "text-slate-600 group-hover:text-slate-400"
          }`}
        />
        <span className="flex-1 text-left">Documentation Hub</span>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-slate-600" />
        ) : (
          <ChevronRight className="h-3 w-3 text-slate-600" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-0.5 ml-2.5 pl-3 border-l border-slate-800/80 space-y-0.5 py-0.5">
          {docsChildren.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              badge={child.badge}
              onClick={onLinkClick}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    const syncRole = () => setIsStudent(getSession()?.role === "student");
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
      (item) => item.href !== "/homework" || isStudent
    ),
  }));

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

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full accent-dot accent-shadow" />
            <span className="text-[10px] text-slate-600 font-medium">DECODE 2025–26</span>
          </div>
        </div>
      </aside>
    </>
  );
}
