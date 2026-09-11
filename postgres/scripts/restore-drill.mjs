import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

import { verifyPassword } from "../../src/lib/auth/password-rules.mjs";
import { readLatestManifestEntry } from "./backup-database.mjs";

const { Client } = pg;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SMOKE_FILE = path.join(REPO_ROOT, "postgres", "validation", "clean-baseline-smoke.sql");

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const FORBIDDEN_DATABASE_NAMES = new Set(["saboraty", "postgres", "template0", "template1"]);

export class RestoreDrillError extends Error {}

export function opensslDecryptCommand({ inputPath, outputPath, keyFilePath }) {
  return {
    command: "openssl",
    args: [
      "enc",
      "-aes-256-cbc",
      "-pbkdf2",
      "-iter",
      "200000",
      "-salt",
      "-pass",
      `file:${keyFilePath}`,
      "-d",
      "-in",
      inputPath,
      "-out",
      outputPath,
    ],
  };
}

export function pgRestoreCommand({ databaseUrl, inputPath }) {
  return {
    command: "pg_restore",
    args: ["--no-owner", "--no-privileges", "--exit-on-error", "--dbname", databaseUrl, inputPath],
  };
}

/**
 * حراسة قاعدة تجربة الاستعادة.
 *
 * الاستعادة عملية مدمّرة، فتُرفض قبل التنفيذ إن كانت القاعدة الهدف هي قاعدة التطوير
 * أو أي اسم محجوز، أو إن كانت خارج loopback، أو إن طابقت `DATABASE_URL`.
 */
