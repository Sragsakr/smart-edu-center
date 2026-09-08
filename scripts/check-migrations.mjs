import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASELINE_DIRECTORY = "postgres/baseline";
const CANONICAL_BASELINE = "0001_smart_edu_center_clean.sql";

export function validateCanonicalBaseline(files) {
  const violations = [];
  if (files.length !== 1 || files[0]?.name !== CANONICAL_BASELINE) {
    violations.push(`postgres/baseline must contain only ${CANONICAL_BASELINE}`);
  }
  for (const file of files) {
    if (!/^\s*begin\s*;/i.test(file.sql)) violations.push(`${file.name}: baseline must start with BEGIN`);
    if (!/commit\s*;\s*$/i.test(file.sql)) violations.push(`${file.name}: baseline must end with COMMIT`);
    if (/\bauth\.uid\s*\(|\bauth\.jwt\s*\(|\bservice_role\b/i.test(file.sql)) {
      violations.push(`${file.name}: provider-specific authorization is not allowed`);
    }
  }
  return violations;
}

async function localBaseline() {
  const names = (await readdir(BASELINE_DIRECTORY)).filter((name) => name.endsWith(".sql")).sort();
  return Promise.all(names.map(async (name) => ({ name, sql: await readFile(path.join(BASELINE_DIRECTORY, name), "utf8") })));
}

async function main() {
  const violations = validateCanonicalBaseline(await localBaseline());
  if (violations.length) throw new Error(`Baseline checks failed:\n${violations.join("\n")}`);
  console.log("Canonical PostgreSQL baseline checks passed; no database changes were applied.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
