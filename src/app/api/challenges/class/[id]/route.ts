import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminClientOrNull,
  resolveClassChallengeAuthorIds,
  type ClassChallengeScope,
} from "@/lib/supabase/classChallengeAccess";
import { isCustomChallengeId } from "@/lib/classChallenges";
import { CHALLENGE_DETAIL_COLUMNS } from "@/lib/supabase/progressColumns";

function parseScope(request: Request): ClassChallengeScope | null {
  const params = new URL(request.url).searchParams;
  const workspaceId = params.get("workspaceId")?.trim();
  const role = params.get("role");
  const parentMentorId = params.get("parentMentorId")?.trim() || undefined;

  if (!workspaceId || (role !== "mentor" && role !== "student")) {
    return null;
  }

  return { workspaceId, role, parentMentorId };
}

/** Load one mentor-authored challenge when RLS blocks direct client reads. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const challengeId = Number(id);

  if (!Number.isFinite(challengeId) || !isCustomChallengeId(challengeId)) {
    return NextResponse.json({ error: "Invalid challenge id." }, { status: 400 });
  }

  const scope = parseScope(request);
  if (!scope) {
    return NextResponse.json({ error: "workspaceId and role are required." }, { status: 400 });
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClientOrNull();
  if (!admin) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const authorIds = await resolveClassChallengeAuthorIds(user.id, scope);
  if (!authorIds || authorIds.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("challenges")
    .select(CHALLENGE_DETAIL_COLUMNS)
    .eq("id", challengeId)
    .in("created_by", authorIds)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }

  return NextResponse.json({ challenge: data });
}
