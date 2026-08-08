import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAccessCode, isUniqueViolation } from "@/lib/accessCodes";
import { fetchAllRows } from "@/lib/supabase/queryHelpers";

const SIX_DIGIT_CODE = /^\d{6}$/;

export interface JoinClassSuccess {
  ok: true;
  studentId: string;
  studentCode: string;
  displayName: string;
  teamName: string;
  mentorId: string;
  className?: string;
}

export interface JoinClassFailure {
  ok: false;
  error: string;
  status: number;
}

export type JoinClassResult = JoinClassSuccess | JoinClassFailure;

interface ClassOwnerRow {
  id: string;
  name: string;
  class_name?: string | null;
  class_code?: string | null;
}

function normalizeStoredCode(value: string | null | undefined): string {
  return (value ?? "").trim();
}

async function findClassOwnerByCode(
  admin: SupabaseClient,
  classCode: string
): Promise<ClassOwnerRow | null> {
  const { data: directMatch, error: directErr } = await admin
    .from("mentors")
    .select("id, name, class_name, class_code")
    .eq("class_code", classCode)
    .is("created_by", null)
    .maybeSingle();

  if (directErr) {
    throw new Error(directErr.message);
  }

  if (directMatch) {
    return directMatch as ClassOwnerRow;
  }

  // Whitespace-tolerant fallback: scans every class owner, so it must page.
  // A bare .select() stops at PostgREST's 1000-row cap and truncates silently
  // — past that, a valid code stored with stray whitespace would fail with
  // "Invalid class code" and nothing would say why.
  const { data: owners, error: ownersErr } = await fetchAllRows<ClassOwnerRow>(
    (from, to) =>
      admin
        .from("mentors")
        .select("id, name, class_name, class_code")
        .is("created_by", null)
        .not("class_code", "is", null)
        .order("id")
        .range(from, to)
  );

  if (ownersErr) {
    throw new Error(
      (ownersErr as { message?: string }).message ?? "Failed to look up class code."
    );
  }

  return (
    owners.find((row) => normalizeStoredCode(row.class_code) === classCode) ?? null
  );
}

/**
 * Guidance for a code that did not resolve to a class.
 *
 * This used to look the code up in `mentors.code` and `students.code` and say
 * which of the two it matched. That was a code-existence oracle: an attacker
 * could confirm whether an arbitrary 6-digit string was a live mentor or student
 * code without needing it to be a class code, which is most of the work of
 * finding one. It also meant two extra queries on every failed join.
 *
 * The wording below teaches the same thing — that there are three kinds of code
 * and which one belongs here — without confirming anything about the code that
 * was actually submitted.
 */
const WRONG_CODE_HINT =
  "Invalid class code. Make sure you're using the 6-digit Student Class Code from "
  + "your mentor's dashboard — not a mentor sign-in code, and not your own student code.";

export async function joinClassByCode(
  admin: SupabaseClient,
  userId: string,
  classCode: string
): Promise<JoinClassResult> {
  const trimmedCode = classCode.trim();

  if (!SIX_DIGIT_CODE.test(trimmedCode)) {
    return { ok: false, error: "Class code must be 6 digits.", status: 400 };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    return { ok: false, error: profileErr.message, status: 500 };
  }

  const displayName = profile?.display_name?.trim() ?? "";
  if (!displayName) {
    return {
      ok: false,
      error: "Your account has no name on file. Sign out and sign up again with your name.",
      status: 400,
    };
  }

  let owner: ClassOwnerRow | null;
  try {
    owner = await findClassOwnerByCode(admin, trimmedCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to look up class code.";
    return { ok: false, error: message, status: 500 };
  }

  if (!owner) {
    return { ok: false, error: WRONG_CODE_HINT, status: 400 };
  }

  // A mentor of this class (the owner or a co-mentor) must not also join it as a
  // student. Fetch this user's mentor rows and check in JS rather than
  // interpolating owner.id into a PostgREST .or() filter.
  const { data: userMentorRows, error: mentorLookupErr } = await admin
    .from("mentors")
    .select("id, created_by")
    .eq("user_id", userId);

  if (mentorLookupErr) {
    return { ok: false, error: mentorLookupErr.message, status: 500 };
  }

  const alreadyMentorsThisClass = (userMentorRows ?? []).some((row) => {
    const r = row as { id: string; created_by: string | null };
    return r.id === owner.id || r.created_by === owner.id;
  });

  if (alreadyMentorsThisClass) {
    return {
      ok: false,
      error: "You're already a mentor of this class, so you can't join it as a student.",
      status: 400,
    };
  }

  const { data: existing } = await admin
    .from("students")
    .select("id")
    .eq("user_id", userId)
    .eq("mentor_id", owner.id)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "Class already joined with this email",
      status: 400,
    };
  }

  let code = generateAccessCode();
  let inserted: { id: string; code: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error: insertErr } = await admin
      .from("students")
      .insert({
        name: displayName,
        code,
        mentor_id: owner.id,
        user_id: userId,
      })
      .select("id, code")
      .single();

    if (!insertErr && data) {
      inserted = data as { id: string; code: string };
      break;
    }

    if (isUniqueViolation(insertErr)) {
      if (insertErr?.message?.includes("students_user_mentor_unique")) {
        return {
          ok: false,
          error: "Class already joined with this email",
          status: 400,
        };
      }
      code = generateAccessCode();
      continue;
    }

    return {
      ok: false,
      error: insertErr?.message ?? "Failed to join class. Please try again.",
      status: 500,
    };
  }

  if (!inserted) {
    return {
      ok: false,
      error: "Failed to generate a unique student code. Please try again.",
      status: 500,
    };
  }

  const className = owner.class_name?.trim();

  return {
    ok: true,
    studentId: inserted.id,
    studentCode: inserted.code,
    displayName,
    teamName: owner.name,
    mentorId: owner.id,
    ...(className ? { className } : {}),
  };
}
