import type { Challenge } from "@/data/challenges";
import { getChallengeBlocksMeta } from "@/data/challengeBlocksMeta";
import { buildArchetypeStarter } from "@/lib/blockly/starters/archetypes";
import {
  buildRunOpModeXml,
  hwMotor,
  negatedStickY,
  setPower,
} from "@/lib/blockly/starters/xmlUtils";
import { getChallengeHardware } from "@/lib/challengeHardware";

const GENERIC = buildRunOpModeXml({ initBlocks: [], loopBlocks: [] });

export function buildChallengeStarterXml(challenge: Challenge): string {
  if (challenge.blocksSupport === "java-only") {
    return GENERIC;
  }

  const meta = getChallengeBlocksMeta(challenge.id);
  const archetype =
    challenge.starterArchetype ?? meta.starterArchetype ?? "teleop_single_drive";

  return buildArchetypeStarter(archetype, challenge.id);
}

/** Legacy per-id cache for quick lookup without full Challenge object. */
export function buildChallengeStarterXmlById(
  challengeId: number,
  blocksSupport?: Challenge["blocksSupport"],
  starterArchetype?: Challenge["starterArchetype"]
): string {
  if (blocksSupport === "java-only") return GENERIC;

  const meta = getChallengeBlocksMeta(challengeId);
  const archetype = starterArchetype ?? meta.starterArchetype ?? "teleop_single_drive";
  if (archetype) return buildArchetypeStarter(archetype, challengeId);

  const motor = getChallengeHardware(challengeId)[0] ?? "drive_motor";
  return buildRunOpModeXml({
    initBlocks: [hwMotor(motor)],
    loopBlocks: [setPower(motor, negatedStickY())],
  });
}
