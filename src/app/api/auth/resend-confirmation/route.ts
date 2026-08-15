import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/apiGuard";
import { REQUIRE_EMAIL_CONFIRMATION } from "@/lib/authConfig";
import {
  RESEND_CONFIRMATION_IDENTITY_RATE,
  RESEND_CONFIRMATION_IP_RATE,
  checkRateLimit,
  clientIdFrom,
  rateLimitHeaders,
} from "@/lib/rateLimit";
import {
  createAdminClient,
  getSupabaseEnvStatus,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { normalizeSignupEmail } from "@/lib/supabase/signupEmail";

interface ResendBody {
  email?: string;
}

/**
 * Deliberately identical whether the address has an account, has already been
 * confirmed, or has never been seen. Anything that varies by outcome turns this
 * into an account-existence oracle that needs no password to query — and unlike
 * signup, which has a real reason to say "that email is already registered",
 * there is nothing this caller needs to learn.
 */
const GENERIC_OK =
  "If that address needs confirming, a new link is on its way. "
  + "It can take a minute, and it often lands in spam or junk.";

const TOO_MANY =
  "Too many confirmation emails requested. Wait a few minutes and try again.";

export async function POST(request: Request): Promise<NextResponse> {
  // Nothing to resend when confirmation is off — accounts are created already
  // confirmed. Answered distinctly (not as an error) so the UI can simply not
  // offer the button rather than showing a failure the user cannot act on.
  if (!REQUIRE_EMAIL_CONFIRMATION) {
    return applySecurityHeaders(
      NextResponse.json({ ok: true, confirmationDisabled: true, message: GENERIC_OK })
    );
  }

  const envStatus = getSupabaseEnvStatus();
  if (!hasServiceRoleKey() || envStatus.keyLikelyTruncated || envStatus.refsMatch === false) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            "Confirmation email is not configured on the server. Check SUPABASE_SERVICE_ROLE_KEY and redeploy.",
        },
        { status: 500 }
      )
    );
  }

  const clientIp = clientIdFrom(request);
  const ipRate = checkRateLimit(`auth:resend:ip:${clientIp}`, RESEND_CONFIRMATION_IP_RATE);
  if (!ipRate.ok) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: TOO_MANY },
        { status: 429, headers: rateLimitHeaders(ipRate) }
      )
    );
  }

  let body: ResendBody;
  try {
    body = (await request.json()) as ResendBody;
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    );
  }

  const email = normalizeSignupEmail(body.email ?? "");
  if (!email) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Email is required." }, { status: 400 })
    );
  }

  // Keyed on the address, so one person mashing the button spends their own
  // budget rather than the shared budget of everyone behind a school NAT.
  const identityRate = checkRateLimit(
    `auth:resend:id:${email}`,
    RESEND_CONFIRMATION_IDENTITY_RATE
  );
  if (!identityRate.ok) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: TOO_MANY },
        { status: 429, headers: rateLimitHeaders(identityRate) }
      )
    );
  }

  const admin = createAdminClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
    || new URL(request.url).origin;

  const { error } = await admin.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/login` },
  });

  if (error) {
    // Logged, not surfaced: the caller gets the same answer either way, because
    // "that failed" for an unknown address is itself the oracle this avoids.
    console.error("[resend-confirmation] failed:", error.message);
  }

  return applySecurityHeaders(NextResponse.json({ ok: true, message: GENERIC_OK }));
}
