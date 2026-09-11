import { describe, expect, it, vi } from "vitest";

import type { AccessScopedSqlExecutor, SqlExecutor, SqlQueryResult, SqlRow, TransactionalSqlExecutor } from "@/lib/database/sql-executor";

vi.mock("server-only", () => ({}));

import { bootstrapLocalPlatformAdmin, isLocalDevelopmentBootstrapAvailable, type LocalBootstrapRuntime } from "./local-platform-admin-bootstrap";

const localRuntime: LocalBootstrapRuntime = {
  nodeEnv: "development",
  databaseUrl: "postgresql://localhost:5432/saboraty",
};

class RecordingSql implements TransactionalSqlExecutor {
  readonly queries: { text: string; values: readonly unknown[] }[] = [];
  transactionCount = 0;
  async query<Row extends SqlRow = SqlRow>(text: string, values: readonly unknown[] = []): Promise<SqlQueryResult<Row>> {
    this.queries.push({ text, values });
    if (text.includes("returning id, email")) return { rows: [{ id: "user-id", email: String(values[0]) } as unknown as Row], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  }
  async transaction<Result>(operation: (sql: SqlExecutor) => Promise<Result>): Promise<Result> {
    this.transactionCount += 1;
    return operation(this);
  }
  async withSession<Result>(_digest: string, operation: (sql: AccessScopedSqlExecutor) => Promise<Result>): Promise<Result> {
    this.transactionCount += 1;
    return operation(this as unknown as AccessScopedSqlExecutor);
  }
  async withoutSession<Result>(operation: (sql: AccessScopedSqlExecutor) => Promise<Result>): Promise<Result> {
    this.transactionCount += 1;
    return operation(this as unknown as AccessScopedSqlExecutor);
  }
  async enterTenantScope(): Promise<void> {}
  async leaveTenantScope(): Promise<void> {}
  async enterPlatformScope(): Promise<void> {}
  async leavePlatformScope(): Promise<void> {}
}

describe("local Fresh Auth platform-admin bootstrap", () => {
  it.each([
    ["development with loopback PostgreSQL", localRuntime, true],
    ["production", { ...localRuntime, nodeEnv: "production" }, false],
    ["development with remote PostgreSQL", { ...localRuntime, databaseUrl: "postgresql://db.example.com/saboraty" }, false],
    ["development with an invalid database URL", { ...localRuntime, databaseUrl: "not-a-url" }, false],
  ])("reports availability for %s", (_scenario, runtime, expected) => {
    expect(isLocalDevelopmentBootstrapAvailable(runtime)).toBe(expected);
  });

  it("creates app user, credentials, and platform admin in one transaction", async () => {
    const sql = new RecordingSql();
    const result = await bootstrapLocalPlatformAdmin({ runtime: localRuntime, sql, email: " Admin@Example.com ", password: "LocalPass.123" });
    expect(result).toEqual({ userId: "user-id", email: "admin@example.com" });
    expect(sql.transactionCount).toBe(1);
    expect(sql.queries).toHaveLength(3);
    expect(sql.queries[0]?.values).toEqual(["admin@example.com"]);
    expect(sql.queries[1]?.text).toContain("password_changed_at = now()");
    expect(sql.queries[1]?.text).not.toContain("updated_at");
    expect(sql.queries[1]?.values[0]).toBe("user-id");
    expect(String(sql.queries[1]?.values[1])).toMatch(/^scrypt-v1\$/);
    expect(sql.queries[1]?.values[1]).not.toBe("LocalPass.123");
    expect(sql.queries[2]?.values).toEqual(["user-id"]);
  });

  it("rejects unsafe runtime before hashing or opening a transaction", async () => {
    const sql = new RecordingSql();
    await expect(bootstrapLocalPlatformAdmin({ runtime: { ...localRuntime, nodeEnv: "production" }, sql, email: "admin@example.com", password: "LocalPass.123" })).rejects.toThrow("unavailable");
    expect(sql.transactionCount).toBe(0);
  });
});
