import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChallengeById, type Challenge } from "@/data/challenges";
import { isBuiltinChallengeId } from "@/data/challengeMeta";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_DETAIL_COLUMNS } from "@/lib/supabase/progressColumns";
import ChallengeRedirectGuard from "@/components/ChallengeRedirectGuard";

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

    if (data) {
      return {
        id: data.id,
        title: data.title,
        difficulty: data.difficulty as Challenge["difficulty"],
        description: data.description,
        xp: data.xp,
        estimatedTime: data.estimated_time,
        tags: data.tags,
        objectives: data.objectives,
        instructions: data.instructions,
        starterCode: data.starter_code,
        hints: data.hints,
        conceptsCovered: data.concepts_covered,
        mentorRules: data.rubric_json ?? undefined,
      };
    }
  } catch {
    // Supabase unavailable for custom challenge lookup
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
  if (!challenge) return { title: "Challenge Not Found" };
  return { title: `${challenge.title} – Challenge ${challenge.id}` };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await getChallenge(Number(id));
  if (!challenge) notFound();
  return <ChallengeRedirectGuard challenge={challenge} />;
}
