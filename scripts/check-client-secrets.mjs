import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PUBLIC_ENV_PATTERN = /\bNEXT_PUBLIC_[A-Z0-9_]+\b/g;
const SENSITIVE_NAME_PATTERN = /(SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN)/i;
const MIN_SECRET_LENGTH = 8;

export function findUnsafePublicEnvNames(sourceText) {
  const publicNames = sourceText.match(PUBLIC_ENV_PATTERN) ?? [];
  return [...new Set(publicNames.filter((name) => SENSITIVE_NAME_PATTERN.test(name)))];
}

export function findLeakedSecretNames(clientBundleText, environment) {
  return Object.entries(environment)
    .filter(
      ([name, value]) =>
        SENSITIVE_NAME_PATTERN.test(name) &&
        typeof value === "string" &&
        value.length >= MIN_SECRET_LENGTH,
    )
    .filter(([, value]) => clientBundleText.includes(value))
    .map(([name]) => name);
}

function trackedApplicationFiles() {
  const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  }).split("\0");

  return trackedFiles.filter(
    (filePath) =>
      (filePath.startsWith("src/") ||
        filePath === ".env.example" ||
        filePath.startsWith("next.config.")) &&
      !/\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath),
  );
}

async function filesInside(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      return entry.isDirectory() ? filesInside(entryPath) : [entryPath];
    }),
  );

  return nestedFiles.flat();
}

async function assertNoUnsafePublicNames() {
  const sourceFiles = trackedApplicationFiles();
  const violations = [];

  for (const filePath of sourceFiles) {
    const sourceText = await readFile(filePath, "utf8");
    for (const envName of findUnsafePublicEnvNames(sourceText)) {
      violations.push(`${filePath}: ${envName}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(`Sensitive NEXT_PUBLIC variables found:\n${violations.join("\n")}`);
  }
}

async function assertNoSecretValuesInBundle() {
  const clientFiles = await filesInside(path.join(".next", "static"));
  const violations = [];

  for (const filePath of clientFiles) {
    const clientBundleText = await readFile(filePath, "utf8");
    for (const envName of findLeakedSecretNames(clientBundleText, process.env)) {
      violations.push(`${filePath}: ${envName}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(`Server secret values found in client bundle:\n${violations.join("\n")}`);
  }
}

async function main() {
  await assertNoUnsafePublicNames();
  await assertNoSecretValuesInBundle();
  console.log("Client secret check passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
