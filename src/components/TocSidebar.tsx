"use client";

import { useState, useEffect } from "react";

export interface TocItem {
  label: string;
  anchor: string;
}

export default function TocSidebar({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      // Find the topmost intersecting entry
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length > 0) {
        setActiveId(visible[0].target.id);
      }
    };

    const observer = new IntersectionObserver(handleIntersect, {
      // Shrink top viewport so the heading triggers "active" earlier
      rootMargin: "-8% 0px -82% 0px",
      threshold: 0,
    });

    items.forEach(({ anchor }) => {
      const el = document.getElementById(anchor);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        On this page
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = activeId === item.anchor;
          return (
            <li key={item.anchor}>
              <a
                href={`#${item.anchor}`}
                className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs leading-relaxed transition-all duration-150 ${
                  isActive
                    ? "accent-text font-medium accent-bg-subtle"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                }`}
              >
                {isActive && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full accent-dot" />
                )}
                {!isActive && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-transparent" />
                )}
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
