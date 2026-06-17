import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/apiGuard";
import { isValidGradeChallengeId } from "@/lib/challengeIds";
import {
  GraderError,
  gradeViaService,
} from "@/lib/graderClient";
import {
  GRADE_IP_RATE,
  GRADE_STUDENT_RATE,
  checkRateLimit,
  clientIdFrom,
  rateLimitHeaders,
} from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CODE_BYTES = 50 * 1024;

function byteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function trimResult(result: Record<string, unknown>): Record<string, unknown> {
  const {
    passed,
    score,
    feedback,
    errors,
    rawCompilerOutput: _raw,
    fullStackTrace: _stack,
    rubricDetails: _rubric,
    ...rest
  } = result as Record<string, unknown>;

  return { passed, score, feedback, errors, ...rest };
}

function rateLimitedResponse(message: string, rate: ReturnType<typeof checkRateLimit>): NextResponse {
  return applySecurityHeaders(
    NextResponse.json(
      { error: message },
      { status: 429, headers: rateLimitHeaders(rate) }
    )
  );
}

export async function POST(request: Request) {
  const clientIp = clientIdFrom(request);

  const ipRate = checkRateLimit(`grade:ip:${clientIp}`, GRADE_IP_RATE);
  if (!ipRate.ok) {
    return rateLimitedResponse("Too many submissions from this network — slow down.", ipRate);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const studentRate = checkRateLimit(`grade:student:${user.id}`, GRADE_STUDENT_RATE);
    if (!studentRate.ok) {
      return rateLimitedResponse("Too many submissions — slow down a bit.", studentRate);
    }
  }

  let body: { code?: string; challengeId?: number; mentorRules?: unknown[] };
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
  if (typeof body.challengeId !== "number" || !Number.isFinite(body.challengeId)) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Missing `challengeId` (number)." }, { status: 400 })
    );
  }

  if (!isValidGradeChallengeId(body.challengeId)) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid challengeId." }, { status: 400 })
    );
  }

  const requestBytes = Buffer.byteLength(body.code, "utf8");
  if (requestBytes > MAX_CODE_BYTES) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: `Code submission exceeds ${MAX_CODE_BYTES / 1024}KB limit.` },
        { status: 413 }
      )
    );
  }

  const graderUrl = process.env.GRADER_URL ?? "http://localhost:8080";
  const egressTarget = `${graderUrl.replace(/\/$/, "")}/compile`;

  console.info("[grade] egress start", {
    client: clientIp,
    userId: user?.id ?? null,
    challengeId: body.challengeId,
    target: egressTarget,
    codeBytes: requestBytes,
  });

  try {
    const started = Date.now();
    const result = await gradeViaService({
      code: body.code,
      challengeId: body.challengeId,
      mentorRules: body.mentorRules,
    });

    const rawBytes = byteSize(result);
    const trimmed = trimResult(result as Record<string, unknown>);
    const trimmedBytes = byteSize(trimmed);

    console.info("[grade] egress ok", {
      client: clientIp,
      userId: user?.id ?? null,
      challengeId: body.challengeId,
      ms: Date.now() - started,
      responseBytesRaw: rawBytes,
      responseBytesAfterTrim: trimmedBytes,
      bytesSaved: rawBytes - trimmedBytes,
    });

    return applySecurityHeaders(
      NextResponse.json(trimmed, {
        headers: {
          "Content-Encoding": "identity",
          "Cache-Control": "no-store",
        },
      })
    );
  } catch (err) {
    console.error("[grade] egress failed", {
      client: clientIp,
      userId: user?.id ?? null,
      challengeId: body.challengeId,
      error: err instanceof Error ? err.message : String(err),
    });

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

    return applySecurityHeaders(
      NextResponse.json(
        { error: err instanceof Error ? err.message : "Internal grader error." },
        { status: 503 }
      )
    );
  }
}
