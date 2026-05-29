#!/usr/bin/env node
/**
 * Compares challenge titles in src/data/challenges.ts with rubric header
 * comments in grader/.../ChallengeRubrics.java. Exits 1 on mismatch.
 *
 * Run: node scripts/audit-rubric-alignment.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const challengesPath = path.join(root, "src/data/challenges.ts");
const rubricsPath = path.join(
  root,
  "grader/src/main/java/com/ftchub/grader/rubric/challenges/ChallengeRubrics.java"
);

const challengesSrc = fs.readFileSync(challengesPath, "utf8");
const rubricsSrc = fs.readFileSync(rubricsPath, "utf8");

const challengeTitles = new Map();
for (const m of challengesSrc.matchAll(/^\s*id:\s*(\d+),\s*\n\s*title:\s*"([^"]+)"/gm)) {
  challengeTitles.set(Number(m[1]), m[2]);
}

const rubricTitles = new Map();
for (const m of rubricsSrc.matchAll(
  /\/\*\*\s*Challenge\s+(\d+)\s*—\s*([^*]+?)\s*\*\//g
)) {
  rubricTitles.set(Number(m[1]), m[2].trim());
}

const missingRubrics = [];
const mismatches = [];

for (const [id, title] of [...challengeTitles.entries()].sort((a, b) => a[0] - b[0])) {
  const rubricTitle = rubricTitles.get(id);
  if (rubricTitle === undefined) {
    missingRubrics.push({ id, title });
    continue;
  }
  if (normalize(rubricTitle) !== normalize(title)) {
    mismatches.push({ id, challengeTitle: title, rubricTitle });
  }
}

const orphanRubrics = [...rubricTitles.keys()].filter((id) => !challengeTitles.has(id));

let failed = false;

if (missingRubrics.length) {
  failed = true;
  console.error("Challenges without rubric header comments:");
  for (const { id, title } of missingRubrics) {
    console.error(`  ${id}: ${title}`);
  }
}

if (mismatches.length) {
  failed = true;
  console.error("\nTitle mismatches (challenges.ts vs ChallengeRubrics.java):");
  for (const { id, challengeTitle, rubricTitle } of mismatches) {
    console.error(`  ${id}: challenge="${challengeTitle}" rubric="${rubricTitle}"`);
  }
}

if (orphanRubrics.length) {
  failed = true;
  console.error("\nRubric entries with no matching challenge id:");
  for (const id of orphanRubrics) {
    console.error(`  ${id}: ${rubricTitles.get(id)}`);
  }
}

if (!failed) {
  console.log(`OK — ${challengeTitles.size} challenge titles match rubric headers.`);
  process.exit(0);
}

process.exit(1);

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/↔/g, "<->")
    .replace(/[^\w\s<>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
