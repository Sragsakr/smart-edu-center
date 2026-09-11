import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

import { seedCapabilityCatalog } from "./seed-capability-catalog.mjs";
import { APP_ROLE, provisionAppRole } from "./provision-app-role.mjs";

const { Client } = pg;

const FORBIDDEN_DATABASE_NAMES = new Set(["saboraty", "postgres", "template0", "template1"]);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASELINE_FILE = path.join(REPO_ROOT, "postgres", "baseline", "0001_smart_edu_center_clean.sql");
const SMOKE_FILE = path.join(REPO_ROOT, "postgres", "validation", "clean-baseline-smoke.sql");

export class TestDatabaseGuardError extends Error {}

export function parseDatabaseUrl(rawUrl, label) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new TestDatabaseGuardError(`${label} is not a valid connection URL`);
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new TestDatabaseGuardError(`${label} must use the postgres:// or postgresql:// scheme`);
  }
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (!databaseName) throw new TestDatabaseGuardError(`${label} must include a database name`);
  return { url: rawUrl, databaseName, hostname: parsed.hostname };
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * @param {{
 *   testDatabaseUrl: string | undefined,
 *   databaseUrl?: string | undefined,
 *   requireLoopback?: boolean,
 *   checkAgainstDevelopmentUrl?: boolean,
 * }} options
 */
export function assertSafeTestDatabase({ testDatabaseUrl, databaseUrl, requireLoopback = true, checkAgainstDevelopmentUrl = true }) {
  if (!testDatabaseUrl) {
    throw new TestDatabaseGuardError(
      "TEST_DATABASE_URL is not set. Integration tests require an explicit disposable database and will not fall back silently.",
    );
  }
  const test = parseDatabaseUrl(testDatabaseUrl, "TEST_DATABASE_URL");
  if (FORBIDDEN_DATABASE_NAMES.has(test.databaseName.toLowerCase())) {
    throw new TestDatabaseGuardError(
      `TEST_DATABASE_URL must not point at a protected database name ("${test.databaseName}"). Use a dedicated disposable database such as "saboraty_test".`,
    );
  }
  if (checkAgainstDevelopmentUrl && databaseUrl) {
    const dev = parseDatabaseUrl(databaseUrl, "DATABASE_URL");
    if (dev.url === test.url || dev.databaseName.toLowerCase() === test.databaseName.toLowerCase()) {
      throw new TestDatabaseGuardError("TEST_DATABASE_URL must not match DATABASE_URL. Refusing to run against the development database.");
    }
  }
  if (requireLoopback && !LOOPBACK_HOSTS.has(test.hostname)) {
    throw new TestDatabaseGuardError(
      `TEST_DATABASE_URL host "${test.hostname}" is not a loopback address. Refusing to run the destructive reset against a non-local host.`,
    );
  }
  return test;
}

function maintenanceUrlFor(testDatabaseUrl) {
  const parsed = new URL(testDatabaseUrl);
  parsed.pathname = "/postgres";
  return parsed.toString();
}

async function dropAndCreateDatabase(testDatabaseUrl, databaseName) {
  const client = new Client({ connectionString: maintenanceUrlFor(testDatabaseUrl) });
  await client.connect();
  try {
    await client.query(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
      [databaseName],
    );
    await client.query(`drop database if exists ${client.escapeIdentifier(databaseName)}`);
    await client.query(`create database ${client.escapeIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
}

async function applySql(testDatabaseUrl, filePath) {
  const sql = await readFile(filePath, "utf8");
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    return await client.query(sql);
  } finally {
    await client.end();
  }
}

async function runSmokeCheck(testDatabaseUrl) {
  const sql = await readFile(SMOKE_FILE, "utf8");
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    const statements = sql
      .split(/;\s*(?:\n|$)/)
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0 && !statement.startsWith("--"));
    for (const statement of statements) {
      const result = await client.query(statement);
      const [row] = result.rows;
      if (!row) continue;
      const [value] = Object.values(row);
      if (value !== true) {
        throw new Error(`Baseline smoke check failed for statement: ${statement}\nResult: ${JSON.stringify(row)}`);
      }
    }
  } finally {
    await client.end();
  }
}

/**
 * كلمة مرور دور التطبيق في قاعدة الاختبار القابلة للحذف.
 *
 * قيمة اختبارية محلية فقط: قاعدة الاختبار تُحذف وتُعاد في كل تشغيل، والدور لا
 * يملك أي وصول لبيانات حقيقية.
 */
export const TEST_APP_ROLE_PASSWORD =
  process.env.TEST_APP_DB_PASSWORD ?? "saboraty-test-app-role-password";

/** رابط اتصال بدور التطبيق — يُستخدم لاختبار إلزام RLS فعليًا. */
export function appRoleUrl(testDatabaseUrl, password = TEST_APP_ROLE_PASSWORD) {
  const parsed = new URL(testDatabaseUrl);
  return {
    url: `postgresql://${APP_ROLE}:${encodeURIComponent(password)}@${parsed.host}${parsed.pathname}`,
    password,
  };
}

export async function resetTestDatabase({
  testDatabaseUrl = process.env.TEST_DATABASE_URL,
  databaseUrl = process.env.DATABASE_URL,
} = {}) {
  const { databaseName } = assertSafeTestDatabase({ testDatabaseUrl, databaseUrl });
  await dropAndCreateDatabase(testDatabaseUrl, databaseName);
  await applySql(testDatabaseUrl, BASELINE_FILE);
  // كتالوج القدرات بيانات مرجعية للمنصة وليست بيانات عملاء، فتُبذر مع الـbaseline
  // حتى تكون قاعدة الاختبار مطابقة للحالة الهدف قبل أي بيانات تجريبية.
  await seedCapabilityCatalog(testDatabaseUrl);
  // المنح تُفقد مع إعادة إنشاء القاعدة، فتُعاد في كل تشغيل حتى يستطيع اختبار
  // إلزام RLS العمل بنفس الدور الذي يعمل به التطبيق.
  await provisionAppRole({
    ownerConnectionString: testDatabaseUrl,
    databaseName,
    password: TEST_APP_ROLE_PASSWORD,
  });
  await runSmokeCheck(testDatabaseUrl);
  return { databaseName };
}

export async function dropTestDatabase({
  testDatabaseUrl = process.env.TEST_DATABASE_URL,
  databaseUrl = process.env.DATABASE_URL,
} = {}) {
  const { databaseName } = assertSafeTestDatabase({ testDatabaseUrl, databaseUrl });
  const client = new Client({ connectionString: maintenanceUrlFor(testDatabaseUrl) });
  await client.connect();
  try {
    await client.query(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
      [databaseName],
    );
    await client.query(`drop database if exists ${client.escapeIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
  return { databaseName };
}

async function main() {
  const mode = process.argv[2] ?? "reset";
  if (mode === "drop") {
    const { databaseName } = await dropTestDatabase();
    console.log(`Dropped disposable test database "${databaseName}".`);
    return;
  }
  const { databaseName } = await resetTestDatabase();
  console.log(`Disposable test database "${databaseName}" reset from canonical baseline; smoke checks passed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
