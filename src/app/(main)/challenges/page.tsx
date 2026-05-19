import type { Metadata } from "next";
import { supabase, type ChallengeRow } from "@/lib/supabase";
import { type Challenge } from "@/data/challenges";
import ChallengesClient from "./ChallengesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coding Challenges",
};

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

export default async function ChallengesPage() {
  const { data } = await supabase
    .from("challenges")
    .select("*")
    .order("id", { ascending: true });

  const dbChallenges: Challenge[] = (data ?? []).map(rowToChallenge);

  return <ChallengesClient dbChallenges={dbChallenges} />;
}
