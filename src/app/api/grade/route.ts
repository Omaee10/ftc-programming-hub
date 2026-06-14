import { NextResponse } from "next/server";
import {
  GraderError,
  checkRateLimit,
  clientIdFrom,
  gradeViaService,
} from "@/lib/graderClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function byteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

// Strip fields that are large and not needed by the client UI.
// Adjust this allowlist to match what your frontend actually reads.
function trimResult(result: Record<string, unknown>): Record<string, unknown> {
  const {
    passed,
    score,
    feedback,
    errors,
    // drop these if your UI doesn't use them:
    rawCompilerOutput: _raw,
    fullStackTrace: _stack,
    rubricDetails: _rubric,
    ...rest
  } = result as Record<string, unknown>;

  return { passed, score, feedback, errors, ...rest };
}

// ── route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const client = clientIdFrom(request);
  const rate = checkRateLimit(client);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Too many submissions — slow down a bit." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  let body: { code?: string; challengeId?: number; mentorRules?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (typeof body.code !== "string")
    return NextResponse.json({ error: "Missing `code` (string)." }, { status: 400 });
  if (typeof body.challengeId !== "number" || !Number.isFinite(body.challengeId))
    return NextResponse.json({ error: "Missing `challengeId` (number)." }, { status: 400 });

  const graderUrl = process.env.GRADER_URL ?? "http://localhost:8080";
  const egressTarget = `${graderUrl.replace(/\/$/, "")}/compile`;

  const requestBytes = Buffer.byteLength(body.code, "utf8");

  console.info("[grade] egress start", {
    client,
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
      client,
      challengeId: body.challengeId,
      ms: Date.now() - started,
      responseBytesRaw: rawBytes,
      responseBytesAfterTrim: trimmedBytes,
      // Watch this number — if it's consistently > 10KB something is bloated
      bytesSaved: rawBytes - trimmedBytes,
    });

    return NextResponse.json(trimmed, {
      headers: {
        // Tells Vercel/Next.js to gzip this response
        "Content-Encoding": "identity", // remove this line if your host auto-compresses
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[grade] egress failed", {
      client,
      challengeId: body.challengeId,
      error: err instanceof Error ? err.message : String(err),
    });

    if (err instanceof GraderError) {
      const hint =
        err.status === 401
          ? "Grader auth failed — GRADER_SECRET on Vercel must match Render."
          : err.message;
      return NextResponse.json({ error: hint }, { status: err.status >= 500 ? 503 : err.status });
    }
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Analyzer timed out — the grader may still be waking up. Wait a moment and try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal grader error." },
      { status: 503 }
    );
  }
}
