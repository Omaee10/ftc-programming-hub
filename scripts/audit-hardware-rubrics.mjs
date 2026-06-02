#!/usr/bin/env node
/**
 * Ensures every documented hardware config name in challenges.ts has a matching
 * required rule in ChallengeRubrics.HARDWARE_NAMES.
 *
 * Run: node scripts/audit-hardware-rubrics.mjs
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

/** Parse HARDWARE_NAMES map from ChallengeRubrics.java */
function parseHardwareNamesMap(src) {
  const map = new Map();
  const blockMatch = src.match(
    /private static final Map<Integer, List<String>> HARDWARE_NAMES = Map\.ofEntries\(([\s\S]*?)\);/
  );
  if (!blockMatch) {
    throw new Error("Could not find HARDWARE_NAMES in ChallengeRubrics.java");
  }
  for (const m of blockMatch[1].matchAll(
    /Map\.entry\(\s*(\d+)\s*,\s*List\.of\(([^)]*)\)\s*\)/g
  )) {
    const id = Number(m[1]);
    const literals = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    map.set(id, literals);
  }
  return map;
}

/** Valid FTC robot-config names are lowercase snake_case identifiers. */
const HW_NAME_RX = /^[a-z][a-z0-9_]*$/;

/** Placeholder names in generic examples — not real robot config names. */
const PLACEHOLDER_NAMES = new Set(["motor_name", "device_name", "servo_name"]);

function isHardwareName(s) {
  return HW_NAME_RX.test(s) && !PLACEHOLDER_NAMES.has(s);
}

/** Extract documented hardware names per challenge from challenges.ts */
function extractChallengeHardware(src) {
  const map = new Map();
  const idMatches = [...src.matchAll(/^\s*id:\s*(\d+),/gm)];

  for (let i = 0; i < idMatches.length; i++) {
    const id = Number(idMatches[i][1]);
    const start = idMatches[i].index;
    const end = i + 1 < idMatches.length ? idMatches[i + 1].index : src.length;
    const text = src.slice(start, end);
    const names = new Set();

    for (const m of text.matchAll(/hardwareMap\.get(?:All)?\([^,]+,\s*"([^"]+)"/g)) {
      if (isHardwareName(m[1])) names.add(m[1]);
    }
    // Instructions: `"left_motor"` (escaped backticks in template literals)
    for (const m of text.matchAll(/\\`"([a-z][a-z0-9_]*)"/g)) {
      if (isHardwareName(m[1])) names.add(m[1]);
    }
    // Hint strings: \"left_motor\"
    for (const m of text.matchAll(/\\"([a-z][a-z0-9_]*)\\"/g)) {
      if (isHardwareName(m[1])) names.add(m[1]);
    }

    if (names.size) map.set(id, [...names].sort());
  }
  return map;
}

const rubricHw = parseHardwareNamesMap(rubricsSrc);
const challengeHw = extractChallengeHardware(challengesSrc);

let failed = false;

const missingInRubric = [];
for (const [id, names] of [...challengeHw.entries()].sort((a, b) => a[0] - b[0])) {
  const rubricNames = rubricHw.get(id) ?? [];
  for (const name of names) {
    if (!rubricNames.includes(name)) {
      missingInRubric.push({ id, name, rubricNames });
    }
  }
}

const staleRubricEntries = [];
for (const [id, names] of [...rubricHw.entries()].sort((a, b) => a[0] - b[0])) {
  const docNames = challengeHw.get(id);
  if (!docNames) {
    staleRubricEntries.push({ id, names, reason: "no documented hardware in challenges.ts" });
    continue;
  }
  for (const name of names) {
    if (!docNames.includes(name)) {
      staleRubricEntries.push({ id, name, reason: "not documented in challenges.ts" });
    }
  }
}

if (missingInRubric.length) {
  failed = true;
  console.error("Documented hardware names missing from HARDWARE_NAMES:");
  for (const { id, name, rubricNames } of missingInRubric) {
    console.error(
      `  challenge ${id}: missing "${name}" (rubric has: ${rubricNames.join(", ") || "none"})`
    );
  }
}

if (staleRubricEntries.length) {
  failed = true;
  console.error("\nHARDWARE_NAMES entries not backed by challenges.ts:");
  for (const entry of staleRubricEntries) {
    if (entry.name) {
      console.error(`  challenge ${entry.id}: stale "${entry.name}" — ${entry.reason}`);
    } else {
      console.error(`  challenge ${entry.id}: [${entry.names.join(", ")}] — ${entry.reason}`);
    }
  }
}

if (!failed) {
  console.log(
    `OK — ${rubricHw.size} challenges with ${[...rubricHw.values()].flat().length} hardware literal rules aligned.`
  );
  process.exit(0);
}

process.exit(1);
