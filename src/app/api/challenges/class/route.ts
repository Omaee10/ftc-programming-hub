import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminClientOrNull,
  resolveClassChallengeAuthorIds,
  type ClassChallengeScope,
} from "@/lib/supabase/classChallengeAccess";
import { CHALLENGE_CARD_COLUMNS } from "@/lib/supabase/progressColumns";

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

/** Mentor-authored challenges visible to the signed-in student or mentor workspace. */
export async function GET(request: Request): Promise<NextResponse> {
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
    return NextResponse.json({ challenges: [] });
  }

  const { data, error } = await admin
    .from("challenges")
    .select(CHALLENGE_CARD_COLUMNS)
    .in("created_by", authorIds)
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ challenges: data ?? [] });
}
