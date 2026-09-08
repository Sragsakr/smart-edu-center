import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("application password hashing", () => {
  it("hashes and verifies a valid password without returning the plaintext", async () => {
    const password = "CorrectHorseBatteryStaple!";
    const digest = await hashPassword(password);

    expect(digest).not.toContain(password);
    expect(await verifyPassword(password, digest)).toBe(true);
    expect(await verifyPassword("wrong-password", digest)).toBe(false);
  });

  it("uses a different salt for repeated hashes", async () => {
    const first = await hashPassword("CorrectHorseBatteryStaple!");
    const second = await hashPassword("CorrectHorseBatteryStaple!");

    expect(first).not.toBe(second);
  });

  it("rejects malformed or unsupported digests safely", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
    expect(await verifyPassword("CorrectHorseBatteryStaple!", "not-a-digest")).toBe(false);
    expect(await verifyPassword("CorrectHorseBatteryStaple!", "bcrypt$abc$def")).toBe(false);
  });
});
