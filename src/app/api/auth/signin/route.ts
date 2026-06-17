import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/apiGuard";
import { AUTH_RATE, checkRateLimit, clientIdFrom, rateLimitHeaders } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

interface SigninBody {
  email?: string;
  password?: string;
}

/** Server-side sign in — sets auth cookies via Vercel when the browser cannot reach Supabase. */
export async function POST(request: Request): Promise<NextResponse> {
  const clientIp = clientIdFrom(request);
  const rate = checkRateLimit(`auth:signin:${clientIp}`, AUTH_RATE);
  if (!rate.ok) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Too many sign-in attempts. Try again later." },
        { status: 429, headers: rateLimitHeaders(rate) }
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return applySecurityHeaders(
      NextResponse.json({ error: error.message }, { status: 401 })
    );
  }

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
