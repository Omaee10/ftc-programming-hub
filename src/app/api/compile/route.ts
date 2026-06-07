import { NextResponse } from "next/server";
import {
  GraderError,
  checkRateLimit,
  clientIdFrom,
  compileViaService,
} from "@/lib/graderClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const client = clientIdFrom(request);
  const rate = checkRateLimit(client);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Too many submissions — slow down a bit." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (typeof body.code !== "string") {
    return NextResponse.json({ error: "Missing `code` (string)." }, { status: 400 });
  }

  try {
    const result = await compileViaService(body.code);
    return NextResponse.json(result);
  } catch (err) {
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
    console.error("compile route failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal grader error." },
      { status: 503 }
    );
  }
}
