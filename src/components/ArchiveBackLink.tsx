"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ARCHIVE_HREF = "/past-programs";

function archiveHrefFor(category: string | null): string {
  return category && category !== "all"
    ? `${ARCHIVE_HREF}?category=${category}`
    : ARCHIVE_HREF;
}

function FilteredLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const category = useSearchParams().get("category");
  return (
    <Link href={archiveHrefFor(category)} className={className}>
      {children}
    </Link>
  );
}

/**
 * Back-link to the past-programs archive that preserves the active `?category=`
 * filter.
 *
 * The category is read on the client rather than from the page's `searchParams`
 * prop: `searchParams` is a request-time API, and awaiting it opts the route out
 * of the prerender that its own generateStaticParams sets up. The Suspense
 * fallback renders the same link pointing at the unfiltered archive, so the
 * prerendered HTML still carries a working (and crawlable) link, which then
 * upgrades to the filtered href on hydration.
 */
export default function ArchiveBackLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <Link href={ARCHIVE_HREF} className={className}>
          {children}
        </Link>
      }
    >
      <FilteredLink className={className}>{children}</FilteredLink>
    </Suspense>
  );
}
