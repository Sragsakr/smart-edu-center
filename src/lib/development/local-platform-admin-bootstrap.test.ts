import { describe, expect, it, vi } from "vitest";

import type { CurrentUserProvider } from "@/lib/auth/current-user-provider";
import type {
  SqlExecutor,
  SqlQueryResult,
  SqlRow,
  TransactionalSqlExecutor,
} from "@/lib/database/sql-executor";

vi.mock("server-only", () => ({}));

import {
  bootstrapCurrentLocalPlatformAdmin,
  isLocalDevelopmentBootstrapAvailable,
  type LocalBootstrapRuntime,
} from "./local-platform-admin-bootstrap";

const localRuntime: LocalBootstrapRuntime = {
  nodeEnv: "development",
  database: {
    backend: "postgres",
    databaseUrl: "postgresql://localhost:5432/saboraty",
  },
};

class RecordingTransactionalSqlExecutor implements TransactionalSqlExecutor {
  readonly queries: { text: string; values: readonly unknown[] }[] = [];
  transactionCount = 0;

  async query<Row extends SqlRow = SqlRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<SqlQueryResult<Row>> {
    this.queries.push({ text, values });
    return { rows: [], rowCount: 1 };
  }

  async transaction<Result>(
    operation: (sql: SqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    this.transactionCount += 1;
    return operation(this);
  }
}

function currentUserProvider(
  user: { id: string; email: string } | null,
): CurrentUserProvider {
  return { getCurrentUser: vi.fn().mockResolvedValue(user) };
}

describe("local platform-admin bootstrap safeguards", () => {
  it("allows only development + PostgreSQL + a loopback database", () => {
    expect(isLocalDevelopmentBootstrapAvailable(localRuntime)).toBe(true);
    expect(isLocalDevelopmentBootstrapAvailable({
      ...localRuntime,
      database: { ...localRuntime.database, databaseUrl: "postgresql://[::1]:5432/saboraty" },
    })).toBe(true);
  });

  it.each([
    ["production runtime", { ...localRuntime, nodeEnv: "production" }],
    ["Supabase backend", { ...localRuntime, database: { backend: "supabase" as const, databaseUrl: null } }],
    ["remote PostgreSQL", { ...localRuntime, database: { backend: "postgres" as const, databaseUrl: "postgresql://db.example.com/saboraty" } }],
  ])("rejects %s", (_label, runtime) => {
    expect(isLocalDevelopmentBootstrapAvailable(runtime)).toBe(false);
  });
});

describe("bootstrapCurrentLocalPlatformAdmin rejects production", () => {
  it("throws before reading session when nodeEnv is production", async () => {
    const provider = currentUserProvider({ id: "user-id", email: "admin@example.com" });
    const sql = new RecordingTransactionalSqlExecutor();

    await expect(bootstrapCurrentLocalPlatformAdmin({
      runtime: { ...localRuntime, nodeEnv: "production" },
      currentUserProvider: provider,
      sql,
    })).rejects.toThrow("unavailable in this environment");

    expect(provider.getCurrentUser).not.toHaveBeenCalled();
    expect(sql.transactionCount).toBe(0);
  });
});

describe("bootstrapCurrentLocalPlatformAdmin", () => {
  it("upserts the authenticated identity and grants local platform access transactionally", async () => {
    const sql = new RecordingTransactionalSqlExecutor();
    const user = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "admin@example.com",
    };

    await bootstrapCurrentLocalPlatformAdmin({
      runtime: localRuntime,
      currentUserProvider: currentUserProvider(user),
      sql,
    });

    expect(sql.transactionCount).toBe(1);
    expect(sql.queries).toHaveLength(2);
    expect(sql.queries[0]?.text).toContain("insert into public.users (id, email)");
    expect(sql.queries[0]?.text).toContain("on conflict (id) do update");
    expect(sql.queries[0]?.values).toEqual([user.id, user.email]);
    expect(sql.queries[1]?.text).toContain("insert into public.platform_admins (user_id)");
    expect(sql.queries[1]?.text).toContain("on conflict (user_id) do nothing");
    expect(sql.queries[1]?.values).toEqual([user.id]);
  });

  it("rejects an unauthenticated request before opening a transaction", async () => {
    const sql = new RecordingTransactionalSqlExecutor();

    await expect(bootstrapCurrentLocalPlatformAdmin({
      runtime: localRuntime,
      currentUserProvider: currentUserProvider(null),
      sql,
    })).rejects.toThrow("Authentication is required");

    expect(sql.transactionCount).toBe(0);
  });

  it("rejects an authenticated identity without an email", async () => {
    const sql = new RecordingTransactionalSqlExecutor();

    await expect(bootstrapCurrentLocalPlatformAdmin({
      runtime: localRuntime,
      currentUserProvider: currentUserProvider({ id: "user-id", email: "  " }),
      sql,
    })).rejects.toThrow("must have an email address");

    expect(sql.transactionCount).toBe(0);
  });

  it("rejects a production invocation before reading the session", async () => {
    const provider = currentUserProvider({ id: "user-id", email: "admin@example.com" });
    const sql = new RecordingTransactionalSqlExecutor();

    await expect(bootstrapCurrentLocalPlatformAdmin({
      runtime: { ...localRuntime, nodeEnv: "production" },
      currentUserProvider: provider,
      sql,
    })).rejects.toThrow("unavailable in this environment");

    expect(provider.getCurrentUser).not.toHaveBeenCalled();
    expect(sql.transactionCount).toBe(0);
  });
});