export function assertSafeDrillTarget({ drillDatabaseUrl, databaseUrl, requireLoopback = true }) {
  if (!drillDatabaseUrl) {
    throw new RestoreDrillError(
      "RESTORE_DRILL_DATABASE_URL is not set. The restore drill refuses to guess a target database.",
    );
  }
  let parsed;
  try {
    parsed = new URL(drillDatabaseUrl);
  } catch {
    throw new RestoreDrillError("RESTORE_DRILL_DATABASE_URL is not a valid connection URL.");
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new RestoreDrillError("RESTORE_DRILL_DATABASE_URL must use the postgres:// scheme.");
  }
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (!databaseName) throw new RestoreDrillError("RESTORE_DRILL_DATABASE_URL must include a database name.");
  if (FORBIDDEN_DATABASE_NAMES.has(databaseName.toLowerCase())) {
    throw new RestoreDrillError(
      `Refusing to restore over protected database "${databaseName}". Use a disposable name such as "saboraty_restore_drill".`,
    );
  }
  if (databaseUrl) {
    const source = new URL(databaseUrl).pathname.replace(/^\//, "");
    if (drillDatabaseUrl === databaseUrl || source.toLowerCase() === databaseName.toLowerCase()) {
      throw new RestoreDrillError("RESTORE_DRILL_DATABASE_URL must not match DATABASE_URL.");
    }
  }
  if (requireLoopback && !LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new RestoreDrillError(
      `RESTORE_DRILL_DATABASE_URL host "${parsed.hostname}" is not loopback. Refusing a destructive restore off-host.`,
    );
  }
  return { url: drillDatabaseUrl, databaseName, hostname: parsed.hostname };
}

function run({ command, args }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(new RestoreDrillError(`${command} failed to start: ${error.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new RestoreDrillError(`${command} exited with code ${code}: ${stderr.trim() || "no stderr output"}`));
    });
  });
}

function maintenanceUrl(drillDatabaseUrl) {
  const parsed = new URL(drillDatabaseUrl);
  parsed.pathname = "/postgres";
  return parsed.toString();
}

async function dropAndCreate(url, databaseName) {
  const client = new Client({ connectionString: maintenanceUrl(url) });
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

/** يشغّل فحوص الـbaseline بنفس محرّك الـsmoke المستخدم في الـreset، ويفشل عند أي نتيجة غير `true`. */
async function runSmokeChecks(client) {
  const sql = await readFile(SMOKE_FILE, "utf8");
  const statements = sql
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith("--"));

  let checked = 0;
  for (const statement of statements) {
    const result = await client.query(statement);
    const [row] = result.rows;
    if (!row) continue;
    const [value] = Object.values(row);
    checked += 1;
    if (value !== true) {
      throw new RestoreDrillError(`smoke check failed after restore: ${statement}\nResult: ${JSON.stringify(row)}`);
    }
  }
  return checked;
}

/**
 * تحقق حقيقي من أن الهوية المستعادة تعمل مع مُتحقّق التطبيق نفسه،
 * وأن قيود العزل مازالت مفروضة بعد الاستعادة.
 */
async function verifyRestoredBehaviour(client, demoPassword) {
  const reports = {};

  const credentials = await client.query(
    `select c.password_digest as digest
     from public.auth_password_credentials c
     join public.app_users u on u.id = c.user_id
     where u.email = 'platform.admin@saboraty.test'`,
  );
  const digest = credentials.rows[0]?.digest;
  if (!digest) throw new RestoreDrillError("restored database has no Platform Admin credential to verify.");
  reports.passwordVerifies = await verifyPassword(demoPassword, digest);
  reports.rawPasswordAbsent = !digest.includes(demoPassword);

  // الجلسات تُخزَّن كبصمات sha256 فقط؛ وجود صفوف جلسات في نسخة قاعدة حيّة طبيعي،
  // والمهم أن لا يكون أي صف يحمل رمزًا خامًا.
  const sessionDigests = await client.query(
    `select count(*)::int as total,
            count(*) filter (where token_digest ~ '^[0-9a-f]{64}$')::int as digest_shaped
     from public.auth_sessions`,
  );
  const { total: sessionTotal, digest_shaped: digestShaped } = sessionDigests.rows[0];
  reports.sessionRows = sessionTotal;
  reports.rawSessionTokensAbsent = sessionTotal === digestShaped;

  // صيغة الـdigest تُفحص بـLIKE لتفادي أي التباس بين رموز الـregex وplaceholders.
  const passwordDigestShapes = await client.query(
    `select count(*)::int as total,
            count(*) filter (
              where password_digest like 'scrypt-v1$%'
                and length(password_digest) >= 24
            )::int as digest_shaped
     from public.auth_password_credentials`,
  );
  reports.passwordDigestShaped = passwordDigestShapes.rows[0].total === passwordDigestShapes.rows[0].digest_shaped;

  const tenants = await client.query(`select id, tenant_type::text as tenant_type from public.tenants order by created_at`);
  if (tenants.rowCount < 2) throw new RestoreDrillError("restored database does not contain both demo tenants.");
  const [first, second] = tenants.rows;
  const branchOfSecond = await client.query(`select id from public.branches where tenant_id = $1 limit 1`, [second.id]);
  if (branchOfSecond.rowCount === 0) throw new RestoreDrillError("restored database has no branch for the second tenant.");

  try {
    await client.query(
      `insert into public.students (tenant_id, branch_id, code, full_name) values ($1, $2, 'DRILL-XTENANT', 'Drill')`,
      [first.id, branchOfSecond.rows[0].id],
    );
    throw new RestoreDrillError("tenant isolation is broken after restore: a cross-tenant student insert succeeded.");
  } catch (error) {
    if (error instanceof RestoreDrillError) throw error;
    if (error.code !== "23503") {
      throw new RestoreDrillError(`unexpected error while probing tenant isolation: ${error.message}`);
    }
    reports.crossTenantInsertRejected = true;
  }

  const entitlements = await client.query(
    `select t.tenant_type::text as tenant_type, count(e.capability_key)::int as granted
     from public.tenants t
     left join public.tenant_entitlements e on e.tenant_id = t.id
     group by t.id, t.tenant_type
     order by t.tenant_type`,
  );
  reports.entitlementsByType = Object.fromEntries(
    entitlements.rows.map((row) => [row.tenant_type, row.granted]),
  );
  if (Object.values(reports.entitlementsByType).some((granted) => granted === 0)) {
    throw new RestoreDrillError("restored database lost tenant entitlements.");
  }

  return reports;
}

/**
 * ينفّذ تجربة استعادة كاملة ويقيس RTO، ويعيد تقرير RPO/RTO مع دليل تحقق.
 *
 * @returns {Promise<object>}
 */
export async function runRestoreDrill({
  backupDir,
  encryptionKey,
  drillDatabaseUrl,
  databaseUrl,
  demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Saboraty.Demo.2026",
  now = () => Date.now(),
}) {
  const target = assertSafeDrillTarget({ drillDatabaseUrl, databaseUrl });
  const manifestEntry = await readLatestManifestEntry(backupDir);
  const archivePath = path.join(backupDir, manifestEntry.fileName);

  const workDirectory = await mkdtemp(path.join(tmpdir(), "saboraty-restore-"));
  const plainPath = path.join(workDirectory, "restored.pgc");
  const keyFilePath = path.join(workDirectory, "key.txt");

  const startedAt = now();
  try {
    await writeFile(keyFilePath, encryptionKey, { mode: 0o600 });
    await run(opensslDecryptCommand({ inputPath: archivePath, outputPath: plainPath, keyFilePath }));

    const { createHash } = await import("node:crypto");
    const restoredChecksum = createHash("sha256").update(await readFile(plainPath)).digest("hex");
    if (restoredChecksum !== manifestEntry.checksum) {
      throw new RestoreDrillError(
        `checksum mismatch for ${manifestEntry.fileName}: manifest ${manifestEntry.checksum}, decrypted ${restoredChecksum}`,
      );
    }

    await dropAndCreate(target.url, target.databaseName);
    await run(pgRestoreCommand({ databaseUrl: target.url, inputPath: plainPath }));

    const client = new Client({ connectionString: target.url });
    await client.connect();
    let smokeChecks = 0;
    let behaviour;
    try {
      smokeChecks = await runSmokeChecks(client);
      behaviour = await verifyRestoredBehaviour(client, demoPassword);
    } finally {
      await client.end();
    }

    if (!behaviour.passwordVerifies) {
      throw new RestoreDrillError("restored Platform Admin credential does not verify against the app hasher.");
    }
    if (!behaviour.rawPasswordAbsent || !behaviour.passwordDigestShaped || !behaviour.rawSessionTokensAbsent) {
      throw new RestoreDrillError(
        "restored database stores credentials or sessions in a non-digest form; raw secrets must never be persisted.",
      );
    }

    const finishedAt = now();
    const rtoSeconds = Math.round((finishedAt - startedAt) / 100) / 10;
    const rpoSeconds = Math.max(0, Math.round((startedAt - new Date(manifestEntry.createdAt).getTime()) / 1000));

    return {
      backupFile: manifestEntry.fileName,
      backupCreatedAt: manifestEntry.createdAt,
      targetDatabase: target.databaseName,
      smokeChecks,
      behaviour,
      rtoSeconds,
      rpoSeconds,
    };
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const backupDir = process.env.BACKUP_DIR;
  const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
  if (!backupDir) throw new RestoreDrillError("BACKUP_DIR is not set.");
  if (!encryptionKey) throw new RestoreDrillError("BACKUP_ENCRYPTION_KEY is not set.");

  const report = await runRestoreDrill({
    backupDir,
    encryptionKey,
    drillDatabaseUrl: process.env.RESTORE_DRILL_DATABASE_URL,
    databaseUrl: process.env.DATABASE_URL,
  });

  console.log("Restore drill passed.");
  console.log(`  backup:      ${report.backupFile}`);
  console.log(`  taken at:    ${report.backupCreatedAt}`);
  console.log(`  restored to: ${report.targetDatabase}`);
  console.log(`  smoke:       ${report.smokeChecks}/${report.smokeChecks} checks passed`);
  console.log(
    `  auth:        password verifies = ${report.behaviour.passwordVerifies}, digest-only storage = ${
      report.behaviour.rawPasswordAbsent && report.behaviour.passwordDigestShaped && report.behaviour.rawSessionTokensAbsent
    }`,
  );
  console.log(`  sessions:    ${report.behaviour.sessionRows} restored row(s), all digest-shaped`);
  console.log(`  isolation:   cross-tenant insert rejected = ${report.behaviour.crossTenantInsertRejected}`);
  console.log(`  entitlements:${JSON.stringify(report.behaviour.entitlementsByType)}`);
  console.log(`  RTO:         ${report.rtoSeconds}s`);
  console.log(`  RPO:         ${report.rpoSeconds}s`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`RESTORE DRILL FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
