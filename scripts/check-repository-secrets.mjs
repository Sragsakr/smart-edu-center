import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SECRET_PATTERNS = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Supabase service-role JWT", /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/],
  ["Supabase secret key", /sb_secret_[a-zA-Z0-9_-]{20,}/],
  ["GitHub token", /gh(?:p|o|u|s|r)_[a-zA-Z0-9]{20,}/],
];

export function findSecretKinds(sourceText) {
  return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(sourceText)).map(
    ([secretKind]) => secretKind,
  );
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .filter((filePath) => !filePath.endsWith("check-repository-secrets.test.ts"));
}

async function main() {
  const violations = [];

  for (const filePath of trackedFiles()) {
    const sourceText = await readFile(filePath, "utf8");
    for (const secretKind of findSecretKinds(sourceText)) {
      violations.push(`${filePath}: ${secretKind}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(`Repository secret scan failed:\n${violations.join("\n")}`);
  }

  console.log("Repository secret scan passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
