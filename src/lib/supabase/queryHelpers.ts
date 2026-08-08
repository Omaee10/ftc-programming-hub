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

/** Rows requested per page by {@link fetchAllRows}. */
export const FETCH_ALL_CHUNK_SIZE = 1000;
/** Hard stop so a misfiltered query can never loop indefinitely. */
export const FETCH_ALL_MAX_ROWS = 50_000;

type RowsResult<T> = { data: T[] | null; error: unknown };

/**
 * Reads every row matching a query by paging with `.range()`.
 *
 * PostgREST caps rows per response (Supabase defaults to 1000) and truncates
 * SILENTLY rather than erroring. An unbounded `.select()` over a per-student
 * table therefore starts dropping rows once a class grows — and for completion
 * data that renders finished challenges as unfinished, with no visible failure.
 *
 * Advances by the number of rows actually returned rather than by `chunkSize`,
 * so it stays correct even if the server cap is lower than the requested page.
 * Callers must apply a deterministic `.order()` or paging may skip/repeat rows.
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  buildQuery: (from: number, to: number) => PromiseLike<RowsResult<T>>,
  chunkSize = FETCH_ALL_CHUNK_SIZE
): Promise<{ data: T[]; error: unknown }> {
  const rows: T[] = [];
  let from = 0;

  while (from < FETCH_ALL_MAX_ROWS) {
    const { data, error } = await buildQuery(from, from + chunkSize - 1);
    if (error) return { data: rows, error };

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length === 0) break;
    from += batch.length;
  }

  // Hitting the ceiling is the one way this helper can do the very thing it
  // exists to prevent, so it reports rather than returning short and clean.
  // Callers already branch on `error`, so an over-cap read now surfaces the same
  // way a failed one does instead of looking like a complete result.
  if (from >= FETCH_ALL_MAX_ROWS) {
    return {
      data: rows,
      error: new Error(
        `fetchAllRows hit its ${FETCH_ALL_MAX_ROWS}-row ceiling; the result is truncated. `
        + `Narrow the query or paginate it explicitly.`
      ),
    };
  }

  return { data: rows, error: null };
}
