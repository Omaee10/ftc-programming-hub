import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

interface UpdateSlotNameBody {
  mentorRowId?: string;
  mentorName?: string;
}

async function canManageMentorRow(
  admin: ReturnType<typeof createAdminClient>,
  requesterUserId: string,
  mentorRowId: string
): Promise<boolean> {
  const { data: target } = await admin
    .from("mentors")
    .select("id, created_by")
    .eq("id", mentorRowId)
    .maybeSingle();

  if (!target) return false;

  const ownerId = (target.created_by as string | null) ?? (target.id as string);

  const { data: requesterRows } = await admin
    .from("mentors")
    .select("id, created_by, user_id")
    .eq("user_id", requesterUserId);

  return (requesterRows ?? []).some((row) => {
    const r = row as { id: string; created_by?: string | null };
    return r.id === ownerId || r.created_by === ownerId;
  });
}

export async function POST(request: Request) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Update mentor name is not configured on the server." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: UpdateSlotNameBody;
  try {
    body = (await request.json()) as UpdateSlotNameBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const mentorRowId = body.mentorRowId?.trim() ?? "";
  const mentorName = body.mentorName?.trim() ?? "";

  if (!mentorRowId) {
    return NextResponse.json({ error: "mentorRowId is required." }, { status: 400 });
  }

  if (!mentorName) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!(await canManageMentorRow(admin, user.id, mentorRowId))) {
    return NextResponse.json(
      { error: "You do not have permission to update this mentor slot." },
      { status: 403 }
    );
  }

  const { data: updated, error } = await admin
    .from("mentors")
    .update({ mentor_name: mentorName })
    .eq("id", mentorRowId)
    .select("id");

  if (error || !updated?.length) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update mentor name." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
