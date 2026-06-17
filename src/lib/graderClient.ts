/**
 * Server-only client + cache + rate limiter for the Java grader service.
 *
 * The grader runs as a separate microservice (see `grader/`). The Next.js API
 * routes in src/app/api/grade/* are thin proxies that hit this helper.
 *
 * Cache: SHA-256 over `(code, challengeId, mentorRulesJson)` keys an LRU of
 * recent results. Re-submits of identical code skip the network round-trip.
 *
 * Rate limits live in src/lib/rateLimit.ts and are enforced by the API routes.
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
  if (url.includes("vercel.app")) {
    return "GRADER_URL must be your Render grader URL (https://….onrender.com), not your Vercel website URL.";
  }
  return null;
}

function graderResponseError(status: number, text: string): GraderError {
  if (status === 404) {
    return new GraderError(
      "GRADER_URL points to the wrong server (404 on /compile). " +
        "In Vercel, set GRADER_URL to your Render Docker grader URL — copy it from the Render dashboard. " +
        `Test first: curl ${GRADER_URL.replace(/\/$/, "")}/healthz`,
      503
    );
  }
  const httpStatus = status >= 500 ? 503 : status;
  return new GraderError(
    `Grader returned ${status}: ${text || "error"}`,
    httpStatus
  );
}

const CACHE_MAX = 256;

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

function buildCompileBody(
  payload: {
    code: string;
    challengeId: number;
    mentorRules?: unknown[];
    compileOnly?: boolean;
  },
  slim: boolean
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: payload.code,
    challengeId: payload.challengeId,
  };
  if (slim) {
    body.slim = true;
  }
  if (payload.compileOnly) {
    body.compileOnly = true;
  }
  if (
    payload.challengeId >= 1000 &&
    payload.mentorRules &&
    (payload.mentorRules as unknown[]).length > 0
  ) {
    body.mentorRules = payload.mentorRules;
  }
  return body;
}

/** Older grader images reject the `slim` field until redeployed. */
function graderRejectedSlim(status: number, text: string): boolean {
  return status === 400 && /Unrecognized field "slim"/i.test(text);
}

async function postCompile<T>(payload: {
  code: string;
  challengeId: number;
  mentorRules?: unknown[];
  compileOnly?: boolean;
}): Promise<T> {
  let res = await fetchWithTimeout(
    `${GRADER_URL}/compile`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(buildCompileBody(payload, true)),
    },
    GRADER_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (graderRejectedSlim(res.status, text)) {
      res = await fetchWithTimeout(
        `${GRADER_URL}/compile`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(buildCompileBody(payload, false)),
        },
        GRADER_TIMEOUT_MS
      );
      if (!res.ok) {
        const retryText = await res.text().catch(() => "");
        throw graderResponseError(res.status, retryText);
      }
      return (await res.json()) as T;
    }
    throw graderResponseError(res.status, text);
  }

  return (await res.json()) as T;
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
  if (cached) {
    console.info("[grade] egress skipped (cache hit)", {
      challengeId: payload.challengeId,
      target: `${GRADER_URL.replace(/\/$/, "")}/compile`,
    });
    return cached;
  }

  console.info("[grade] egress fetch", {
    challengeId: payload.challengeId,
    target: `${GRADER_URL.replace(/\/$/, "")}/compile`,
  });
  const json = await postCompile<T>(payload);
  cacheSet(key, json);
  return json;
}

/** Compile-only check for the free-form Code Playground (no rubric). */
export async function compileViaService<T = unknown>(code: string): Promise<T> {
  const configError = graderMisconfigured();
  if (configError) throw new GraderError(configError, 503);

  const key = cacheKey(0, code, "compileOnly");
  const cached = cacheGet<T>(key);
  if (cached) return cached;

  const json = await postCompile<T>({ code, challengeId: 0, compileOnly: true });
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
      throw graderResponseError(res.status, text);
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
    throw graderResponseError(res.status, text);
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
