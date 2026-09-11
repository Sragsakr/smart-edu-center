import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieState = vi.hoisted(() => ({ token: undefined as string | undefined, setOptions: undefined as Record<string, unknown> | undefined, deleted: false }));
vi.mock("next/headers", () => ({
  // الترويسات تُقرأ لتسجيل بيانات الجهاز مع الجلسة.
  headers: vi.fn(async () => {
    const requestHeaders = new Headers();
    requestHeaders.set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15");
    requestHeaders.set("x-forwarded-for", "203.0.113.5");
    return requestHeaders;
  }),
  cookies: vi.fn(async () => ({
    get: () => cookieState.token ? { value: cookieState.token } : undefined,
    set: (_name: string, value: string, options: Record<string, unknown>) => { cookieState.token = value; cookieState.setOptions = options; },
    delete: () => { cookieState.token = undefined; cookieState.deleted = true; },
  })),
}));

import { hashPassword } from "./password";
import { authenticatePostgresUser, clearPostgresSession, createPostgresSession, getPostgresAccountAccess, getPostgresCurrentUser } from "./postgres-auth";
import type { AccessScopedSqlExecutor, SqlExecutor, TransactionalSqlExecutor } from "@/lib/database/sql-executor";
import { withAccessContexts } from "@/test/unit/access-context-double";

class AuthSql implements TransactionalSqlExecutor {
  passwordDigest: string | null = null;
  user: { id: string; email: string; active: boolean } | null = { id: "user-id", email: "admin@example.com", active: true };
  sessionRevoked = false;
  sessionExpired = false;
  sessionCreated = false;
  sessionDevice: { userAgent: string | null; ipAddress: string | null } | null = null;
  platformAdmin = true;
  async query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values: readonly unknown[] = []) {
    if (text.includes("login_lookup") || text.includes("password_digest")) {
      const matchesUser = String(values[0]).toLowerCase() === this.user?.email.toLowerCase();
      return { rows: matchesUser && this.user && this.passwordDigest ? [{ user_id: this.user.id, email: this.user.email, password_digest: this.passwordDigest } as unknown as Row] : [], rowCount: matchesUser && this.user && this.passwordDigest ? 1 : 0 };
    }
    if (text.includes("from public.platform_admins")) return { rows: this.platformAdmin ? [{ user_id: "user-id" } as unknown as Row] : [], rowCount: this.platformAdmin ? 1 : 0 };
    if (text.includes("insert into public.auth_sessions")) {
      this.sessionCreated = true;
      this.sessionDevice = { userAgent: values[3] as string | null, ipAddress: values[4] as string | null };
      return { rows: [], rowCount: 1 };
    }
    if (text.includes("update public.auth_sessions") && text.includes("revoked_at")) { this.sessionRevoked = true; return { rows: [], rowCount: 1 }; }
    if (text.includes("private.current_app_user_id")) {
      if (this.sessionRevoked || this.sessionExpired || !this.user?.active || !cookieState.token) return { rows: [], rowCount: 0 };
      return { rows: [{ id: "user-id", email: "admin@example.com" } as unknown as Row], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  async transaction<Result>(operation: (sql: SqlExecutor) => Promise<Result>): Promise<Result> {
    return operation(this);
  }
  async withSession<Result>(_digest: string, operation: (sql: AccessScopedSqlExecutor) => Promise<Result>): Promise<Result> {
    return operation(withAccessContexts(this) as unknown as AccessScopedSqlExecutor);
  }
  async withoutSession<Result>(operation: (sql: AccessScopedSqlExecutor) => Promise<Result>): Promise<Result> {
    return operation(withAccessContexts(this) as unknown as AccessScopedSqlExecutor);
  }
  async enterTenantScope(): Promise<void> {}
  async leaveTenantScope(): Promise<void> {}
  async enterPlatformScope(): Promise<void> {}
  async leavePlatformScope(): Promise<void> {}
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
    // بيانات الجهاز تُكتب مع الجلسة، ولولاها لعرضت قائمة الأجهزة صفوفًا بلا وصف.
    expect(sql.sessionDevice).toEqual({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
      ipAddress: "203.0.113.5",
    });
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
