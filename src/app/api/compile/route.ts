import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/apiGuard";
import { GraderError, compileViaService } from "@/lib/graderClient";
import {
  COMPILE_IP_RATE,
  checkRateLimit,
  clientIdFrom,
  rateLimitHeaders,
} from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CODE_BYTES = 50 * 1024;

export async function POST(request: Request) {
  const client = clientIdFrom(request);
  const rate = checkRateLimit(`compile:ip:${client}`, COMPILE_IP_RATE);
  if (!rate.ok) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Too many submissions — slow down a bit." },
        { status: 429, headers: rateLimitHeaders(rate) }
      )
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "Request body must be JSON." }, { status: 400 })
    );
  }

  if (typeof body.code !== "string") {
    return applySecurityHeaders(
      NextResponse.json({ error: "Missing `code` (string)." }, { status: 400 })
    );
  }

  const codeBytes = Buffer.byteLength(body.code, "utf8");
  if (codeBytes > MAX_CODE_BYTES) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: `Code submission exceeds ${MAX_CODE_BYTES / 1024}KB limit.` },
        { status: 413 }
      )
    );
  }

  try {
    const result = await compileViaService(body.code);
    return applySecurityHeaders(NextResponse.json(result));
  } catch (err) {
    if (err instanceof GraderError) {
      const hint =
        err.status === 401
          ? "Grader auth failed — GRADER_SECRET on Vercel must match Render."
          : err.message;
      return applySecurityHeaders(
        NextResponse.json({ error: hint }, { status: err.status >= 500 ? 503 : err.status })
      );
    }
    if (err instanceof Error && err.name === "AbortError") {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              "Analyzer timed out — the grader may still be waking up. Wait a moment and try again.",
          },
          { status: 504 }
        )
      );
    }
    console.error("compile route failed:", err);
    return applySecurityHeaders(
      NextResponse.json(
        { error: err instanceof Error ? err.message : "Internal grader error." },
        { status: 503 }
      )
    );
  }
}
