import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { ensureClassCodeForOwner } from "@/lib/supabase/classCodeBackfill";
import { repairClassMentorLinks } from "@/lib/supabase/mentorClaim";
import { authorizeMentorWorkspace } from "@/lib/supabase/mentorWorkspaceAuth";

/** Class enrollment code for the signed-in mentor workspace (owner + co-mentors). */
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
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
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

  await repairClassMentorLinks(access.admin, access.ownerId);
  const backfilledClassCode = await ensureClassCodeForOwner(access.admin, access.ownerId);

  const { data: ownerRow, error } = await access.admin
    .from("mentors")
    .select("class_code, class_name, name")
    .eq("id", access.ownerId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    classCode:
      backfilledClassCode
      ?? (ownerRow?.class_code as string | null)
      ?? null,
    className:
      (ownerRow?.class_name as string | null)?.trim()
      || (ownerRow?.name as string | null)?.trim()
      || null,
    teamName: (ownerRow?.name as string | null)?.trim() || null,
  });
}
