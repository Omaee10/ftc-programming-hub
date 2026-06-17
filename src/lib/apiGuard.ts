/**
 * Reusable API request guards and security response headers.
 * Used by proxy.ts for all /api routes and by individual route handlers.
 */

import { NextResponse } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/** Paths that skip User-Agent checks (monitoring, health probes). */
const UA_EXEMPT_PREFIXES = ["/api/auth/health", "/api/grade/health"];

const BLOCKED_UA_PATTERNS = [
  /scrapy/i,
  /python-requests/i,
  /python-urllib/i,
  /httpx\//i,
  /aiohttp/i,
  /curl\//i,
  /wget\//i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /petalbot/i,
  /dotbot/i,
  /mj12bot/i,
  /bingbot/i,
  /googlebot/i,
  /yandexbot/i,
  /baiduspider/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /\bbot\b/i,
  /\bcrawler\b/i,
  /\bspider\b/i,
];

export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const base = contentType.split(";")[0].trim().toLowerCase();
  return base === "application/json";
}

function isUaExempt(pathname: string): boolean {
  return UA_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isBlockedUserAgent(ua: string): boolean {
  return BLOCKED_UA_PATTERNS.some((pattern) => pattern.test(ua));
}

function isMalformedUserAgent(ua: string | null): boolean {
  if (!ua) return true;
  const trimmed = ua.trim();
  if (trimmed.length < 10) return true;
  if (/^[\x00-\x1f\x7f]+$/.test(trimmed)) return true;
  return false;
}

export type ApiGuardResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Validates POST /api requests: Content-Type and User-Agent.
 * Prevents: non-browser scrapers, malformed probes, and bots posting junk.
 */
export function validateApiPostRequest(
  request: Request,
  pathname: string
): ApiGuardResult {
  if (request.method !== "POST") {
    return { ok: true };
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return {
      ok: false,
      response: applySecurityHeaders(
        NextResponse.json(
          { error: "Content-Type must be application/json." },
          { status: 415 }
        )
      ),
    };
  }

  if (!isUaExempt(pathname)) {
    const ua = request.headers.get("user-agent");
    if (isMalformedUserAgent(ua)) {
      return {
        ok: false,
        response: applySecurityHeaders(
          NextResponse.json({ error: "Invalid or missing User-Agent." }, { status: 400 })
        ),
      };
    }
    if (isBlockedUserAgent(ua!)) {
      return {
        ok: false,
        response: applySecurityHeaders(
          NextResponse.json({ error: "Forbidden." }, { status: 403 })
        ),
      };
    }
  }

  return { ok: true };
}
