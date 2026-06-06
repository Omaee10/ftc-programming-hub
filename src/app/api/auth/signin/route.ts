import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SigninBody {
  email?: string;
  password?: string;
}

/** Server-side sign in — sets auth cookies via Vercel when the browser cannot reach Supabase. */
export async function POST(request: Request): Promise<NextResponse> {
  let body: SigninBody;
  try {
    body = (await request.json()) as SigninBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
