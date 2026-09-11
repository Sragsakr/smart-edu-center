/**
 * قواعد كلمة المرور — مصدر واحد للتجزئة والتحقق، يشترك فيه كود التطبيق وسكربتات الـSeed.
 *
 * مكتوب بـJavaScript صريح ليمكن استيراده من TypeScript (عبر allowJs) ومن سكربتات Node
 * بلا خطوة بناء، فلا تتكرر صيغة الـdigest في مكانين.
 *
 * الصيغة: `scrypt-v1$<salt base64url>$<key base64url>`
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const DIGEST_VERSION = "scrypt-v1";
export const SALT_BYTES = 16;
export const KEY_BYTES = 64;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

/**
 * @param {string} password
 * @returns {void}
 */
export function assertPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`);
  }
}

/**
 * @param {string} digest
 * @returns {{ version: string, salt: string, key: string } | null}
 */
export function parsePasswordDigest(digest) {
  const parts = digest.split("$");
  if (parts.length !== 3) return null;
  const [version, salt, key] = parts;
  if (version !== DIGEST_VERSION || !salt || !key) return null;
  return { version, salt, key };
}

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  assertPassword(password);
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEY_BYTES);
  return [DIGEST_VERSION, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/**
 * @param {string} password
 * @param {string} digest
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, digest) {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) return false;
  const parsed = parsePasswordDigest(digest);
  if (!parsed) return false;

  try {
    const salt = Buffer.from(parsed.salt, "base64url");
    const expected = Buffer.from(parsed.key, "base64url");
    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
    const actual = await scrypt(password, salt, KEY_BYTES);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
