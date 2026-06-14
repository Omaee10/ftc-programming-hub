import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChallengeById, type Challenge } from "@/data/challenges";
import { isBuiltinChallengeId } from "@/data/challengeMeta";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_DETAIL_COLUMNS } from "@/lib/supabase/progressColumns";
import { rowToChallenge } from "@/lib/homeworkUtils";
import HomeworkWorkspace from "@/components/HomeworkWorkspace";

async function getChallenge(id: number): Promise<Challenge | null> {
  if (isBuiltinChallengeId(id)) {
    return getChallengeById(id) ?? null;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("challenges")
      .select(CHALLENGE_DETAIL_COLUMNS)
      .eq("id", id)
      .single();

    if (data) return rowToChallenge(data);
  } catch {
    // fall through
  }

  return null;
}

export async function generateStaticParams() {
  return Array.from({ length: 56 }, (_, i) => ({ id: String(i + 1) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const challenge = await getChallenge(Number(id));
  if (!challenge) return { title: "Homework Not Found" };
  return { title: `${challenge.title} – Homework` };
}

export default async function HomeworkChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challengeId = Number(id);
  const challenge = await getChallenge(challengeId);
  if (!challenge) notFound();

  return (
    <HomeworkWorkspace
      challengeId={challengeId}
      initialChallenge={challenge}
    />
  );
}
