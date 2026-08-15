import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/apiGuard";
import { REQUIRE_EMAIL_CONFIRMATION } from "@/lib/authConfig";
import {
  SIGNUP_CODE_FAILURE_RATE,
  SIGNUP_IP_RATE,
  checkRateLimit,
  clientIdFrom,
  peekRateLimit,
  rateLimitHeaders,
} from "@/lib/rateLimit";
import {
  createAdminClient,
  getSupabaseEnvStatus,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { joinClassByCode } from "@/lib/supabase/joinClass";
import {
  databaseKeyErrorMessage,
  findUnclaimedMentor,
  linkMentorToUser,
  type MentorClaimRow,
} from "@/lib/supabase/mentorClaim";
import {
  DUPLICATE_SIGNUP_EMAIL_MESSAGE,
  findRegisteredSignupEmail,
  isDuplicateProfileError,
  normalizeSignupEmail,
  signupAuthErrorMessage,
} from "@/lib/supabase/signupEmail";

interface SignupBody {
  email?: string;
  password?: string;
  name?: string;
  accountType?: string;
  studentCode?: string;
  mentorCode?: string;
  /**
   * A class join code, redeemed during signup.
   *
   * Distinct from `studentCode` (a personal, single-use slot code) — this is the
   * shared 6-digit code a mentor reads out to the room, and it is the only code
   * path that works when email confirmation is switched on. Membership is
   * established here, server-side, while the auth user is still unconfirmed, so
   * confirmation gates only signing IN rather than belonging to the class. That
   * is the difference between "check your email" being a wait and being a dead
   * end: on 2026-08-01 it was a dead end, and the cohort made duplicate accounts
   * rather than wait.
   */
  classCode?: string;
  /** Honeypot — real users never see or fill this field. */
  website?: string;
}

const SIX_DIGIT_CODE = /^\d{6}$/;

function guardResponse(body: Record<string, unknown>, status: number): NextResponse {
  return applySecurityHeaders(NextResponse.json(body, { status }));
}

/**
 * Shown when the compensating delete ITSELF failed, so an auth user exists with
 * no `profiles` row. That state is a dead end for the user, not a retry: the
 * next attempt's `findRegisteredSignupEmail` check looks in `profiles`, finds
 * nothing, and lets signup proceed to `createUser` — which fails with "already
 * registered". Telling them to retry would loop them forever, so point them at
 * support instead, and see the loud log for the id to clean up.
 */
const ORPHANED_AUTH_USER_MESSAGE =
  "Account setup failed and could not be cleaned up automatically. "
  + "This email is temporarily unusable — contact support before trying again.";

/**
 * Undo `createUser` after a later step failed.
 *
 * Returns false when the rollback did not happen, so the caller can report the
 * dead end above instead of a plain "try again". The error is logged with the
 * user id and email because manual deletion in the Supabase dashboard is the
 * only way out.
 *
 * Longer-term fix: this whole sequence wants to be one transaction. It is not
 * reachable via a single RPC as written — `auth.admin.createUser` is a GoTrue
 * API call, not SQL, so a Postgres function cannot create the auth user, and
 * the profile insert + code linking cannot run BEFORE it either (profiles.id is
 * a FK to auth.users.id and the trigger-created profiles row is keyed on it).
 * The tractable version is an RPC that does the profile insert and the student/
 * mentor code linking together in one transaction, called once after
 * createUser: that collapses three failure points into one, leaving a single
 * compensating delete rather than three. Worth doing, but it is a schema-level
 * change (new SECURITY DEFINER function + tests), not part of this sweep.
 */
async function rollbackAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  reason: string
): Promise<boolean> {
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    console.error(
      `[signup] ORPHANED AUTH USER — manual cleanup required. `
      + `userId=${userId} email=${email} reason="${reason}" `
      + `deleteError="${error.message}". `
      + `Delete this user in Supabase Auth or the email stays unusable.`
    );
    return false;
  }

  return true;
}

const TOO_MANY_CODES =
  "Too many incorrect codes from this network. Wait a few minutes and try again.";

