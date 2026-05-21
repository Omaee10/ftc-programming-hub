import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChallengeById, type Challenge } from "@/data/challenges";
import { supabase, type ChallengeRow } from "@/lib/supabase";
import ChallengeWorkspace from "@/components/ChallengeWorkspace";

export const dynamic = "force-dynamic";

function rowToChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty as Challenge["difficulty"],
    description: row.description,
    xp: row.xp,
    estimatedTime: row.estimated_time,
    tags: row.tags,
    objectives: row.objectives,
    instructions: row.instructions,
    starterCode: row.starter_code,
    hints: row.hints,
    conceptsCovered: row.concepts_covered,
  };
}

async function getChallenge(id: number): Promise<Challenge | null> {
  // Check Supabase first so mentor-created challenges take priority over
  // static ones and can override any ID in the 1–53 static range.
  try {
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (data) return rowToChallenge(data as ChallengeRow);
  } catch {
    // Supabase unavailable — fall through to static data
  }

  // Fall back to the built-in static challenge library
  return getChallengeById(id) ?? null;
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
  return <ChallengeWorkspace challenge={challenge} />;
}
