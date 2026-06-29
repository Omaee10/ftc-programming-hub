import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .select("display_name, account_type")
    .eq("id", user.id)
    .maybeSingle();

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
