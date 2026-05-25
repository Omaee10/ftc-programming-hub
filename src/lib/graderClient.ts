/**
 * Server-only client + cache + rate limiter for the Java grader service.
 *
 * The grader runs as a separate microservice (see `grader/`). The Next.js API
 * routes in src/app/api/grade/* are thin proxies that hit this helper.
 *
 * Cache: SHA-256 over `(code, challengeId, mentorRulesJson)` keys an LRU of
 * recent results. Re-submits of identical code skip the network round-trip.
 *
 * Rate limit: 30 grades/minute per client identifier (defaults to the
 * forwarded-for IP). Returns 429 when exceeded.
 */

import { createHash } from "node:crypto";

const GRADER_URL = process.env.GRADER_URL ?? "http://localhost:8080";
const GRADER_SECRET = process.env.GRADER_SECRET ?? "";
const GRADER_TIMEOUT_MS = Number(process.env.GRADER_TIMEOUT_MS ?? 60_000);

function graderMisconfigured(): string | null {
  const url = process.env.GRADER_URL?.trim();
  if (!url) {
    return "GRADER_URL is not set on the server. Add it in Vercel → Settings → Environment Variables, then redeploy.";
  }
  if (
    (process.env.VERCEL || process.env.NODE_ENV === "production") &&
    /localhost|127\.0\.0\.1/.test(url)
  ) {
    return "GRADER_URL still points at localhost. Set it to your Render grader URL in Vercel, then redeploy.";
  }
  if ((process.env.VERCEL || process.env.NODE_ENV === "production") && !GRADER_SECRET) {
    return "GRADER_SECRET is not set on the server. Add the same secret as Render in Vercel, then redeploy.";
  }
  return null;
}

const CACHE_MAX = 256;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;

// ─── LRU cache ────────────────────────────────────────────────────────────

type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60_000;

function cacheKey(challengeId: number, code: string, extra: string = ""): string {
  return createHash("sha256")
    .update(`${challengeId}\0${extra}\0${code}`)
    .digest("hex");
}

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU bump
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet<T>(key: string, value: T): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

// ─── Rate limiter ─────────────────────────────────────────────────────────

const buckets = new Map<string, number[]>();

export function checkRateLimit(client: string): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const hits = (buckets.get(client) ?? []).filter((t) => t >= cutoff);
  if (hits.length >= RATE_LIMIT) {
    const retryAfterMs = Math.max(0, hits[0] + RATE_WINDOW_MS - now);
    buckets.set(client, hits);
    return { ok: false, retryAfterMs };
  }
  hits.push(now);
  buckets.set(client, hits);
  return { ok: true, retryAfterMs: 0 };
}

export function clientIdFrom(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

// ─── Grader transport ─────────────────────────────────────────────────────

export type GraderHealth = { ok: true; stubs: number; libs: number } | { ok: false; error: string };

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    const reason = e instanceof Error ? e.message : "network error";
    throw new GraderError(
      `Cannot reach grader at ${GRADER_URL} (${reason}). If Render is on the free tier, wait ~60s and try again.`,
      503
    );
  } finally {
    clearTimeout(timer);
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (GRADER_SECRET) h["X-Grader-Secret"] = GRADER_SECRET;
  return h;
}

export async function gradeViaService<T = unknown>(payload: {
  code: string;
  challengeId: number;
  mentorRules?: unknown[];
}): Promise<T> {
  const configError = graderMisconfigured();
  if (configError) throw new GraderError(configError, 503);

  const key = cacheKey(
    payload.challengeId,
    payload.code,
    JSON.stringify(payload.mentorRules ?? [])
  );
  const cached = cacheGet<T>(key);
  if (cached) return cached;

  const res = await fetchWithTimeout(
    `${GRADER_URL}/compile`,
    { method: "POST", headers: headers(), body: JSON.stringify(payload) },
    GRADER_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GraderError(`Grader returned ${res.status}: ${text || res.statusText}`, res.status);
  }
  const json = (await res.json()) as T;
  cacheSet(key, json);
  return json;
}

export async function requirementsViaService<T = unknown>(
  challengeId: number,
  mentorRules?: unknown[]
): Promise<T> {
  const configError = graderMisconfigured();
  if (configError) throw new GraderError(configError, 503);

  // GET when no mentor rules, POST otherwise — the Java side supports both.
  if (!mentorRules || mentorRules.length === 0) {
    const res = await fetchWithTimeout(
      `${GRADER_URL}/requirements?challengeId=${encodeURIComponent(String(challengeId))}`,
      { method: "GET", headers: headers() },
      GRADER_TIMEOUT_MS
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new GraderError(`Grader returned ${res.status}: ${text || res.statusText}`, res.status);
    }
    return (await res.json()) as T;
  }

  const res = await fetchWithTimeout(
    `${GRADER_URL}/requirements`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ challengeId, mentorRules }),
    },
    GRADER_TIMEOUT_MS
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GraderError(`Grader returned ${res.status}: ${text || res.statusText}`, res.status);
  }
  return (await res.json()) as T;
}

export async function graderHealth(): Promise<GraderHealth> {
  const configError = graderMisconfigured();
  if (configError) return { ok: false, error: configError };

  try {
    const res = await fetchWithTimeout(
      `${GRADER_URL}/healthz`,
      { method: "GET" },
      Math.min(GRADER_TIMEOUT_MS, 3000)
    );
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return (await res.json()) as GraderHealth;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export class GraderError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GraderError";
  }
}
