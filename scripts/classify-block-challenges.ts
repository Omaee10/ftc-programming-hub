/**
 * Audit table: blocks support, course track, hardware, archetype per challenge.
 * Run: npx tsx scripts/classify-block-challenges.ts
 */
import { challenges } from "../src/data/challenges";
import { getChallengeHardware } from "../src/lib/challengeHardware";

const rows = challenges.map((c) => ({
  id: c.id,
  title: c.title.slice(0, 36),
  difficulty: c.difficulty,
  blocksSupport: c.blocksSupport ?? "?",
  courseTrack: c.courseTrack ?? "?",
  archetype: c.starterArchetype ?? "-",
  hardware: getChallengeHardware(c.id).join(", "),
}));

console.log(
  "| id | title | diff | blocks | track | archetype | hardware |"
);
console.log("|----|-------|------|--------|-------|-----------|----------|");
for (const r of rows) {
  console.log(
    `| ${r.id} | ${r.title} | ${r.difficulty} | ${r.blocksSupport} | ${r.courseTrack} | ${r.archetype} | ${r.hardware} |`
  );
}

const full = rows.filter((r) => r.blocksSupport === "full").length;
const javaOnly = rows.filter((r) => r.blocksSupport === "java-only").length;
console.log(`\nTotal: ${rows.length} | full: ${full} | java-only: ${javaOnly}`);
