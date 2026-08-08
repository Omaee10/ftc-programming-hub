import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStudentWorkspace } from "@/lib/supabase/mentorWorkspaceAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Same ceiling the grader applies to submitted code. */
const MAX_CODE_BYTES = 50 * 1024;

type FlushBody = {
  studentId?: string;
  challengeId?: number;
  code?: string;
  completed?: boolean;
};

/**
 * Last-gasp save of the editor's contents as the page goes away.
 *
 * Exists because the client cannot do this itself on `pagehide`. The normal save
 * path is a supabase-js upsert, i.e. a plain fetch, and browsers cancel in-flight
 * fetches during unload — so the flush that ChallengeWorkspace fires when a
 * student closes the tab was routinely killed mid-request. The local draft still
 * landed (that write is synchronous localStorage), so nothing was lost on the same
 * device, but the cloud snapshot stayed stale and the student's work did not
 * follow them to another one.
 *
 * navigator.sendBeacon survives unload by design and carries cookies, which is why
 * this is a route rather than a keepalive fetch straight to PostgREST: the beacon
 * authenticates with the session cookie and never needs the access token, and
 * supabase-js exposes no way to set `keepalive` on a single request.
 *
 * A beacon is fire-and-forget — the client cannot read the response — so the
 * status codes here are for logs and curl, not for callers.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: FlushBody;
  try {
    body = (await request.json()) as FlushBody;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const studentId = body.studentId?.trim();
  const { challengeId, code } = body;

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }
  if (typeof challengeId !== "number" || !Number.isFinite(challengeId)) {
    return NextResponse.json({ error: "challengeId is required." }, { status: 400 });
  }
  if (typeof code !== "string") {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }
  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    return NextResponse.json({ error: "Code snapshot too large." }, { status: 413 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The beacon carries a studentId from the client, so ownership is re-checked
  // here rather than trusted — same guard the homework routes use.
  const access = await authorizeStudentWorkspace(user.id, studentId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // `completed` is only ever raised, never cleared: the beacon reports what the
  // client believed at unload, and a stale `false` arriving after a completion
  // landed by another path must not revert it. COALESCE-style merge via the
  // existing row would need a read first, so instead the flag is simply omitted
  // when the client says false.
  const payload: Record<string, unknown> = {
    student_id: studentId,
    challenge_id: challengeId,
    code_snapshot: code,
    updated_at: now,
  };
  if (body.completed === true) {
    payload.completed = true;
  }

  const { error } = await access.admin
    .from("student_challenge_progress")
    .upsert(payload, { onConflict: "student_id,challenge_id" });

  if (error) {
    console.error("[progress-flush] upsert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
