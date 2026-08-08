import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { authorizeMentorWorkspace } from "@/lib/supabase/mentorWorkspaceAuth";
import { getChallengeSolution, SOLUTION_IDS } from "@/data/challengeSolutions";
import { isBlocksEnabled } from "@/data/blockChallenges";

/**
 * Mentor-only reference solutions.
 *
 * These used to reach the browser two ways, both of which handed the full answer
 * key to anyone who asked:
 *
 *   1. AnswerKeyClient value-imported `@/data/challengeSolutions`, so every
 *      solution was compiled into the client chunk for /challenges/answer-key.
 *   2. The [id] page resolved the solution on the server and passed it as a prop
 *      to a client component, which serialises it into the RSC payload embedded
 *      in the HTML — delivered before any client-side guard could redirect.
 *
 * Both guards in front of that were client-controlled: the `ftc-hub-role` cookie
 * is written by plain document.cookie, and the session role is read from
 * localStorage. Neither survives a student opening devtools.
 *
 * Solutions now leave the server only through this route, which verifies mentor
 * status against the database via authorizeMentorWorkspace — the same check the
 * rest of /api/mentor/* uses. The client-side role checks remain, but purely as
 * a fast redirect; this is the actual gate.
 *
 * Without `challengeId`: index metadata (which challenges have a key, and
 * whether it ships blocks) — enough to render the catalog, no solution content.
 * With `challengeId`: the single full solution.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY for answer keys." },
      { status: 500 }
    );
  }

  const params = new URL(request.url).searchParams;
  const workspaceId = params.get("workspaceId")?.trim();
  const parentMentorId = params.get("parentMentorId")?.trim() || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const access = await authorizeMentorWorkspace(user.id, workspaceId, parentMentorId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Answer keys must never sit in a shared or browser cache.
  const noStore = { "Cache-Control": "no-store" };

  const challengeIdRaw = params.get("challengeId");

  if (challengeIdRaw === null) {
    return NextResponse.json(
      {
        solutions: SOLUTION_IDS.map((id) => ({
          id,
          hasBlocks: !!getChallengeSolution(id)?.blocks || isBlocksEnabled(id),
        })),
      },
      { headers: noStore }
    );
  }

  const challengeId = Number(challengeIdRaw);
  if (!Number.isInteger(challengeId)) {
    return NextResponse.json({ error: "Invalid challengeId." }, { status: 400 });
  }

  const solution = getChallengeSolution(challengeId);
  if (!solution) {
    return NextResponse.json(
      { error: "No reference solution for that challenge." },
      { status: 404 }
    );
  }

  return NextResponse.json({ solution }, { headers: noStore });
}
