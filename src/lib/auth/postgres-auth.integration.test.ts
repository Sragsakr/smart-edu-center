import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCookieState, setSessionCookie } from "@/test/postgres/test-cookies";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { createUser, TEST_PASSWORD } from "@/test/postgres/fixtures";
import {
  authenticatePostgresUser,
  clearPostgresSession,
  createPostgresSession,
  getPostgresCurrentUser,
} from "@/lib/auth/postgres-auth";

const sql = testSqlExecutor();

beforeEach(() => {
  resetCookieState();
});

afterEach(async () => {
  await truncateAllTenantData();
});

describe("PostgreSQL Fresh Auth (real database)", () => {
  it("authenticates with the correct password and rejects the wrong one", async () => {
    const user = await createUser(sql, { email: "auth-ok@example.test" });
    await expect(authenticatePostgresUser(sql, user.email, TEST_PASSWORD)).resolves.toEqual({ id: user.id, email: user.email });
    await expect(authenticatePostgresUser(sql, user.email, "WrongPassword.1")).resolves.toBeNull();
    await expect(authenticatePostgresUser(sql, "unknown@example.test", TEST_PASSWORD)).resolves.toBeNull();
  });

  it("rejects login for an inactive user", async () => {
    const user = await createUser(sql, { email: "inactive@example.test", active: false });
    await expect(authenticatePostgresUser(sql, user.email, TEST_PASSWORD)).resolves.toBeNull();
  });

  it("creates a session and resolves the current user from the cookie", async () => {
    const user = await createUser(sql, { email: "session-ok@example.test" });
    await createPostgresSession(sql, user.id);

    const stored = await sql.query<{ token_digest: string }>(
      "select token_digest from public.auth_sessions where user_id = $1",
      [user.id],
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0]?.token_digest).not.toContain(user.id);

    const current = await getPostgresCurrentUser(sql);
    expect(current).toEqual({ id: user.id, email: user.email });
  });

  it("returns null when there is no session cookie", async () => {
    await expect(getPostgresCurrentUser(sql)).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    const user = await createUser(sql, { email: "expired@example.test" });
    await createPostgresSession(sql, user.id);
    await sql.query(
      "update public.auth_sessions set created_at = now() - interval '2 hours', expires_at = now() - interval '1 hour' where user_id = $1",
      [user.id],
    );
    await expect(getPostgresCurrentUser(sql)).resolves.toBeNull();
  });

  it("rejects a revoked session and logout revokes the active session", async () => {
    const user = await createUser(sql, { email: "revoked@example.test" });
    await createPostgresSession(sql, user.id);
    await expect(getPostgresCurrentUser(sql)).resolves.not.toBeNull();

    await clearPostgresSession(sql);
    const revoked = await sql.query<{ revoked_at: string | null }>(
      "select revoked_at from public.auth_sessions where user_id = $1",
      [user.id],
    );
    expect(revoked.rows[0]?.revoked_at).not.toBeNull();
    await expect(getPostgresCurrentUser(sql)).resolves.toBeNull();
  });

  it("rejects a session token that does not exist", async () => {
    setSessionCookie("not-a-real-token");
    await expect(getPostgresCurrentUser(sql)).resolves.toBeNull();
  });

  it("does not resolve a session belonging to a since-deactivated user", async () => {
    const user = await createUser(sql, { email: "deactivated-after-login@example.test" });
    await createPostgresSession(sql, user.id);
    await sql.query("update public.app_users set active = false where id = $1", [user.id]);
    await expect(getPostgresCurrentUser(sql)).resolves.toBeNull();
  });

  it("issues independent tokens across repeated logins (no fixation)", async () => {
    const user = await createUser(sql, { email: "fixation@example.test" });
    await createPostgresSession(sql, user.id);
    const firstToken = (await import("@/test/postgres/test-cookies")).cookieState.token;

    resetCookieState();
    await createPostgresSession(sql, user.id);
    const secondToken = (await import("@/test/postgres/test-cookies")).cookieState.token;

    expect(firstToken).toBeDefined();
    expect(secondToken).toBeDefined();
    expect(firstToken).not.toEqual(secondToken);

    const sessions = await sql.query("select id from public.auth_sessions where user_id = $1", [user.id]);
    expect(sessions.rowCount).toBe(2);
  });
});
