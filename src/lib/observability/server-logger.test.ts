import { describe, expect, it, vi } from "vitest";

import { buildLogRecord } from "./server-logger";

describe("buildLogRecord", () => {
  const timestamp = new Date("2026-09-11T18:00:00.000Z");

  it("emits a single-line JSON record with level, event and ISO timestamp", () => {
    const record = buildLogRecord({ level: "info", event: "tenant.created", message: "ok", timestamp });
    expect(record).toEqual({
      level: "info",
      event: "tenant.created",
      message: "ok",
      timestamp: "2026-09-11T18:00:00.000Z",
    });
    expect(JSON.stringify(record)).not.toContain("\n");
  });

  it("redacts personal data found in the message", () => {
    const record = buildLogRecord({
      level: "error",
      event: "login.failed",
      message: "no credentials for owner@example.test",
      timestamp,
    });
    expect(record.message).not.toContain("owner@example.test");
  });

  it("redacts personal data and secrets inside the context", () => {
    const record = buildLogRecord({
      level: "error",
      event: "approval.failed",
      message: "failed",
      context: {
        tenantSlug: "demo-center",
        ownerEmail: "center.owner@saboraty.test",
        phone: "+201001111111",
        sessionToken: "abcdefghijklmnopqrstuvwxyz123456",
      },
      timestamp,
    });
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("center.owner@saboraty.test");
    expect(serialized).not.toContain("+201001111111");
    expect(serialized).not.toContain("abcdefghijklmnopqrstuvwxyz123456");
    expect(record.context?.tenantSlug).toBe("demo-center");
  });

  it("omits the context key entirely when there is nothing to log", () => {
    expect(buildLogRecord({ level: "warn", event: "x", message: "y", context: {}, timestamp })).not.toHaveProperty(
      "context",
    );
  });

  it("never throws on an unserializable cyclic context", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };
    cyclic.self = cyclic;
    expect(() => buildLogRecord({ level: "error", event: "x", message: "y", context: cyclic, timestamp })).not.toThrow();
  });

  it("writes to the right stream for the level", async () => {
    const { logEvent } = await import("./server-logger");
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      logEvent({ level: "info", event: "a", message: "b" });
      expect(stdout).toHaveBeenCalledTimes(1);
      expect(stderr).not.toHaveBeenCalled();

      logEvent({ level: "error", event: "a", message: "b" });
      expect(stderr).toHaveBeenCalledTimes(1);
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
});
