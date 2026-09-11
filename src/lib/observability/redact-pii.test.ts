import { describe, expect, it } from "vitest";

import { REDACTED, redactText, redactValue } from "./redact-pii";

describe("redactText", () => {
  it("removes email addresses", () => {
    expect(redactText("failed for owner.center@saboraty.test")).toBe(`failed for ${REDACTED}`);
  });

  it("removes phone numbers in local and international shapes", () => {
    expect(redactText("call +201001234567 now")).toBe(`call ${REDACTED} now`);
    expect(redactText("call 0100 123 4567 now")).toBe(`call ${REDACTED} now`);
  });

  it("removes database connection strings entirely", () => {
    expect(redactText("connect postgresql://srag:secret@127.0.0.1:5433/saboraty failed")).toBe(
      `connect ${REDACTED} failed`,
    );
  });

  it("removes long hex digests and opaque tokens", () => {
    const digest = "a".repeat(64);
    expect(redactText(`token_digest=${digest}`)).not.toContain(digest);
    expect(redactText("bearer abcdefghijklmnopqrstuvwx")).not.toContain("abcdefghijklmnopqrstuvwx");
  });

  it("caps very long strings instead of writing them whole", () => {
    expect(redactText("x".repeat(5000)).length).toBeLessThanOrEqual(2000);
  });

  it("keeps identifiers so a log line can still be traced to the resource that failed", () => {
    const tenantId = "11111111-1111-4111-8111-111111111111";
    expect(redactText(`tenant ${tenantId} failed`)).toBe(`tenant ${tenantId} failed`);
  });

  it("keeps ISO timestamps, which are not personal data", () => {
    expect(redactText("failed at 2026-09-11T18:00:00.000Z")).toBe("failed at 2026-09-11T18:00:00.000Z");
    expect(redactText("window 2026-09-11 to 2026-09-18")).toBe("window 2026-09-11 to 2026-09-18");
  });

  it("keeps ordinary diagnostic text readable", () => {
    expect(redactText("workspace request is no longer pending")).toBe("workspace request is no longer pending");
  });
});

describe("redactValue", () => {
  it("drops the content of any sensitive key regardless of value shape", () => {
    expect(redactValue("hunter2", "password")).toBe(REDACTED);
    expect(redactValue({ nested: "x" }, "sessionToken")).toBe(REDACTED);
    expect(redactValue("x", "authorization")).toBe(REDACTED);
  });

  it("redacts nested values inside objects and arrays", () => {
    const result = redactValue({
      tenantId: "11111111-1111-4111-8111-111111111111",
      contact: { email: "guardian@example.test", phone: "+201001234567" },
      attempts: [1, 2],
    }) as Record<string, unknown>;

    expect(result.tenantId).toBe("11111111-1111-4111-8111-111111111111");
    expect(JSON.stringify(result)).not.toContain("guardian@example.test");
    expect(JSON.stringify(result)).not.toContain("+201001234567");
    expect(result.attempts).toEqual([1, 2]);
  });

  it("reduces an Error to name and a redacted message", () => {
    const result = redactValue(new Error("login failed for a@b.test")) as { name: string; message: string };
    expect(result.name).toBe("Error");
    expect(result.message).toBe(`login failed for ${REDACTED}`);
  });

  it("stops at a depth limit instead of walking an unbounded tree", () => {
    let deep: Record<string, unknown> = { value: "leaf" };
    for (let index = 0; index < 10; index += 1) deep = { nested: deep };
    expect(JSON.stringify(redactValue(deep))).toContain("[depth-limit]");
  });

  it("passes through primitives that cannot carry personal data", () => {
    expect(redactValue(42)).toBe(42);
    expect(redactValue(true)).toBe(true);
    expect(redactValue(null)).toBeNull();
    expect(redactValue(undefined)).toBeUndefined();
  });
});
