import type { Challenge } from "@/data/challenges";

export type EditorMode = "java" | "blocks";

export interface BlocklyChallengeMeta {
  challengeId: number;
  title: string;
  className: string;
  opModeName: string;
  isAutonomous: boolean;
  tags: string[];
  difficulty: Challenge["difficulty"];
}

export function challengeToBlocklyMeta(challenge: Challenge): BlocklyChallengeMeta {
  const className = `Challenge${challenge.id}_${challenge.title.replace(/[^a-zA-Z0-9]/g, "")}`;
  const isAutonomous =
    challenge.tags.some((t) => t.toLowerCase().includes("autonomous")) &&
    !challenge.tags.some((t) => t.toLowerCase() === "teleop");
  return {
    challengeId: challenge.id,
    title: challenge.title,
    className: className.length > 60 ? `Challenge${challenge.id}` : className,
    opModeName: challenge.title.slice(0, 30),
    isAutonomous,
    tags: challenge.tags,
    difficulty: challenge.difficulty,
  };
}
