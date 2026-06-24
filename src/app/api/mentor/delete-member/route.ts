import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { authorizeMentorWorkspace } from "@/lib/supabase/mentorWorkspaceAuth";

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    type?: "student" | "mentor";
    memberId?: string;
    workspaceId?: string;
    parentMentorId?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, memberId, workspaceId, parentMentorId } = body;

  if (!type || !memberId || !workspaceId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY for class management." },
      { status: 500 }
    );
  }

  const access = await authorizeMentorWorkspace(user.id, workspaceId, parentMentorId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ownerId, admin } = access;

  if (type === "student") {
    const { data: student, error: lookupErr } = await admin
      .from("students")
      .select("id, mentor_id")
      .eq("id", memberId)
      .maybeSingle();

    if (lookupErr) {
      return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    if ((student.mentor_id as string) !== ownerId) {
      return NextResponse.json(
        { error: "That student is not in your class." },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await admin
      .from("students")
      .delete()
      .eq("id", memberId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (type === "mentor") {
    if (memberId === ownerId) {
      return NextResponse.json(
        { error: "You cannot delete the class owner account." },
        { status: 400 }
      );
    }

    const { data: coMentor, error: lookupErr } = await admin
      .from("mentors")
      .select("id, created_by")
      .eq("id", memberId)
      .maybeSingle();

    if (lookupErr) {
      return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    }

    if (!coMentor) {
      return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
    }

    if ((coMentor.created_by as string | null) !== ownerId) {
      return NextResponse.json(
        { error: "You can only remove co-mentors in your class." },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await admin
      .from("mentors")
      .delete()
      .eq("id", memberId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
