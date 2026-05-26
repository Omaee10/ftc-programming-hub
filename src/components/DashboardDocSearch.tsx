"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  GraduationCap,
  MonitorSmartphone,
  Cpu,
  MoveRight,
  Gamepad2,
  ActivitySquare,
  Zap,
  ScanEye,
  GitBranch,
  Navigation,
  Rocket,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { searchDocumentation, type DocSearchHit } from "@/data/docSearchIndex";

const DOC_ICONS: Record<string, LucideIcon> = {
  "java-basics": GraduationCap,
  "android-studio": MonitorSmartphone,
  "motors-servos": Cpu,
  "mecanum-drive": MoveRight,
  gamepad: Gamepad2,
  "pid-control": ActivitySquare,
  gobilda: Cpu,
  "rev-robotics": Zap,
  limelight: ScanEye,
  "road-runner": GitBranch,
  "pedro-pathing": Navigation,
  "swyft-robotics": Rocket,
};

function iconForHref(href: string): LucideIcon {
  const slug = href.replace("/docs/", "");
  return DOC_ICONS[slug] ?? FileText;
}

function hitKey(hit: DocSearchHit): string {
  return `${hit.docHref}#${hit.sectionId}`;
}

type DocSearchVariant = "dashboard" | "header";

export default function DashboardDocSearch({
  variant = "dashboard",
}: {
  variant?: DocSearchVariant;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(true);

  const results = useMemo(() => searchDocumentation(query), [query]);
  const isHeader = variant === "header";

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const navigateTo = useCallback(
    (hit: DocSearchHit) => {
      close();
      const url = `${hit.docHref}#${hit.sectionId}`;
      router.push(url);
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.getElementById(hit.sectionId)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 120);
      });
    },
    [close, router]
  );

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpenRequest = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("ftc-open-doc-search", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("ftc-open-doc-search", onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        navigateTo(results[activeIndex]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results, activeIndex, close, navigateTo]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "dash-search-trigger group flex items-center text-left transition-all duration-200 ease-in-out",
          isHeader
            ? "dash-search-trigger-header h-8 min-w-0 flex-1 max-w-md gap-2 rounded-md px-2.5 lg:max-w-sm xl:max-w-md"
            : "w-full gap-3 rounded-lg px-3.5 py-2.5",
        ].join(" ")}
        aria-label="Search documentation"
      >
        <Search
          className={[
            "shrink-0 text-slate-500 transition-colors group-hover:text-slate-400",
            isHeader ? "h-3.5 w-3.5" : "h-4 w-4",
          ].join(" ")}
        />
        <span
          className={[
            "min-w-0 flex-1 truncate text-slate-500 transition-colors group-hover:text-slate-400",
            isHeader ? "text-xs" : "text-sm",
          ].join(" ")}
        >
          {isHeader ? "Search documentation…" : "Search docs, sections, and topics…"}
        </span>
        <kbd className={["dash-search-kbd shrink-0", isHeader ? "hidden md:inline-flex text-[9px]" : "hidden sm:inline-flex"].join(" ")}>
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[min(18vh,8rem)] backdrop-blur-[2px]"
          onClick={close}
          role="presentation"
        >
          <div
            className="dash-search-dialog w-full max-w-xl overflow-hidden rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search documentation"
          >
            <div className="flex items-center gap-3 border-b dash-divider px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try setPower, RUN_TO_POSITION, edge detection, AprilTag…"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
              />
              <kbd className="dash-search-kbd text-[10px]">Esc</kbd>
            </div>

            <p className="border-b dash-divider px-4 py-2 text-[10px] uppercase tracking-widest text-slate-600">
              {hasQuery
                ? `${results.length} section${results.length === 1 ? "" : "s"} found`
                : "Browse by section — type to search topics & APIs"}
            </p>

            <ul className="max-h-80 overflow-y-auto py-2 sidebar-scroll">
              {results.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">
                  No sections match &ldquo;{query}&rdquo;. Try a method name like{" "}
                  <span className="text-slate-400">setVelocity</span> or a topic like{" "}
                  <span className="text-slate-400">encoder</span>.
                </li>
              ) : (
                results.map((hit, i) => {
                  const Icon = iconForHref(hit.docHref);
                  const active = i === activeIndex;
                  return (
                    <li key={hitKey(hit)}>
                      <button
                        type="button"
                        onClick={() => navigateTo(hit)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={[
                          "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-all duration-200 ease-in-out",
                          active ? "dash-search-result-active" : "dash-search-result",
                        ].join(" ")}
                      >
                        <div className="dash-icon-tile mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                          <Icon className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-200">
                            {hit.sectionTitle}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {hit.docTitle}
                            <span className="mx-1.5 text-slate-700">·</span>
                            {hit.snippet}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
