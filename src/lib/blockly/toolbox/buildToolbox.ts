import type { Challenge } from "@/data/challenges";
import { BLOCK_CATEGORIES } from "@/lib/blockly/toolbox/blockCategories";
import { getAllowedBlocksForChallenge } from "@/lib/blockly/toolbox/challengeBlockAllowlist";

export interface ToolboxDefinition {
  kind: "categoryToolbox";
  contents: ToolboxCategory[];
}

interface ToolboxCategory {
  kind: "category";
  name: string;
  colour: string;
  contents: { kind: "block"; type: string }[];
}

export function buildToolbox(challenge: Challenge): ToolboxDefinition {
  const allowed = getAllowedBlocksForChallenge(challenge);
  const contents: ToolboxCategory[] = [];

  for (const cat of Object.values(BLOCK_CATEGORIES)) {
    const blocks = cat.blocks.filter((b) => allowed.has(b.type));
    if (blocks.length === 0) continue;
    contents.push({
      kind: "category",
      name: cat.name,
      colour: cat.colour,
      contents: blocks.map((b) => ({ kind: "block" as const, type: b.type })),
    });
  }

  return { kind: "categoryToolbox", contents };
}
