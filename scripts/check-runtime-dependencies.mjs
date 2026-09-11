import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/**
 * يمنع رجوع أي اعتماد وقت تشغيل على مزوّدين متقاعدين (Supabase أو Vercel).
 *
 * القاعدة: الـruntime الحالي PostgreSQL + Fresh Auth المملوك للتطبيق فقط.
 * أي متغيّر أو SDK أو مسار لوجين خارجي متقاعد يجب أن يبقى مرفوضًا آليًا،
 * لا بالمراجعة اليدوية فقط.
 *
 * المرجع: `P01-14` في docs/MASTER_EXECUTION_PLAN.md.
 */

/** أنماط تمنع رجوع مزوّد متقاعد إلى الكود أو الإعداد. */
export const FORBIDDEN_RUNTIME_PATTERNS = [
  ["Supabase environment variable", /\b(?:NEXT_PUBLIC_)?SUPABASE_[A-Z0-9_]+\b/],
  ["Supabase SDK import", /@supabase\/[a-z-]+/],
  ["Supabase auth callback route", /\/auth\/callback\b/],
  ["legacy data-backend selector", /\bDATA_BACKEND\b/],
  ["Vercel runtime dependency", /\bVERCEL(?:_[A-Z0-9_]+)?\b/],
  ["Vercel SDK import", /@vercel\/[a-z-]+/],
];

/** ملفات مسموح لها بذكر هذه الأنماط لأنها تحرسها أو توثّقها. */
const ALLOWED_FILES = [
  "scripts/check-runtime-dependencies.mjs",
  "scripts/check-runtime-dependencies.test.ts",
  // ملفات اختبار ماسحات الأسرار تحمل الأنماط نفسها كحالات اختبار مقصودة.
  "scripts/check-repository-secrets.test.ts",
  "scripts/check-client-secrets.test.ts",
  "docs/",
  "README.md",
  "AGENTS.md",
  "postgres/reference/",
];

/** يفحص نصًا ويعيد أنواع الاعتماد المتقاعد الموجودة فيه. */
export function findForbiddenRuntimeDependencies(sourceText) {
  return FORBIDDEN_RUNTIME_PATTERNS.filter(([, pattern]) => pattern.test(sourceText)).map(
    ([dependencyKind]) => dependencyKind,
  );
}

function isAllowed(filePath) {
  return ALLOWED_FILES.some((allowed) => (allowed.endsWith("/") ? filePath.startsWith(allowed) : filePath === allowed));
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .filter((filePath) => existsSync(filePath))
    .filter((filePath) => !filePath.endsWith(".png") && !filePath.endsWith(".ico"))
    .filter((filePath) => !isAllowed(filePath));
}

async function main() {
  const violations = [];

  for (const filePath of trackedFiles()) {
    const sourceText = await readFile(filePath, "utf8");
    for (const dependencyKind of findForbiddenRuntimeDependencies(sourceText)) {
      violations.push(`${filePath}: ${dependencyKind}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Retired runtime dependency scan failed. The runtime is self-managed PostgreSQL only:\n${violations.join("\n")}`,
    );
  }

  console.log("Retired runtime dependency scan passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
