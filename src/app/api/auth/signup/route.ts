import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface SignupBody {
  email?: string;
  password?: string;
  name?: string;
  studentCode?: string;
  mentorCode?: string;
}

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";
  const studentCode = body.studentCode?.trim() ?? "";
  const mentorCode = body.mentorCode?.trim() ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  if (studentCode && mentorCode) {
    return NextResponse.json(
      { error: "Enter either a student code or a mentor code, not both." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  let displayName = name;

  if (studentCode) {
    if (studentCode.length !== 6) {
      return NextResponse.json({ error: "Student code must be 6 digits." }, { status: 400 });
    }
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("id, name, user_id")
      .eq("code", studentCode)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: "Invalid student code." }, { status: 400 });
    }

    if (student.user_id) {
      return NextResponse.json(
        { error: "This student code has already been claimed." },
        { status: 400 }
      );
    }

    displayName = student.name;
  } else if (mentorCode) {
    if (mentorCode.length !== 6) {
      return NextResponse.json({ error: "Mentor code must be 6 digits." }, { status: 400 });
    }
    const { data: mentor, error: mentorErr } = await admin
      .from("mentors")
      .select("id, mentor_name, name, user_id")
      .eq("code", mentorCode)
      .single();

    if (mentorErr || !mentor) {
      return NextResponse.json({ error: "Invalid mentor code." }, { status: 400 });
    }

    if (mentor.user_id) {
      return NextResponse.json(
        { error: "This mentor code has already been claimed." },
        { status: 400 }
      );
    }

    displayName = mentor.mentor_name?.trim() || mentor.name;
  } else if (!displayName) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr || !authData.user) {
    const message = authErr?.message ?? "Failed to create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = authData.user.id;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    email,
    display_name: displayName,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: profileErr.message ?? "Failed to create profile." },
      { status: 500 }
    );
  }

  if (studentCode) {
    const { data: linked, error: linkErr } = await admin
      .from("students")
      .update({ user_id: userId })
      .eq("code", studentCode)
      .is("user_id", null)
      .select("id");

    if (linkErr || !linked?.length) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: linkErr?.message ?? "Failed to link student code." },
        { status: 500 }
      );
    }
  } else if (mentorCode) {
    const { data: linked, error: linkErr } = await admin
      .from("mentors")
      .update({ user_id: userId })
      .eq("code", mentorCode)
      .is("user_id", null)
      .select("id");

    if (linkErr || !linked?.length) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: linkErr?.message ?? "Failed to link mentor code." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
