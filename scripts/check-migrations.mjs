import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MIGRATION_DIRECTORY = "supabase/migrations";
const MIGRATION_NAME_PATTERN = /^\d{12,14}_[a-z0-9_]+\.sql$/;

export function validateMigrationFiles(migrations) {
  const violations = [];
  const migrationNames = migrations.map(({ name }) => name);

  for (const migration of migrations) {
    if (!MIGRATION_NAME_PATTERN.test(migration.name)) {
      violations.push(`${migration.name}: invalid migration filename`);
    }

    if (!/^\s*begin\s*;/i.test(migration.sql)) {
      violations.push(`${migration.name}: migration must start with BEGIN`);
    }

    if (!/commit\s*;\s*$/i.test(migration.sql)) {
      violations.push(`${migration.name}: migration must end with COMMIT`);
    }
  }

  if (new Set(migrationNames).size !== migrationNames.length) {
    violations.push("duplicate migration filenames found");
  }

  return violations;
}

export function findChangedExistingMigrations(nameStatusOutput) {
  return nameStatusOutput
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter(
      ([status, filePath]) =>
        filePath?.startsWith(`${MIGRATION_DIRECTORY}/`) && status !== "A",
    )
    .map(([, filePath]) => filePath);
}

async function localMigrations() {
  const migrationNames = await readdir(MIGRATION_DIRECTORY);
  return Promise.all(
    migrationNames
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map(async (name) => ({
        name,
        sql: await readFile(path.join(MIGRATION_DIRECTORY, name), "utf8"),
      })),
  );
}

function changedFilesAgainstBase(baseRef) {
  if (!baseRef) return "";

  return execFileSync(
    "git",
    ["diff", "--name-status", `${baseRef}...HEAD`, "--", MIGRATION_DIRECTORY],
    { encoding: "utf8" },
  );
}

async function main() {
  const violations = validateMigrationFiles(await localMigrations());
  const changedMigrations = findChangedExistingMigrations(
    changedFilesAgainstBase(process.env.MIGRATION_BASE_REF),
  );

  violations.push(
    ...changedMigrations.map(
      (filePath) => `${filePath}: applied migrations are append-only`,
    ),
  );

  if (violations.length > 0) {
    throw new Error(`Migration checks failed:\n${violations.join("\n")}`);
  }

  console.log("Migration checks passed; no database changes were applied.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
