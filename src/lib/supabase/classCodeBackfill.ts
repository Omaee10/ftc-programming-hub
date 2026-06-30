import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAccessCode, isUniqueViolation } from "@/lib/accessCodes";

function normalizeClassCode(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Ensure a class owner row has a student join code; generate one if missing. */
export async function ensureClassCodeForOwner(
  admin: SupabaseClient,
  ownerId: string
): Promise<string | null> {
  const { data: ownerRow, error } = await admin
    .from("mentors")
    .select("id, class_code, created_by")
    .eq("id", ownerId)
    .maybeSingle();

  if (error || !ownerRow || ownerRow.created_by) return null;

  const existing = normalizeClassCode(ownerRow.class_code as string | null);
  if (/^\d{6}$/.test(existing)) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const classCode = generateAccessCode();
    const { data: updated, error: updateErr } = await admin
      .from("mentors")
      .update({ class_code: classCode })
      .eq("id", ownerId)
      .is("created_by", null)
      .select("class_code")
      .maybeSingle();

    if (!updateErr && updated?.class_code) {
      return normalizeClassCode(updated.class_code as string);
    }

    if (isUniqueViolation(updateErr)) continue;

    const { data: refreshed } = await admin
      .from("mentors")
      .select("class_code")
      .eq("id", ownerId)
      .maybeSingle();

    const refreshedCode = normalizeClassCode(refreshed?.class_code as string | null);
    if (/^\d{6}$/.test(refreshedCode)) return refreshedCode;

    if (updateErr) return null;
  }

  return null;
}
