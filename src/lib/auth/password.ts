import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const DIGEST_VERSION = "scrypt-v1";
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

type PasswordDigest = {
  version: typeof DIGEST_VERSION;
  salt: string;
  key: string;
};

function assertPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`);
  }
}

function parseDigest(digest: string): PasswordDigest | null {
  const digestParts = digest.split("$");
  if (digestParts.length !== 3) return null;
  const [version, salt, key] = digestParts;
  if (version !== DIGEST_VERSION || !salt || !key) return null;
  return { version, salt, key };
}

export async function hashPassword(password: string): Promise<string> {
  assertPassword(password);
  const salt = randomBytes(SALT_BYTES);
  const key = (await scrypt(password, salt, KEY_BYTES)) as Buffer;
  return [DIGEST_VERSION, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, digest: string): Promise<boolean> {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) return false;
  const parsed = parseDigest(digest);
  if (!parsed) return false;

  try {
    const salt = Buffer.from(parsed.salt, "base64url");
    const expected = Buffer.from(parsed.key, "base64url");
    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
    const actual = (await scrypt(password, salt, KEY_BYTES)) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
