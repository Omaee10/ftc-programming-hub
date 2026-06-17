#!/usr/bin/env node
/**
 * Export FTC Programming Hub Supabase data to local JSON and/or SQL files.
 * Uses the service role key (bypasses RLS) — keep output files private.
 *
 * Usage:
 *   node scripts/export-supabase-backup.mjs
 *   node scripts/export-supabase-backup.mjs --format json
 *   node scripts/export-supabase-backup.mjs --format sql
 *   node scripts/export-supabase-backup.mjs --format both --out ./backups
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local or the environment.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE_SIZE = 1000;

/** Public app tables in FK-safe export order. */
const PUBLIC_TABLES = [
  "profiles",
  "mentors",
  "students",
  "challenges",
  "student_challenge_progress",
  "challenge_submissions",
  "homework_assignments",
];

const JSONB_COLUMNS = {
  challenges: new Set(["rubric_json"]),
  student_challenge_progress: new Set(["blocks_snapshot"]),
  challenge_submissions: new Set(["blocks_snapshot"]),
};

const TEXT_ARRAY_COLUMNS = {
  challenges: new Set(["tags", "objectives", "hints", "concepts_covered"]),
};

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function parseArgs(argv) {
  let format = "both";
  let outDir = path.join(root, "backups");

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--format" && argv[i + 1]) {
      format = argv[++i];
      continue;
    }
    if (arg === "--out" && argv[i + 1]) {
      outDir = path.resolve(argv[++i]);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node scripts/export-supabase-backup.mjs [options]

Options:
  --format json|sql|both   Output format (default: both)
  --out <dir>              Output directory (default: ./backups)
  --help, -h               Show this help
`);
      process.exit(0);
    }
  }

  if (!["json", "sql", "both"].includes(format)) {
    console.error(`Invalid --format "${format}". Use json, sql, or both.`);
    process.exit(1);
  }

  return { format, outDir };
}

function requireEnv(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!value || value === "your-service-role-key-here") {
    console.error(`Missing ${name}. Set it in .env.local or the environment.`);
    process.exit(1);
  }
  return value;
}

function createAdminClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function fetchAllRows(supabase, tableName) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${tableName}: ${error.message}`);
    }

    if (!data?.length) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAllAuthUsers(supabase) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw new Error(`auth.users: ${error.message}`);
    }

    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) break;
    page += 1;
  }

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    phone: user.phone,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_sign_in_at: user.last_sign_in_at,
    email_confirmed_at: user.email_confirmed_at,
    phone_confirmed_at: user.phone_confirmed_at,
    confirmed_at: user.confirmed_at,
    banned_until: user.banned_until,
    is_anonymous: user.is_anonymous,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    identities: user.identities?.map((identity) => ({
      id: identity.id,
      provider: identity.provider,
      identity_id: identity.identity_id,
      created_at: identity.created_at,
      updated_at: identity.updated_at,
    })),
  }));
}

function sortMentors(rows) {
  return [...rows].sort((a, b) => {
    const aOwner = a.created_by == null;
    const bOwner = b.created_by == null;
    if (aOwner !== bOwner) return aOwner ? -1 : 1;
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  });
}

function sqlEscapeString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function sqlLiteral(tableName, columnName, value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (Array.isArray(value)) {
    if (JSONB_COLUMNS[tableName]?.has(columnName)) {
      return `'${sqlEscapeString(JSON.stringify(value))}'::jsonb`;
    }
    if (TEXT_ARRAY_COLUMNS[tableName]?.has(columnName)) {
      const items = value.map((item) => `'${sqlEscapeString(item)}'`);
      return `ARRAY[${items.join(", ")}]::text[]`;
    }
    return `'${sqlEscapeString(JSON.stringify(value))}'::jsonb`;
  }

  if (typeof value === "object") {
    return `'${sqlEscapeString(JSON.stringify(value))}'::jsonb`;
  }

  return `'${sqlEscapeString(value)}'`;
}

function rowsToInsertStatements(tableName, rows) {
  if (!rows.length) {
    return [`-- ${tableName}: 0 rows`];
  }

  const columns = Object.keys(rows[0]);
  const lines = [`-- ${tableName}: ${rows.length} row(s)`];

  for (const row of rows) {
    const values = columns.map((column) => sqlLiteral(tableName, column, row[column]));
    lines.push(
      `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});`
    );
  }

  return lines;
}

function buildSqlDump(exportData) {
  const timestamp = exportData.meta.exported_at;
  const lines = [
    "-- FTC Programming Hub — Supabase data backup",
    `-- Generated: ${timestamp}`,
    `-- Project: ${exportData.meta.project_url}`,
    "--",
    "-- Restore notes:",
    "--   1. auth.users rows are metadata only (no password hashes). Recreate accounts",
    "--      via Supabase Auth or import users through the dashboard/API.",
    "--   2. Run public-table INSERTs in a transaction on a fresh or truncated DB.",
    "--   3. mentors rows are ordered with class owners before co-mentors.",
    "",
    "BEGIN;",
    "",
  ];

  for (const tableName of PUBLIC_TABLES) {
    const rows =
      tableName === "mentors"
        ? sortMentors(exportData.tables[tableName] ?? [])
        : exportData.tables[tableName] ?? [];
    lines.push(...rowsToInsertStatements(tableName, rows));
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");
  lines.push(`-- auth.users: ${exportData.auth_users.length} user(s) exported to JSON only`);
  return lines.join("\n");
}

async function exportDatabase() {
  loadEnvFiles();
  const { format, outDir } = parseArgs(process.argv.slice(2));
  const supabase = createAdminClient();
  const exportedAt = new Date().toISOString();
  const stamp = exportedAt.replace(/[:.]/g, "-");

  console.log("Exporting Supabase data...");

  const tables = {};
  for (const tableName of PUBLIC_TABLES) {
    process.stdout.write(`  ${tableName}... `);
    tables[tableName] = await fetchAllRows(supabase, tableName);
    console.log(`${tables[tableName].length} row(s)`);
  }

  process.stdout.write("  auth.users... ");
  const authUsers = await fetchAllAuthUsers(supabase);
  console.log(`${authUsers.length} user(s)`);

  const exportData = {
    meta: {
      app: "ftc-programming-hub",
      exported_at: exportedAt,
      project_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
      tables: PUBLIC_TABLES,
      auth_users_note:
        "Auth user records omit password hashes. Restore accounts via Supabase Auth, not SQL INSERT.",
    },
    auth_users: authUsers,
    tables,
  };

  fs.mkdirSync(outDir, { recursive: true });

  const written = [];

  if (format === "json" || format === "both") {
    const jsonPath = path.join(outDir, `supabase-backup-${stamp}.json`);
    fs.writeFileSync(jsonPath, `${JSON.stringify(exportData, null, 2)}\n`, "utf8");
    written.push(jsonPath);
  }

  if (format === "sql" || format === "both") {
    const sqlPath = path.join(outDir, `supabase-backup-${stamp}.sql`);
    fs.writeFileSync(sqlPath, buildSqlDump(exportData), "utf8");
    written.push(sqlPath);
  }

  const totalRows = PUBLIC_TABLES.reduce(
    (sum, tableName) => sum + (tables[tableName]?.length ?? 0),
    0
  );

  console.log("");
  console.log(`Done. ${totalRows} table row(s) + ${authUsers.length} auth user(s).`);
  for (const filePath of written) {
    console.log(`  ${filePath}`);
  }
}

exportDatabase().catch((error) => {
  console.error("");
  console.error(`Export failed: ${error.message}`);
  process.exit(1);
});
