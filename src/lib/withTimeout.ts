export class AsyncTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${Math.round(ms / 1000)}s`);
    this.name = "AsyncTimeoutError";
  }
}

/**
 * Fetch bounded by a real abort, not just a rejected wrapper.
 *
 * Prefer this over `withTimeout(fetch(...), ...)` for every HTTP call.
 * withTimeout rejects on time but cannot cancel what it is wrapping, so the
 * request stayed live and its response was parsed and discarded — the user saw a
 * timeout while the work continued, and on a slow connection the retry stacked a
 * second request on top of the first.
 *
 * Rethrown as AsyncTimeoutError rather than the native DOMException so
 * {@link formatLoadError} still produces "The server took too long to respond"
 * instead of falling through to its generic message.
 *
 * Note AbortSignal.timeout stays armed until the body has been consumed, so the
 * budget now covers `res.json()` too rather than stopping at the headers. That is
 * the intended behaviour — see the same reasoning in graderClient's
 * fetchWithTimeout — but it does mean a response whose body arrives slowly now
 * fails where it previously succeeded.
 *
 * Any `signal` already on `init` is replaced; no caller passes one today.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  ms: number,
  label = "Request"
): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: AbortSignal.timeout(ms) });
  } catch (error) {
    if (
      error instanceof Error
      && (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new AsyncTimeoutError(label, ms);
    }
    throw error;
  }
}

/**
 * Bound a promise that cannot be cancelled.
 *
 * Rejects on time but leaves the underlying work running, so reach for
 * {@link fetchWithTimeout} whenever the work IS a fetch. This remains correct for
 * promises with no cancellation story of their own — `supabase.auth.*` calls in
 * particular, which expose no AbortSignal.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "Request"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AsyncTimeoutError(label, ms));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function formatLoadError(error: unknown): string {
  if (error instanceof AsyncTimeoutError) {
    return "The server took too long to respond. Check your connection and try again.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Failed to load data. Please try again.";
}
