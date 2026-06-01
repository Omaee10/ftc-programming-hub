import {
  challenges as staticChallenges,
  getChallengeById,
  difficultyOrder,
  type Challenge,
  type Difficulty,
} from "@/data/challenges";
import type { ChallengeRow } from "@/lib/supabase";

export function rowToChallenge(row: ChallengeRow): Challenge {
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
    mentorRules: row.rubric_json ?? undefined,
  };
}

export function resolveChallenge(
  id: number,
  dbChallenges: Challenge[]
): Challenge | null {
  const fromDb = dbChallenges.find((c) => c.id === id);
  if (fromDb) return fromDb;
  return getChallengeById(id) ?? null;
}

export function filterOutAssigned(
  challenges: Challenge[],
  assignedIds: Set<number> | number[]
): Challenge[] {
  const ids = assignedIds instanceof Set ? assignedIds : new Set(assignedIds);
  return challenges.filter((c) => !ids.has(c.id));
}

export function mergeChallenges(
  dbChallenges: Challenge[]
): Challenge[] {
  const dbIds = new Set(dbChallenges.map((c) => c.id));
  return [
    ...staticChallenges.filter((c) => !dbIds.has(c.id)),
    ...dbChallenges,
  ].sort((a, b) => a.id - b.id);
}

export interface DisplayNumberResult {
  displayNumbers: Record<number, number>;
  orderedChallenges: Challenge[];
}

export function computeDisplayNumbers(
  challenges: Challenge[]
): DisplayNumberResult {
  const byDifficulty: Record<Difficulty, Challenge[]> = {
    Beginner: challenges.filter((c) => c.difficulty === "Beginner"),
    Intermediate: challenges.filter((c) => c.difficulty === "Intermediate"),
    Advanced: challenges.filter((c) => c.difficulty === "Advanced"),
  };

  const displayNumbers: Record<number, number> = {};
  const orderedChallenges: Challenge[] = [];
  let counter = 1;

  for (const diff of difficultyOrder) {
    for (const c of byDifficulty[diff]) {
      displayNumbers[c.id] = counter++;
      orderedChallenges.push(c);
    }
  }

  return { displayNumbers, orderedChallenges };
}

export function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}
