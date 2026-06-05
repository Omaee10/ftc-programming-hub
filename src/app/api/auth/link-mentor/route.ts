import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  getSupabaseEnvStatus,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import {
  databaseKeyErrorMessage,
  findUnclaimedMentor,
  linkMentorToUser,
  userAlreadyHasClassAccess,
} from "@/lib/supabase/mentorClaim";

interface LinkMentorBody {
  mentorCode?: string;
}

export async function POST(request: Request) {
  const envStatus = getSupabaseEnvStatus();

  if (!hasServiceRoleKey() || envStatus.keyLikelyTruncated || envStatus.refsMatch === false) {
    return NextResponse.json(
      {
        error:
          "Link mentor is not configured on the server. Check SUPABASE_SERVICE_ROLE_KEY on Vercel and redeploy.",
      },
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

  let body: LinkMentorBody;
  try {
    body = (await request.json()) as LinkMentorBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const mentorCode = body.mentorCode?.trim() ?? "";
  if (mentorCode.length !== 6) {
    return NextResponse.json({ error: "Mentor code must be 6 digits." }, { status: 400 });
  }

  const admin = createAdminClient();
  const mentorLookup = await findUnclaimedMentor(admin, mentorCode);

  if (mentorLookup.lookupError) {
    return NextResponse.json(
      { error: databaseKeyErrorMessage(mentorLookup.lookupError) },
      { status: 500 }
    );
  }

  if (!mentorLookup.mentor) {
    return NextResponse.json(
      {
        error:
          "Invalid mentor code. Use the mentor or co-mentor sign-in code from the class dashboard.",
      },
      { status: 400 }
    );
  }

  if (mentorLookup.mentor.user_id === user.id) {
    return NextResponse.json(
      {
        error:
          "This workspace is already linked to your account. Use Sign in to enter your class.",
      },
      { status: 400 }
    );
  }

  if (mentorLookup.mentor.user_id) {
    return NextResponse.json(
      { error: "This mentor code has already been claimed." },
      { status: 400 }
    );
  }

  if (await userAlreadyHasClassAccess(admin, user.id, mentorLookup.mentor)) {
    return NextResponse.json(
      {
        error:
          "You're already part of this class. Use Sign in — you don't need to link it again.",
      },
      { status: 400 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name?.trim() ||
    mentorLookup.mentor.mentor_name?.trim() ||
    mentorLookup.mentor.name;

  const linked = await linkMentorToUser(
    admin,
    mentorLookup.mentor.id,
    user.id,
    displayName
  );
  if (!linked.ok) {
    return NextResponse.json(
      { error: linked.error ?? "Failed to link mentor workspace." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
