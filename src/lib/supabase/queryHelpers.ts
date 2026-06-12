export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
  from: number;
  to: number;
}

/** Normalize page/pageSize for Supabase `.range(from, to)` queries. */
export function parsePagination(
  page: unknown,
  pageSize: unknown,
  defaultPageSize = DEFAULT_PAGE_SIZE
): PaginationParams {
  const safePage = typeof page === "number" && page >= 0 ? Math.floor(page) : 0;
  const rawSize =
    typeof pageSize === "number" && pageSize > 0
      ? Math.floor(pageSize)
      : defaultPageSize;
  const safePageSize = Math.min(Math.max(rawSize, 1), MAX_PAGE_SIZE);
  const from = safePage * safePageSize;
  const to = from + safePageSize - 1;
  return { page: safePage, pageSize: safePageSize, from, to };
}

export function hasMorePages(totalCount: number, pagination: PaginationParams): boolean {
  return (pagination.page + 1) * pagination.pageSize < totalCount;
}
