import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

interface SignupBody {
  email?: string;
  password?: string;
  name?: string;
  accountType?: string;
  studentCode?: string;
  mentorCode?: string;
}

interface MentorClaimRow {
  id: string;
  mentor_name: string | null;
  name: string;
  user_id: string | null;
}

async function findUnclaimedMentor(
  admin: ReturnType<typeof createAdminClient>,
  code: string
): Promise<MentorClaimRow | null> {
  const { data: byMentorCode } = await admin
    .from("mentors")
    .select("id, mentor_name, name, user_id")
    .eq("code", code)
    .maybeSingle();

  if (byMentorCode) {
    return byMentorCode as MentorClaimRow;
  }

  const { data: byClassCode } = await admin
    .from("mentors")
    .select("id, mentor_name, name, user_id")
    .eq("class_code", code)
    .is("created_by", null)
    .maybeSingle();

  return (byClassCode as MentorClaimRow | null) ?? null;
}

export async function POST(request: Request) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error:
          "Signup is not configured on the server. Add SUPABASE_SERVICE_ROLE_KEY to your environment.",
      },
      { status: 500 }
    );
  }

  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";
  const accountType = body.accountType === "mentor" ? "mentor" : body.accountType === "student" ? "student" : null;
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
  let mentorToClaim: MentorClaimRow | null = null;

  if (studentCode) {
    if (studentCode.length !== 6) {
      return NextResponse.json({ error: "Student code must be 6 digits." }, { status: 400 });
    }
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("id, name, user_id")
      .eq("code", studentCode)
      .maybeSingle();

    if (studentErr) {
      return NextResponse.json(
        { error: "Could not verify student code. Try again." },
        { status: 500 }
      );
    }

    if (!student) {
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

    mentorToClaim = await findUnclaimedMentor(admin, mentorCode);

    if (!mentorToClaim) {
      return NextResponse.json(
        {
          error:
            "Invalid mentor code. Use your mentor sign-in code or class code from when the class was created.",
        },
        { status: 400 }
      );
    }

    if (mentorToClaim.user_id) {
      return NextResponse.json(
        { error: "This mentor code has already been claimed." },
        { status: 400 }
      );
    }

    displayName = mentorToClaim.mentor_name?.trim() || mentorToClaim.name;
  } else {
    if (!displayName) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }
    if (!accountType) {
      return NextResponse.json(
        { error: "Select whether you are a student or mentor." },
        { status: 400 }
      );
    }
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

  const profilePayload: {
    id: string;
    email: string;
    display_name: string;
    account_type?: "student" | "mentor";
  } = {
    id: userId,
    email,
    display_name: displayName,
  };

  if (!studentCode && !mentorCode && accountType) {
    profilePayload.account_type = accountType;
  } else if (studentCode) {
    profilePayload.account_type = "student";
  } else if (mentorCode) {
    profilePayload.account_type = "mentor";
  }

  const { error: profileErr } = await admin.from("profiles").insert(profilePayload);

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
  } else if (mentorToClaim) {
    const { data: linked, error: linkErr } = await admin
      .from("mentors")
      .update({ user_id: userId })
      .eq("id", mentorToClaim.id)
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
