import {
  assertPassword,
  hashPassword,
  parsePasswordDigest,
  verifyPassword,
} from "@/lib/auth/password-rules.mjs";

export { hashPassword, verifyPassword };

/**
 * كلمة المرور تُجزّأ بصيغة `scrypt-v1$salt$key`، والقواعد نفسها مشتركة مع سكربتات الـSeed
 * في `password-rules.mjs` حتى لا تتكرر الصيغة في مكانين.
 * لا تُخزَّن كلمة المرور الخام ولا تُعاد أبدًا.
 */
export function isValidPasswordDigest(digest: string): boolean {
  return parsePasswordDigest(digest) !== null;
}

export { assertPassword };
