import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  getSupabaseEnvStatus,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { deleteUserAccount } from "@/lib/supabase/accountDeletion";

export async function POST() {
  const envStatus = getSupabaseEnvStatus();

  if (!hasServiceRoleKey() || envStatus.keyLikelyTruncated || envStatus.refsMatch === false) {
    return NextResponse.json(
      { error: "Delete account is not configured on the server." },
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

  const admin = createAdminClient();
  const result = await deleteUserAccount(admin, user.id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to delete account." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