export async function POST(request: Request) {
  const clientIp = clientIdFrom(request);
  const codeFailureKey = `auth:signup:badcode:${clientIp}`;
  const rate = checkRateLimit(`auth:signup:${clientIp}`, SIGNUP_IP_RATE);
  if (!rate.ok) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Too many signup attempts. Try again later." },
        { status: 429, headers: rateLimitHeaders(rate) }
      )
    );
  }

  const envStatus = getSupabaseEnvStatus();

  if (!envStatus.urlProjectRef) {
    return NextResponse.json(
      {
        error:
          "Signup is not configured on the server. Add NEXT_PUBLIC_SUPABASE_URL to your environment.",
      },
      { status: 500 }
    );
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error:
          "Signup is not configured on the server. Add SUPABASE_SERVICE_ROLE_KEY to your environment.",
      },
      { status: 500 }
    );
  }

  if (envStatus.keyLikelyTruncated) {
    return NextResponse.json(
      {
        error:
          "Server database key looks truncated. Re-copy the full service_role secret into SUPABASE_SERVICE_ROLE_KEY and redeploy.",
      },
      { status: 500 }
    );
  }

  if (envStatus.refsMatch === false) {
    return NextResponse.json(
      {
        error:
          "Server Supabase keys do not match. The service role key must come from the same project as your Supabase URL.",
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

  const email = normalizeSignupEmail(body.email ?? "");
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";
  const accountType = body.accountType === "mentor" ? "mentor" : body.accountType === "student" ? "student" : null;
  const studentCode = body.studentCode?.trim() ?? "";
  const mentorCode = body.mentorCode?.trim() ?? "";
  const classCode = body.classCode?.trim() ?? "";
  const honeypot = body.website?.trim() ?? "";

  if (honeypot) {
    return guardResponse({ error: "Unable to create account." }, 400);
  }

  if (!email || !password) {
    return guardResponse({ error: "Email and password are required." }, 400);
  }

  if (password.length < 6) {
    return guardResponse({ error: "Password must be at least 6 characters." }, 400);
  }

  const suppliedCodes = [studentCode, mentorCode, classCode].filter(Boolean);
  if (suppliedCodes.length > 1) {
    return NextResponse.json(
      { error: "Enter only one code — a student, mentor, or class code." },
      { status: 400 }
    );
  }

  /**
   * Charge a wrong code to the failure bucket and answer with its 400 — unless
   * that pushes this network over the limit, in which case answer 429 instead.
   * Only wrong codes land here, so thirty students redeeming thirty valid codes
   * from one school NAT never draw the bucket down.
   */
  function rejectBadCode(message: string): NextResponse {
    const failure = checkRateLimit(codeFailureKey, SIGNUP_CODE_FAILURE_RATE);
    if (!failure.ok) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: TOO_MANY_CODES },
          { status: 429, headers: rateLimitHeaders(failure) }
        )
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Gate before looking anything up. Charging only on failure leaves the bucket
  // unconsulted on the way in, so an attacker who has already burned through it
  // would still have a correct guess honoured.
  if (suppliedCodes.length > 0 && !peekRateLimit(codeFailureKey, SIGNUP_CODE_FAILURE_RATE)) {
    return applySecurityHeaders(
      NextResponse.json({ error: TOO_MANY_CODES }, { status: 429 })
    );
  }

  const admin = createAdminClient();
  let displayName = name;
  let mentorToClaim: MentorClaimRow | null = null;

  if (studentCode) {
    if (!SIX_DIGIT_CODE.test(studentCode)) {
      return guardResponse({ error: "Student code must be 6 digits." }, 400);
    }
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("id, name, user_id")
      .eq("code", studentCode)
      .maybeSingle();

    if (studentErr) {
      return NextResponse.json(
        { error: databaseKeyErrorMessage(studentErr.message) },
        { status: 500 }
      );
    }

    if (!student) {
      return rejectBadCode("Invalid student code.");
    }

    if (student.user_id) {
      return rejectBadCode("This student code has already been claimed.");
    }

    displayName = student.name;
  } else if (mentorCode) {
    if (!SIX_DIGIT_CODE.test(mentorCode)) {
      return guardResponse({ error: "Mentor code must be 6 digits." }, 400);
    }

    const mentorLookup = await findUnclaimedMentor(admin, mentorCode);
    mentorToClaim = mentorLookup.mentor;

    if (mentorLookup.lookupError) {
      return NextResponse.json(
        { error: databaseKeyErrorMessage(mentorLookup.lookupError) },
        { status: 500 }
      );
    }

    if (!mentorToClaim) {
      return rejectBadCode(
        "Invalid mentor code. Use your personal mentor or co-mentor sign-in code from the dashboard — not the student class code."
      );
    }

    if (mentorToClaim.user_id) {
      return rejectBadCode("This mentor code has already been claimed.");
    }

    displayName = mentorToClaim.mentor_name?.trim() || mentorToClaim.name;
  } else if (classCode) {
    // Validated for shape only here; joinClassByCode resolves it after the auth
    // user exists, since joining needs a user id and a profile row to name.
    if (!SIX_DIGIT_CODE.test(classCode)) {
      return guardResponse({ error: "Class code must be 6 digits." }, 400);
    }
    if (!displayName) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }
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

  const emailLookup = await findRegisteredSignupEmail(admin, email);
  if (emailLookup.lookupError) {
    return NextResponse.json(
      { error: databaseKeyErrorMessage(emailLookup.lookupError) },
      { status: 500 }
    );
  }

  if (emailLookup.exists) {
    return NextResponse.json({ error: DUPLICATE_SIGNUP_EMAIL_MESSAGE }, { status: 400 });
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: !REQUIRE_EMAIL_CONFIRMATION,
  });

  if (authErr || !authData.user) {
    const message = signupAuthErrorMessage(authErr?.message ?? "Failed to create account.");
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

  if (!studentCode && !mentorCode && !classCode && accountType) {
    profilePayload.account_type = accountType;
  } else if (studentCode || classCode) {
    // A class code always resolves to a student row, so it fixes the type the
    // same way a personal student code does.
    profilePayload.account_type = "student";
  } else if (mentorCode) {
    profilePayload.account_type = "mentor";
  }

  const { error: profileErr } = await admin.from("profiles").insert(profilePayload);

  if (profileErr) {
    const rolledBack = await rollbackAuthUser(admin, userId, email, "profile insert failed");
    const profileMessage = isDuplicateProfileError(profileErr.message ?? "")
      ? DUPLICATE_SIGNUP_EMAIL_MESSAGE
      : (profileErr.message ?? "Failed to create profile.");
    return NextResponse.json(
      { error: rolledBack ? profileMessage : ORPHANED_AUTH_USER_MESSAGE },
      { status: rolledBack ? 400 : 500 }
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
      const rolledBack = await rollbackAuthUser(
        admin,
        userId,
        email,
        "student code linking failed"
      );
      return NextResponse.json(
        {
          error: rolledBack
            ? (linkErr?.message ?? "Failed to link student code.")
            : ORPHANED_AUTH_USER_MESSAGE,
        },
        { status: 500 }
      );
    }
  } else if (mentorToClaim) {
    const linked = await linkMentorToUser(admin, mentorToClaim.id, userId, displayName);
    if (!linked.ok) {
      const rolledBack = await rollbackAuthUser(
        admin,
        userId,
        email,
        "mentor code linking failed"
      );
      return NextResponse.json(
        {
          error: rolledBack
            ? (linked.error ?? "Failed to link mentor code.")
            : ORPHANED_AUTH_USER_MESSAGE,
        },
        { status: 500 }
      );
    }
  }

  // Enroll before confirmation, not after. The auth user may still be
  // unconfirmed at this point, and that is the whole point: the student row is
  // created and linked now, so a confirmation link that is slow, filtered, or
  // ignored delays sign-in rather than costing them their place in the class.
  let joinedTeamName: string | null = null;
  if (classCode) {
    const joined = await joinClassByCode(admin, userId, classCode);

    if (!joined.ok) {
      // Roll back rather than keep a half-set-up account, matching the student
      // and mentor code paths above. A mistyped class code should send them back
      // to the form with the email still usable, not strand an account that owns
      // nothing — stranded accounts are what this whole change exists to stop.
      const rolledBack = await rollbackAuthUser(
        admin,
        userId,
        email,
        "class code join failed"
      );

      if (!rolledBack) {
        return NextResponse.json({ error: ORPHANED_AUTH_USER_MESSAGE }, { status: 500 });
      }

      // A wrong code is a wrong code wherever it is caught, so it draws down the
      // same bucket as the pre-createUser paths.
      return joined.status === 400
        ? rejectBadCode(joined.error)
        : NextResponse.json({ error: joined.error }, { status: joined.status });
    }

    joinedTeamName = joined.teamName;
  }

  if (REQUIRE_EMAIL_CONFIRMATION) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
      || new URL(request.url).origin;

    const { error: resendErr } = await admin.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${siteUrl}/login`,
      },
    });

    if (resendErr) {
      console.error("[signup] confirmation email failed:", resendErr.message);
      // Deliberately still a success. The account exists and any class join has
      // already been committed, so answering with an error here would tell the
      // user that signup failed when it did not — and a user who believes signup
      // failed signs up again with a different address. That is precisely the
      // duplicate-account pattern of 2026-08-01. The client gets a flag instead
      // and shows the pending screen with the send failure called out, so the
      // obvious next move is Resend rather than Start over.
      return guardResponse(
        {
          ok: true,
          emailConfirmationRequired: true,
          confirmationEmailFailed: true,
          ...(joinedTeamName ? { joinedTeamName } : {}),
        },
        200
      );
    }
  }

  return guardResponse(
    {
      ok: true,
      emailConfirmationRequired: REQUIRE_EMAIL_CONFIRMATION,
      ...(joinedTeamName ? { joinedTeamName } : {}),
    },
    200
  );
}
