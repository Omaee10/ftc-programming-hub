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
  /** Window this bucket was last checked against, so the sweep knows its TTL. */
  windowMs: number;
};

const buckets = new Map<string, BucketState>();

const MAX_BACKOFF_MULTIPLIER = 16;

/** How often {@link sweepExpiredBuckets} is allowed to run. */
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

/**
 * Drop buckets whose newest hit has aged out of their own window.
 *
 * The map is keyed per IP and per user id, so it grew without bound on a
 * long-lived instance — every IP that ever hit a rate-limited route kept an
 * entry forever, and nothing removed them. Each bucket is tiny, but the key
 * space is effectively unbounded.
 *
 * Swept lazily from checkRateLimit rather than on a setInterval: a timer would
 * hold a reference that keeps a serverless instance from idling out, and there
 * is no shutdown hook here to clear it. The cost is that a burst followed by
 * total silence leaves entries until the next request arrives, which is exactly
 * when memory stops mattering.
 *
 * A swept bucket loses its `strikes` count, so pausing for a full window resets
 * backoff escalation. That was already true — `hits` outside the window are
 * filtered out on every check, so a paused caller starts clean either way.
 */
function sweepExpiredBuckets(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;

  for (const [key, bucket] of buckets) {
    const newest = bucket.hits.length > 0 ? bucket.hits[bucket.hits.length - 1] : 0;
    if (newest < now - bucket.windowMs) {
      buckets.delete(key);
    }
  }
}

function bucketFor(key: string, windowMs: number): BucketState {
  const existing = buckets.get(key);
  if (existing) {
    existing.windowMs = windowMs;
    return existing;
  }
  const fresh: BucketState = { hits: [], strikes: 0, windowMs };
  buckets.set(key, fresh);
  return fresh;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweepExpiredBuckets(now);
  const cutoff = now - opts.windowMs;
  const bucket = bucketFor(key, opts.windowMs);
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

/**
 * Is this bucket currently under its limit, without recording a hit?
 *
 * Exists for failure-only buckets, where the charge happens after the work
 * rather than before it. {@link SIGNUP_CODE_FAILURE_RATE} only counts wrong
 * codes, so the natural shape is "look the code up, charge if it was wrong" —
 * but that alone leaves a hole: once an attacker has exhausted the bucket with
 * wrong guesses, the NEXT guess still gets looked up, and a correct one still
 * succeeds because nothing consulted the bucket on the way in. Gating on this
 * first closes that, while a legitimate redemption still costs nothing.
 *
 * Deliberately does not create a bucket for an unseen key: a pure read must not
 * grow the map, or probing distinct keys becomes a way to bloat it.
 */
export function peekRateLimit(key: string, opts: RateLimitOptions): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return true;

  const cutoff = Date.now() - opts.windowMs;
  const hits = bucket.hits.filter((t) => t >= cutoff);
  return hits.length < opts.limit;
}

/**
 * Best-effort client identity for rate-limit bucketing.
 *
 * Order matters. This used to read `x-forwarded-for.split(",")[0]`, the LEFTMOST
 * entry, which is the wrong end of the chain: XFF is appended to as a request
 * traverses proxies, so the leftmost value is whatever the original client sent.
 * On any topology where the platform appends rather than overwrites, a caller
 * could set `X-Forwarded-For: <random>` per request and get a fresh bucket every
 * time, bypassing every limit in this file.
 *
 * `x-real-ip` is set by the platform edge and has no list semantics to get wrong,
 * so it goes first. The XFF fallback takes the LAST entry — the hop nearest this
 * app, i.e. the one appended by infrastructure we control rather than by the
 * caller.
 *
 * Deliberately correct under either XFF behaviour: if the platform overwrites the
 * header with a single value, first and last are the same value and the change is
 * a no-op; if it appends, last is the only trustworthy entry. That is why this
 * does not depend on pinning down exactly what Vercel does with the header.
 *
 * Falls back to a shared "anonymous" bucket when neither header is present, which
 * is local development. That makes the limit global across callers there — the
 * safe direction to fail.
 */
