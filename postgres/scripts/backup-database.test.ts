import { describe, expect, it } from "vitest";

import {
  BackupError,
  backupFileName,
  opensslCommand,
  parseBackupTimestamp,
  pgDumpCommand,
  selectExpiredBackups,
  sha256Hex,
} from "./backup-database.mjs";

const DAY = 24 * 60 * 60 * 1000;

describe("backup file naming", () => {
  it("sorts lexicographically by time so the newest archive is always last", () => {
    const older = backupFileName({ database: "saboraty", timestamp: Date.UTC(2026, 8, 11, 8, 0, 0) });
    const newer = backupFileName({ database: "saboraty", timestamp: Date.UTC(2026, 8, 11, 9, 30, 0) });
    expect([newer, older].sort()).toEqual([older, newer]);
    expect(older).toBe("saboraty-saboraty-2026-09-11T08-00-00-000Z.dump.enc");
  });

  it("round-trips a generated name back to its timestamp", () => {
    const timestamp = Date.UTC(2026, 0, 2, 3, 4, 5, 6);
    const parsed = parseBackupTimestamp(backupFileName({ database: "saboraty", timestamp }));
    expect(parsed?.getTime()).toBe(timestamp);
  });

  it("ignores names that do not match the backup pattern", () => {
    expect(parseBackupTimestamp("manifest.jsonl")).toBeNull();
    expect(parseBackupTimestamp("saboraty-saboraty-not-a-date.dump.enc")).toBeNull();
    expect(parseBackupTimestamp("saboraty-saboraty-2026-09-11T08-00-00-000Z.tar")).toBeNull();
  });
});

describe("retention policy", () => {
  const now = Date.UTC(2026, 8, 11, 12, 0, 0);
  const at = (daysAgo: number) => backupFileName({ database: "saboraty", timestamp: now - daysAgo * DAY });

  it("keeps archives inside the retention window and removes only older ones", () => {
    const files = [at(0), at(3), at(13), at(15), at(40)];
    expect(selectExpiredBackups(files, { retentionDays: 14, now })).toEqual([at(40), at(15)]);
  });

  it("never deletes files it does not recognize", () => {
    const files = ["manifest.jsonl", "notes.txt", at(30)];
    expect(selectExpiredBackups(files, { retentionDays: 7, now })).toEqual([at(30)]);
  });

  it("removes nothing when the window covers every archive", () => {
    expect(selectExpiredBackups([at(0), at(1)], { retentionDays: 30, now })).toEqual([]);
  });

  it("rejects a non-positive retention window instead of defaulting silently", () => {
    expect(() => selectExpiredBackups([at(1)], { retentionDays: 0, now })).toThrow(BackupError);
    expect(() => selectExpiredBackups([at(1)], { retentionDays: Number.NaN, now })).toThrow(BackupError);
  });
});

describe("backup commands", () => {
  it("dumps in custom format without ownership so restores are portable", () => {
    const { command, args } = pgDumpCommand("postgresql://user@127.0.0.1:5433/saboraty", "/tmp/out.pgc");
    expect(command).toBe("pg_dump");
    expect(args).toContain("--format=custom");
    expect(args).toContain("--no-owner");
    expect(args).toContain("--no-privileges");
    expect(args.at(-1)).toBe("postgresql://user@127.0.0.1:5433/saboraty");
  });

  it("uses the same cipher parameters for encryption and decryption", () => {
    const base = { inputPath: "/tmp/in", outputPath: "/tmp/out", keyFilePath: "/tmp/key" };
    const encrypt = opensslCommand({ ...base, mode: "encrypt" });
    const decrypt = opensslCommand({ ...base, mode: "decrypt" });
    expect(encrypt.args).toContain("-aes-256-cbc");
    expect(encrypt.args).toContain("-pbkdf2");
    expect(encrypt.args).not.toContain("-d");
    expect(decrypt.args).toContain("-d");
    expect(decrypt.args.filter((arg) => arg === "-aes-256-cbc")).toHaveLength(1);
    expect(encrypt.args.filter((arg) => arg !== "-d")).toEqual(decrypt.args.filter((arg) => arg !== "-d"));
  });

  it("never accepts a passphrase on the command line, only a key file", () => {
    const { args } = opensslCommand({
      mode: "encrypt",
      inputPath: "/tmp/in",
      outputPath: "/tmp/out",
      keyFilePath: "/tmp/key",
    });
    expect(args).toContain("-pass");
    expect(args[args.indexOf("-pass") + 1]).toBe("file:/tmp/key");
  });

  it("rejects an unknown mode rather than guessing", () => {
    expect(() =>
      opensslCommand({
        mode: "sign" as unknown as "encrypt",
        inputPath: "a",
        outputPath: "b",
        keyFilePath: "c",
      }),
    ).toThrow(BackupError);
  });
});

describe("checksums", () => {
  it("produces a stable sha256 for identical content and differs for changed content", () => {
    expect(sha256Hex(Buffer.from("saboraty"))).toBe(sha256Hex(Buffer.from("saboraty")));
    expect(sha256Hex(Buffer.from("saboraty"))).not.toBe(sha256Hex(Buffer.from("saboratY")));
    expect(sha256Hex(Buffer.from("saboraty"))).toHaveLength(64);
  });
});
