import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * نسخ احتياطي مشفّر لقاعدة PostgreSQL مع manifest وchecksums وretention.
 *
 * القواعد الملزمة:
 * - لا يُكتب أي ملف نسخة غير مشفّر في الوجهة (`BACKUP_DIR`).
 * - لا يُقبل تشغيل بلا مفتاح تشفير.
 * - يُفشل التشغيل برمز غير صفري مع رسالة واضحة عند أي خطأ، فلا يفشل النسخ بصمت.
 * - يُتحقق من سلامة النسخة بفكّ التشفير ومقارنة الـchecksum قبل اعتبارها صالحة.
 */

export class BackupError extends Error {}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const MIN_KEY_LENGTH = 16;
const BACKUP_EXTENSION = ".dump.enc";
const PREFIX = "saboraty";

export function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** اسم ملف النسخة: ثابت الشكل حتى يكون الترتيب الزمني هو ترتيب الأسماء. */
export function backupFileName({ database, timestamp }) {
  const iso = new Date(timestamp).toISOString().replace(/[:.]/g, "-");
  return `${PREFIX}-${database}-${iso}${BACKUP_EXTENSION}`;
}

/** يستخرج الطابع الزمني من اسم نسخة صالحة، أو `null` إن كان الاسم غير مطابق. */
export function parseBackupTimestamp(fileName) {
  if (!fileName.endsWith(BACKUP_EXTENSION)) return null;
  const withoutExtension = fileName.slice(0, -BACKUP_EXTENSION.length);
  const match = withoutExtension.match(/^(.*)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)$/);
  if (!match) return null;
  const parsed = new Date(match[2].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, "T$1:$2:$3.$4Z"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * يختار النسخ التي انتهت مدة الاحتفاظ بها.
 *
 * الملفات التي لا يطابق اسمها الصيغة تُتجاهل ولا تُحذف أبدًا، فوجود ملف غريب
 * في الوجهة ليس سببًا لحذفه.
 */
export function selectExpiredBackups(fileNames, { retentionDays, now = Date.now() }) {
  if (!Number.isFinite(retentionDays) || retentionDays < 1) {
    throw new BackupError("retentionDays must be a positive number");
  }
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  return fileNames
    .map((fileName) => ({ fileName, timestamp: parseBackupTimestamp(fileName) }))
    .filter((entry) => entry.timestamp !== null && entry.timestamp.getTime() < cutoff)
    .map((entry) => entry.fileName)
    .sort();
}

/** يبني واجهة pg_dump بصيغة custom — المضغوطة والقابلة للاستعادة الجزئية. */
export function pgDumpCommand(databaseUrl, outputPath) {
  return {
    command: "pg_dump",
    args: ["--format=custom", "--no-owner", "--no-privileges", "--file", outputPath, databaseUrl],
  };
}

/** يبني واجهة openssl للتشفير وفكّه بنفس المعطيات. */
export function opensslCommand({ mode, inputPath, outputPath, keyFilePath }) {
  if (mode !== "encrypt" && mode !== "decrypt") {
    throw new BackupError(`unsupported openssl mode "${mode}"`);
  }
  const args = [
    "enc",
    "-aes-256-cbc",
    "-pbkdf2",
    "-iter",
    "200000",
    "-salt",
    "-pass",
    `file:${keyFilePath}`,
    ...(mode === "decrypt" ? ["-d"] : []),
    "-in",
    inputPath,
    "-out",
    outputPath,
  ];
  return { command: "openssl", args };
}

function run({ command, args }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(new BackupError(`${command} failed to start: ${error.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new BackupError(`${command} exited with code ${code}: ${stderr.trim() || "no stderr output"}`));
    });
  });
}

function requireEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new BackupError("DATABASE_URL is not set. The backup needs an explicit target database.");
  }
  const backupDir = process.env.BACKUP_DIR;
  if (!backupDir) {
    throw new BackupError(
      "BACKUP_DIR is not set. Point it at an off-server destination; local-only backups do not satisfy the backup requirement.",
    );
  }
  const key = process.env.BACKUP_ENCRYPTION_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new BackupError(`BACKUP_ENCRYPTION_KEY must be set and at least ${MIN_KEY_LENGTH} characters long.`);
  }
  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? 14);
  if (!Number.isFinite(retentionDays) || retentionDays < 1) {
    throw new BackupError("BACKUP_RETENTION_DAYS must be a positive number.");
  }
  return { databaseUrl, backupDir, key, retentionDays };
}

/**
 * ينفّذ نسخة كاملة: dump → تشفير → checksum → manifest → تحقق عكسي → تقليم.
 *
 * @returns {Promise<{fileName: string, checksum: string, bytes: number, removed: string[]}>}
 */
export async function runBackup({ databaseUrl, backupDir, key, retentionDays, now = Date.now() }) {
  const database = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!database) throw new BackupError("DATABASE_URL must include a database name.");

  const workDirectory = await mkdtemp(path.join(tmpdir(), "saboraty-backup-"));
  const plainPath = path.join(workDirectory, "dump.pgc");
  const encryptedPath = path.join(workDirectory, "dump.enc");
  const keyFilePath = path.join(workDirectory, "key.txt");
  const verifyPath = path.join(workDirectory, "verify.pgc");

  try {
    await writeFile(keyFilePath, key, { mode: 0o600 });

    await run(pgDumpCommand(databaseUrl, plainPath));
    const plainBytes = await readFile(plainPath);
    if (plainBytes.length === 0) throw new BackupError("pg_dump produced an empty archive.");

    await run(opensslCommand({ mode: "encrypt", inputPath: plainPath, outputPath: encryptedPath, keyFilePath }));

    // التحقق العكسي: لا تُعتبر النسخة صالحة قبل إثبات أن المفتاح يفتحها فعلًا.
    await run(opensslCommand({ mode: "decrypt", inputPath: encryptedPath, outputPath: verifyPath, keyFilePath }));
    const decrypted = await readFile(verifyPath);
    const checksum = sha256Hex(decrypted);
    if (checksum !== sha256Hex(plainBytes)) {
      throw new BackupError("round-trip verification failed: decrypted archive does not match the dump.");
    }

    const encrypted = await readFile(encryptedPath);
    const fileName = backupFileName({ database, timestamp: now });
    const destination = path.join(backupDir, fileName);
    await writeFile(destination, encrypted, { mode: 0o600 });

    await appendManifest(backupDir, {
      fileName,
      database,
      checksum,
      bytes: encrypted.length,
      createdAt: new Date(now).toISOString(),
    });

    const removed = await pruneBackups(backupDir, retentionDays, now);

    return { fileName, checksum, bytes: encrypted.length, removed };
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}

export async function appendManifest(backupDir, entry) {
  const manifestPath = path.join(backupDir, "manifest.jsonl");
  let existing = "";
  try {
    existing = await readFile(manifestPath, "utf8");
  } catch {
    existing = "";
  }
  await writeFile(manifestPath, `${existing}${JSON.stringify(entry)}\n`, { mode: 0o600 });
  return manifestPath;
}

export async function pruneBackups(backupDir, retentionDays, now = Date.now()) {
  const entries = await readdir(backupDir).catch(() => []);
  const expired = selectExpiredBackups(entries, { retentionDays, now });
  for (const fileName of expired) {
    await rm(path.join(backupDir, fileName), { force: true });
  }
  return expired;
}

/** يقرأ آخر إدخال في الـmanifest — يُستخدم في تجربة الاستعادة. */
export async function readLatestManifestEntry(backupDir) {
  const manifestPath = path.join(backupDir, "manifest.jsonl");
  const content = await readFile(manifestPath, "utf8").catch(() => "");
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) throw new BackupError(`no backup manifest entries found in ${manifestPath}`);
  return JSON.parse(lines[lines.length - 1]);
}

async function main() {
  const { databaseUrl, backupDir, key, retentionDays } = requireEnvironment();
  const hostname = new URL(databaseUrl).hostname;
  if (!LOOPBACK_HOSTS.has(hostname) && !process.argv.includes("--allow-remote")) {
    throw new BackupError(
      `DATABASE_URL host "${hostname}" is not loopback. Re-run with --allow-remote when this is the intended environment.`,
    );
  }
  const info = await stat(backupDir).catch(() => null);
  if (!info?.isDirectory()) {
    throw new BackupError(`BACKUP_DIR "${backupDir}" does not exist or is not a directory.`);
  }

  const result = await runBackup({ databaseUrl, backupDir, key, retentionDays });
  console.log(`Backup complete: ${result.fileName}`);
  console.log(`  bytes:    ${result.bytes}`);
  console.log(`  sha256:   ${result.checksum}`);
  console.log(`  retained: ${retentionDays} day(s); removed ${result.removed.length} expired archive(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`BACKUP FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
