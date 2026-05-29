#!/usr/bin/env node
/**
 * Inserts or refreshes "**What the grader checks**" blocks in challenges.ts
 * from ChallengeRubrics.java (required + improvement tiers).
 *
 * Run: node scripts/sync-challenge-grader-instructions.mjs
 *      node scripts/sync-challenge-grader-instructions.mjs --write
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

const write = process.argv.includes("--write");
const rubricsSrc = fs.readFileSync(rubricsPath, "utf8");
let challengesSrc = fs.readFileSync(challengesPath, "utf8");

const rubricsById = parseRubrics(rubricsSrc);
let updated = 0;
let skipped = 0;

for (const [id, rules] of [...rubricsById.entries()].sort((a, b) => a[0] - b[0])) {
  const required = rules.filter((r) => r.tier === "required");
  const improvement = rules.filter((r) => r.tier === "improvement");
  const graderBlock = buildGraderBlock(required, improvement);
  const helperNote = buildHelperNote(required);

  const pattern = new RegExp(
    `(id:\\s*${id},[\\s\\S]*?instructions:\\s*\`)([\\s\\S]*?)(\`,\\s*\\n\\s*starterCode:)`,
    "m"
  );
  const match = challengesSrc.match(pattern);
  if (!match) {
    console.warn(`Challenge ${id}: could not locate instructions block`);
    skipped++;
    continue;
  }

  let instructions = match[2];
  instructions = stripExistingGraderSection(instructions);
  instructions = insertGraderSection(instructions, graderBlock + helperNote);

  const newInstructions = match[1] + instructions + match[3];
  if (newInstructions === match[0]) {
    skipped++;
    continue;
  }

  challengesSrc = challengesSrc.replace(pattern, newInstructions);
  updated++;
}

if (write) {
  fs.writeFileSync(challengesPath, challengesSrc, "utf8");
  console.log(`Updated ${updated} challenge instruction blocks (${skipped} unchanged/skipped).`);
} else {
  console.log(`Dry run: would update ${updated} challenges (${skipped} unchanged/skipped).`);
  console.log("Re-run with --write to apply.");
}

function parseRubrics(javaSrc) {
  const byChallenge = new Map();
  const methodRe =
    /\/\*\*\s*Challenge\s+(\d+)\s*—[^*]*\*\/\s*private static List<RubricRule> challenge\d+\(\) \{\s*return Rules\.of\(([\s\S]*?)\n\s*\);\s*\}/g;

  for (const methodMatch of javaSrc.matchAll(methodRe)) {
    const id = Number(methodMatch[1]);
    const body = methodMatch[2];
    const rules = [];
    const ruleRe =
      /Rules\.(required|improvement)\(\s*"([^"]+)"\s*,\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"/g;
    for (const m of body.matchAll(ruleRe)) {
      rules.push({
        tier: m[1],
        label: m[2],
        description: unescapeJava(m[3]),
        tip: unescapeJava(m[4]),
      });
    }
    byChallenge.set(id, rules);
  }
  return byChallenge;
}

function unescapeJava(s) {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\")
    .replace(/\\`/g, "`");
}

function buildGraderBlock(required, improvement) {
  const lines = ["**What the grader checks (required):**"];
  for (const r of required) {
    lines.push(`- **${escapeForTemplate(r.label)}** — ${formatRuleLine(r)}`);
  }
  if (improvement.length) {
    lines.push("", '**For a "good" grade (improvement):**');
    for (const r of improvement) {
      lines.push(`- **${escapeForTemplate(r.label)}** — ${formatRuleLine(r)}`);
    }
  }
  return `\n\n${lines.join("\n")}\n`;
}

function formatRuleLine(rule) {
  const code = extractCodeSnippet(rule.tip);
  if (code) {
    return (
      escapeForTemplate(rule.description) +
      " (\\`" +
      escapeForTemplate(code) +
      "\\`)"
    );
  }
  return escapeForTemplate(rule.description);
}

function extractCodeSnippet(tip) {
  const trimmed = tip.trim();
  const backtickMatch = trimmed.match(/`([^`]+)`/);
  if (backtickMatch) return backtickMatch[1].trim();
  const stmt = trimmed.match(/([a-zA-Z_][\w.()*,\s\[\]"=<>:+-]+;)/);
  if (stmt) return stmt[1].trim();
  if (trimmed.length <= 72) return trimmed;
  return null;
}

function escapeForTemplate(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function buildHelperNote(requiredRules) {
  const helperRules = requiredRules.filter((r) => /helper/i.test(r.label));
  if (!helperRules.length) return "";

  const names = [
    ...new Set(
      helperRules
        .map((r) => {
          const fromLabel = r.label.match(/(\w+)\(\)/);
          if (fromLabel) return fromLabel[1];
          const fromTip = r.tip.match(/(\w+)\s*\(/);
          return fromTip ? fromTip[1] : null;
        })
        .filter(Boolean)
    ),
  ].map((name) => "\\`" + name + "()\\`");

  if (!names.length) return "";

  return (
    "\n**Helper method required:** The grader checks for " +
    names.join(" and ") +
    ". Fill in the starter skeleton — a placeholder \\`return 0;\\` will not pass.\n"
  );
}

function stripExistingGraderSection(text) {
  return text.replace(
    /\n?\*\*What the grader checks \(required\):\*\*[\s\S]*?(?=\n\n\*\*|\n\n```|\n\n\\|\n\n[A-Z#]|$)/,
    ""
  );
}

function insertGraderSection(text, graderBlock) {
  const trimmed = text.replace(/^\n+/, "");
  const firstBreak = trimmed.indexOf("\n\n");
  if (firstBreak === -1) {
    return trimmed + graderBlock;
  }
  return trimmed.slice(0, firstBreak) + graderBlock + trimmed.slice(firstBreak);
}