export function clientIdFrom(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const hops = fwd.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "anonymous";
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

/**
 * ── How much these numbers are actually worth ──────────────────────────────
 *
 * Every limit below is enforced by the in-memory map at the top of this file,
 * so it is per-instance and per-process lifetime: two Render instances mean two
 * independent budgets, and any deploy or cold start resets them to zero. Treat
 * them as friction against casual hammering, not as guarantees. That is also
 * why tightening them further buys less than the arithmetic suggests — the
 * binding controls on real abuse are the per-account checks, the signup
 * honeypot, and (once wired) email confirmation.
 */

/**
 * Signup: 60 attempts per IP per 15 minutes, with backoff.
 *
 * Deliberately loose, for the same reason as {@link CODE_REDEEM_IP_RATE}: a
 * class of ~30 students onboarding together sits behind one school NAT, and
 * they arrive in a burst because a mentor just read the code out. The previous
 * shared auth limit was 5/IP/15min, which blocked the sixth student in the room
 * — on 2026-08-01 it did exactly that to a cohort joining "ITKAN Training", who
 * then made duplicate accounts trying to get past it.
 *
 * The cost is that bulk account creation from a single host goes from 5 to 60
 * per window. That is accepted: junk signups are properly controlled by email
 * confirmation, not by throttling the room. Code guessing is handled separately
 * and much more tightly by {@link SIGNUP_CODE_FAILURE_RATE}.
 */
export const SIGNUP_IP_RATE = { limit: 60, windowMs: 15 * 60_000, backoff: true } as const;

/**
 * Signup attempts that supplied a code and got it WRONG: 10 per IP per 15
 * minutes, with backoff.
 *
 * Counting only failures is the whole point. Signing up with a student, mentor
 * or class code is a code-existence oracle, so it needs a real limit — but the
 * old shared 5/IP/15min counted successes too, which meant thirty students
 * redeeming thirty *valid* codes from one network exhausted the budget before
 * half the room was in. A legitimate redemption now costs nothing and only
 * guessing draws down the bucket.
 *
 * Net effect versus the 5/IP limit this replaces: an attacker gets 10 wrong
 * guesses per window instead of 5, but with backoff escalating to 16x the
 * window (4 hours) under sustained violation — where the old constant had no
 * backoff at all and handed out a clean 5 every 15 minutes indefinitely. A
 * sustained sweep of the 6-digit space is slower than it was before.
 */
export const SIGNUP_CODE_FAILURE_RATE = {
  limit: 10,
  windowMs: 15 * 60_000,
  backoff: true,
} as const;

/**
 * Sign-in: 8 attempts per EMAIL per 15 minutes, with backoff.
 *
 * Password guessing targets an account, not an address space, so the tight
 * bucket is keyed on the identity being attacked rather than on the source. The
 * per-IP limit this replaces was trivially evaded by rotating IPs against one
 * victim while also locking out a shared classroom network — wrong on both
 * ends. Keyed on the normalized email, IP rotation buys an attacker nothing.
 */
export const SIGNIN_IDENTITY_RATE = {
  limit: 8,
  windowMs: 15 * 60_000,
  backoff: true,
} as const;

/**
 * Sign-in: 60 attempts per IP per 15 minutes, with backoff.
 *
 * Bounds automated hammering from a single host. Sized to let a whole class
 * sign in at once — the same burst that {@link SIGNUP_IP_RATE} accommodates
 * arrives here a minute later, and limiting signup without limiting sign-in the
 * same way just moves the 429 one screen to the right.
 */
export const SIGNIN_IP_RATE = { limit: 60, windowMs: 15 * 60_000, backoff: true } as const;

/**
 * Resending a signup confirmation email: 3 per EMAIL per 15 minutes, with
 * backoff. Keyed on the address so one person mashing "Resend" cannot spend a
 * shared network's budget, and low because each attempt sends real mail.
 */
export const RESEND_CONFIRMATION_IDENTITY_RATE = {
  limit: 3,
  windowMs: 15 * 60_000,
  backoff: true,
} as const;

/** Resending a signup confirmation email: 30 per IP per 15 minutes, with backoff. */
export const RESEND_CONFIRMATION_IP_RATE = {
  limit: 30,
  windowMs: 15 * 60_000,
  backoff: true,
} as const;

/**
 * Redeeming a class or mentor code: 5 attempts per signed-in user per 15
 * minutes, with backoff.
 *
 * This is the binding control on guessing codes, not the IP bucket below. One
 * legitimate user redeems once and needs a retry or two for a typo, so 5 is
 * generous; an attacker working through the 900k code space needs a fresh
 * account every 5 guesses, and minting those accounts is itself capped by
 * {@link SIGNUP_IP_RATE} — with wrong codes offered at signup drawing down the
 * much tighter {@link SIGNUP_CODE_FAILURE_RATE}.
 */
export const CODE_REDEEM_USER_RATE = {
  limit: 5,
  windowMs: 15 * 60_000,
  backoff: true,
} as const;

/**
 * Redeeming a class or mentor code: 100 attempts per IP per 15 minutes.
 *
 * Deliberately loose. The common case for this endpoint is a teacher reading a
 * class code aloud and thirty students joining at once from one school network,
 * behind a single public IP — a per-IP limit near the per-user one would lock
 * out the back half of the room. It exists to bound automated hammering from a
 * single host, with the per-user limit doing the real work.
 */
export const CODE_REDEEM_IP_RATE = {
  limit: 100,
  windowMs: 15 * 60_000,
  backoff: true,
} as const;

/** Grade submissions: 10 per authenticated student per minute (with backoff). */
export const GRADE_STUDENT_RATE = { limit: 10, windowMs: 60_000, backoff: true } as const;

/** Grade submissions: 20 per IP per minute (catches unauthenticated probing). */
export const GRADE_IP_RATE = { limit: 20, windowMs: 60_000, backoff: true } as const;

/** Playground compile: 30 per IP per minute. */
export const COMPILE_IP_RATE = { limit: 30, windowMs: 60_000 } as const;

/** AI challenge generation: 10 per IP per minute (expensive upstream calls). */
export const GENERATE_IP_RATE = { limit: 10, windowMs: 60_000 } as const;
