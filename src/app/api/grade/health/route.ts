import { NextResponse } from "next/server";
import { graderHealth } from "@/lib/graderClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight passthrough to the grader's /healthz — used by the UI to
// surface an "Analyzer offline" badge when something is wrong.
export async function GET() {
  const health = await graderHealth();
  return NextResponse.json(health, {
    status: health.ok ? 200 : 503,
  });
}
