// Validate every answer-key reference solution against the running grader.
//
// Start the grader (localhost:8080), then run:
//   node scripts/verify-solutions.mjs

import { getChallengeSolution, SOLUTION_IDS } from "../src/data/challengeSolutions.ts";

const GRADER = process.env.GRADER_URL ?? "http://localhost:8080";

let fails = 0;
for (const id of SOLUTION_IDS) {
  const sol = getChallengeSolution(id);
  const res = await fetch(`${GRADER}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: sol.java, challengeId: id }),
  });
  if (!res.ok) {
    fails++;
    console.log(`❌ Challenge ${id}: HTTP ${res.status} ${await res.text()}`);
    continue;
  }
  const json = await res.json();
  if (json.grade === "good") {
    console.log(`✅ Challenge ${id}: good`);
  } else {
    fails++;
    console.log(`\n❌ Challenge ${id}: ${json.grade}`);
    const syntax = (json.syntaxIssues ?? []).filter((s) => s.severity === "error");
    for (const s of syntax) console.log(`   syntax: ${s.message}`);
    const failed = [
      ...(json.universalResults ?? []),
      ...(json.requiredResults ?? []),
      ...(json.improvementResults ?? []),
      ...(json.behaviorResults ?? []),
    ].filter((c) => !c.pass);
    // Behaviour failures carry the offending case in `description`, which is
    // the only way to tell which input the reference solution got wrong.
    for (const c of failed) {
      console.log(`   [${c.tier}] ${c.label}`);
      if (c.tier === "behavior") console.log(`      ${c.description}`);
    }
  }
}

console.log(`\n${fails === 0 ? "ALL SOLUTIONS GOOD" : "FAILURES: " + fails}`);
process.exit(fails === 0 ? 0 : 1);
