import { NextResponse } from "next/server";
import {
  GraderError,
  requirementsViaService,
} from "@/lib/graderClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/grade/requirements?challengeId=1
// POST /api/grade/requirements { challengeId, mentorRules }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("challengeId");
  const challengeId = Number(idParam);
  if (!Number.isFinite(challengeId)) {
    return NextResponse.json({ error: "challengeId must be a number." }, { status: 400 });
  }
  try {
    const result = await requirementsViaService(challengeId);
    return NextResponse.json(result);
  } catch (err) {
    return handleErr(err);
  }
}

export async function POST(request: Request) {
  let body: { challengeId?: number; mentorRules?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  if (typeof body.challengeId !== "number" || !Number.isFinite(body.challengeId)) {
    return NextResponse.json({ error: "Missing `challengeId` (number)." }, { status: 400 });
  }
  try {
    const result = await requirementsViaService(body.challengeId, body.mentorRules);
    return NextResponse.json(result);
  } catch (err) {
    return handleErr(err);
  }
}

function handleErr(err: unknown) {
  if (err instanceof GraderError) {
    return NextResponse.json(
      { error: "Analyzer is unreachable. Try again in a moment." },
      { status: 503 }
    );
  }
  console.error("requirements route failed:", err);
  return NextResponse.json({ error: "Internal grader error." }, { status: 500 });
}
