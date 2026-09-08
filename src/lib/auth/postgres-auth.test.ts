import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieState = vi.hoisted(() => ({ token: undefined as string | undefined, setOptions: undefined as Record<string, unknown> | undefined, deleted: false }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => cookieState.token ? { value: cookieState.token } : undefined,
    set: (_name: string, value: string, options: Record<string, unknown>) => { cookieState.token = value; cookieState.setOptions = options; },
    delete: () => { cookieState.token = undefined; cookieState.deleted = true; },
  })),
}));

import { hashPassword } from "./password";
import { authenticatePostgresUser, clearPostgresSession, createPostgresSession, getPostgresAccountAccess, getPostgresCurrentUser } from "./postgres-auth";
import type { SqlExecutor, TransactionalSqlExecutor } from "@/lib/database/sql-executor";

class AuthSql implements TransactionalSqlExecutor {
  passwordDigest: string | null = null;
  user: { id: string; email: string; active: boolean } | null = { id: "user-id", email: "admin@example.com", active: true };
  sessionRevoked = false;
  sessionExpired = false;
  sessionCreated = false;
  platformAdmin = true;
  async query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values: readonly unknown[] = []) {
    if (text.includes("password_digest")) {
      const matchesUser = String(values[0]).toLowerCase() === this.user?.email.toLowerCase();
      return { rows: matchesUser && this.user && this.passwordDigest ? [{ ...this.user, password_digest: this.passwordDigest } as unknown as Row] : [], rowCount: matchesUser && this.user && this.passwordDigest ? 1 : 0 };
    }
    if (text.includes("from public.platform_admins")) return { rows: this.platformAdmin ? [{ user_id: "user-id" } as unknown as Row] : [], rowCount: this.platformAdmin ? 1 : 0 };
    if (text.includes("insert into public.auth_sessions")) { this.sessionCreated = true; return { rows: [], rowCount: 1 }; }
    if (text.includes("update public.auth_sessions") && text.includes("revoked_at")) { this.sessionRevoked = true; return { rows: [], rowCount: 1 }; }
    if (text.includes("from public.auth_sessions")) {
      if (this.sessionRevoked || this.sessionExpired || !this.user?.active || !cookieState.token) return { rows: [], rowCount: 0 };
      return { rows: [{ session_id: "session-id", id: "user-id", email: "admin@example.com" } as unknown as Row], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  async transaction<Result>(operation: (sql: SqlExecutor) => Promise<Result>): Promise<Result> {
    return operation(this);
  }
}

beforeEach(() => {
  cookieState.token = undefined;
  cookieState.setOptions = undefined;
  cookieState.deleted = false;
});

describe("PostgreSQL Fresh Auth credentials", () => {
  it("accepts the correct password", async () => {
    const sql = new AuthSql();
    sql.passwordDigest = await hashPassword("LocalPass.123");
    await expect(authenticatePostgresUser(sql, "ADMIN@example.com", "LocalPass.123")).resolves.toEqual({ id: "user-id", email: "admin@example.com" });
  });

  it("rejects wrong and unknown passwords", async () => {
    const sql = new AuthSql();
    sql.passwordDigest = await hashPassword("LocalPass.123");
    await expect(authenticatePostgresUser(sql, "admin@example.com", "WrongPass.123")).resolves.toBeNull();
    await expect(authenticatePostgresUser(sql, "missing@example.com", "LocalPass.123")).resolves.toBeNull();
  });

  it("rejects an inactive user at the SQL boundary", async () => {
    const sql = new AuthSql();
    sql.user = null;
    sql.passwordDigest = await hashPassword("LocalPass.123");
    await expect(authenticatePostgresUser(sql, "admin@example.com", "LocalPass.123")).resolves.toBeNull();
  });
});

describe("PostgreSQL Platform Admin authorization", () => {
  it("authorizes only users present in platform_admins", async () => {
    const sql = new AuthSql();
    await expect(getPostgresAccountAccess(sql, "user-id")).resolves.toMatchObject({ isPlatformAdmin: true });
    sql.platformAdmin = false;
    await expect(getPostgresAccountAccess(sql, "user-id")).resolves.toMatchObject({ isPlatformAdmin: false });
  });
});

describe("PostgreSQL Fresh Auth sessions", () => {
  it("creates an opaque HttpOnly SameSite session cookie and resolves the current user", async () => {
    const sql = new AuthSql();
    await createPostgresSession(sql, "user-id");
    expect(sql.sessionCreated).toBe(true);
    expect(cookieState.token).toBeTruthy();
    expect(cookieState.setOptions).toMatchObject({ httpOnly: true, sameSite: "lax", secure: false, path: "/" });
    expect(await getPostgresCurrentUser(sql)).toEqual({ id: "user-id", email: "admin@example.com" });
  });

  it("rejects sessions for inactive users", async () => {
    const sql = new AuthSql();
    await createPostgresSession(sql, "user-id");
    if (sql.user) sql.user.active = false;
    await expect(getPostgresCurrentUser(sql)).resolves.toBeNull();
  });

  it("rejects expired and revoked sessions and logout revokes the server session", async () => {
    const sql = new AuthSql();
    await createPostgresSession(sql, "user-id");
    sql.sessionExpired = true;
    await expect(getPostgresCurrentUser(sql)).resolves.toBeNull();
    sql.sessionExpired = false;
    await clearPostgresSession(sql);
    expect(sql.sessionRevoked).toBe(true);
    expect(cookieState.deleted).toBe(true);
    await expect(getPostgresCurrentUser(sql)).resolves.toBeNull();
  });
});
