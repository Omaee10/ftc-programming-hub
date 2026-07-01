/**
 * In-memory sliding-window rate limiter with exponential backoff.
 * Suitable for single-instance deployments; buckets do not sync across instances.
 */

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  /** When true, repeated violations increase Retry-After exponentially. */
  backoff?: boolean;
};

export type RateLimitResult = {
  ok: boolean;
  retryAfterMs: number;
  limit: number;
  remaining: number;
  resetAt: number;
};

type BucketState = {
  hits: number[];
  strikes: number;
};

const buckets = new Map<string, BucketState>();

const MAX_BACKOFF_MULTIPLIER = 16;

function bucketFor(key: string): BucketState {
  const existing = buckets.get(key);
  if (existing) return existing;
  const fresh: BucketState = { hits: [], strikes: 0 };
  buckets.set(key, fresh);
  return fresh;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  const bucket = bucketFor(key);
  const hits = bucket.hits.filter((t) => t >= cutoff);

  const resetAt = hits.length > 0 ? hits[0] + opts.windowMs : now + opts.windowMs;

  if (hits.length >= opts.limit) {
    bucket.strikes += 1;
    bucket.hits = hits;

    const baseRetry = Math.max(0, hits[0] + opts.windowMs - now);
    let retryAfterMs = baseRetry;

    if (opts.backoff) {
      const multiplier = Math.min(2 ** (bucket.strikes - 1), MAX_BACKOFF_MULTIPLIER);
      retryAfterMs = Math.max(baseRetry, opts.windowMs * multiplier);
    }

    return {
      ok: false,
      retryAfterMs,
      limit: opts.limit,
      remaining: 0,
      resetAt: now + retryAfterMs,
    };
  }

  hits.push(now);
  bucket.hits = hits;
  bucket.strikes = 0;

  return {
    ok: true,
    retryAfterMs: 0,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - hits.length),
    resetAt: hits[0] + opts.windowMs,
  };
}

export function clientIdFrom(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.ok && result.retryAfterMs > 0) {
    headers["X-RateLimit-Retry-After-Ms"] = String(result.retryAfterMs);
  }
  return headers;
}

/** Auth endpoints: 5 attempts per IP per 15 minutes. */
export const AUTH_RATE = { limit: 5, windowMs: 15 * 60_000 } as const;

/** Grade submissions: 10 per authenticated student per minute (with backoff). */
export const GRADE_STUDENT_RATE = { limit: 10, windowMs: 60_000, backoff: true } as const;

/** Grade submissions: 20 per IP per minute (catches unauthenticated probing). */
export const GRADE_IP_RATE = { limit: 20, windowMs: 60_000, backoff: true } as const;

/** Playground compile: 30 per IP per minute. */
export const COMPILE_IP_RATE = { limit: 30, windowMs: 60_000 } as const;

/** AI challenge generation: 10 per IP per minute (expensive upstream calls). */
export const GENERATE_IP_RATE = { limit: 10, windowMs: 60_000 } as const;
