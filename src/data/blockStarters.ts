/**
 * Per-challenge Blockly XML — delegates to archetype factory.
 */
import { challenges } from "@/data/challenges";
import { buildChallengeStarterXml, buildChallengeStarterXmlById } from "@/lib/blockly/starters/buildChallengeStarter";
import { buildRunOpModeXml } from "@/lib/blockly/starters/xmlUtils";

export const GENERIC_BLOCK_STARTER = buildRunOpModeXml({ initBlocks: [], loopBlocks: [] });

/** Precomputed starters for all built-in challenges. */
export const BLOCK_STARTERS: Record<number, string> = Object.fromEntries(
  challenges.map((c) => [c.id, buildChallengeStarterXml(c)])
);

export function getBlockStarterXml(challengeId: number): string {
  const c = challenges.find((ch) => ch.id === challengeId);
  if (c) return buildChallengeStarterXml(c);
  return buildChallengeStarterXmlById(challengeId);
}

export function isLegacyBlockXml(xml: string): boolean {
  return xml.includes('type="ftc_program"');
}
