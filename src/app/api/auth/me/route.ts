import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, account_type, email")
    .eq("id", user.id)
    .maybeSingle();

  // Reconcile profiles.email from auth.users, which is the source of truth.
  //
  // Nothing pushes the new address into profiles when an email change is
  // confirmed: supabase.auth.updateUser only sends the confirmation mail, and
  // the account page deliberately no longer writes the unconfirmed value (doing
  // so let a user squat an address they didn't own). So the copy goes stale the
  // moment a change is confirmed — and it is read by findRegisteredSignupEmail
  // and constrained by profiles_email_lower_unique, so a stale row wrongly
  // blocks whoever now legitimately owns the old address.
  //
  // Repairing here rather than via an auth webhook matches how the rest of this
  // codebase reconciles derived state — repairClassMentorLinks and
  // ensureClassCodeForOwner are the same idempotent fix-on-access shape — and
  // needs no new infrastructure. This route runs on essentially every entry
  // path, so the window is short.
  if (profile && user.email && !sameEmail(profile.email as string | null, user.email)) {
    const { error: syncErr } = await supabase
      .from("profiles")
      .update({ email: user.email })
      .eq("id", user.id);

    // Non-fatal: the only expected failure is profiles_email_lower_unique when
    // some other row still holds this address. Surfacing it would break sign-in
    // for an issue the user can't act on, so log it for follow-up instead.
    if (syncErr) {
      console.error("[auth/me] profiles.email reconcile failed:", syncErr.message);
    }
  }

  const accountType = profile?.account_type;
  const normalizedAccountType =
    accountType === "student" || accountType === "mentor" ? accountType : null;

  return NextResponse.json({
    userId: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name?.trim() || null,
    accountType: normalizedAccountType,
  });
}
