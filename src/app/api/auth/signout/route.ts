import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Server-side sign out — works when the browser cannot reach Supabase directly. */
export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
