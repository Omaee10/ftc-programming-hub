import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/apiGuard";
import {
  SIGNIN_IDENTITY_RATE,
  SIGNIN_IP_RATE,
  checkRateLimit,
  clientIdFrom,
  rateLimitHeaders,
} from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

interface SigninBody {
  email?: string;
  password?: string;
}

const TOO_MANY = "Too many sign-in attempts. Try again later.";

/** Server-side sign in — sets auth cookies via Vercel when the browser cannot reach Supabase. */
export async function POST(request: Request): Promise<NextResponse> {
  // Two buckets, because the two abuses have different shapes. Password guessing
  // targets one account, so the tight limit is keyed on the email and an
  // attacker rotating IPs gains nothing from it. The per-IP limit is loose and
  // exists only to bound automation from a single host — keyed tightly it would
  // lock out a classroom signing in together from one school network, which is
  // what the previous shared 5-per-IP auth limit did.
  const clientIp = clientIdFrom(request);
  const ipRate = checkRateLimit(`auth:signin:ip:${clientIp}`, SIGNIN_IP_RATE);
  if (!ipRate.ok) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: TOO_MANY },
        { status: 429, headers: rateLimitHeaders(ipRate) }
      )
    );
  }

  let body: SigninBody;
  try {
    body = (await request.json()) as SigninBody;
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    );
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    );
  }

  const identityRate = checkRateLimit(`auth:signin:id:${email}`, SIGNIN_IDENTITY_RATE);
  if (!identityRate.ok) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: TOO_MANY },
        { status: 429, headers: rateLimitHeaders(identityRate) }
      )
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return applySecurityHeaders(
      NextResponse.json({ error: error.message }, { status: 401 })
    );
  }

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
