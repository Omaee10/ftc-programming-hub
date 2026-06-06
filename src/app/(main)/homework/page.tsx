import type { Metadata } from "next";
import { cookies } from "next/headers";
import HomeworkClient from "./HomeworkClient";
import { WORKSPACE_ID_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchStudentHomework } from "@/lib/studentHomework";
import type { HomeworkAssignmentRow } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Coding Homework",
};

export const dynamic = "force-dynamic";

export default async function HomeworkPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("ftc-hub-role")?.value;
  const workspaceId = cookieStore.get(WORKSPACE_ID_COOKIE)?.value;

  let initialAssignments: HomeworkAssignmentRow[] | null = null;

  if (role === "student" && workspaceId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { assignments, error } = await fetchStudentHomework(
        supabase,
        workspaceId
      );
      if (!error) {
        initialAssignments = assignments;
      }
    }
  }

  return <HomeworkClient initialAssignments={initialAssignments} />;
}
