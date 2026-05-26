"use client";

import { useEffect } from "react";

/** Scrolls to the URL hash section after doc page navigation. */
export default function DocHashScroll() {
  useEffect(() => {
    function scrollToHash() {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return null;
}
