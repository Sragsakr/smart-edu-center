import { afterEach, describe, expect, it } from "vitest";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { uniqueEmail } from "@/test/postgres/fixtures";
import { bootstrapLocalPlatformAdmin } from "@/lib/development/local-platform-admin-bootstrap";

const sql = testSqlExecutor();

const runtime = {
  nodeEnv: "development",
  databaseUrl: "postgresql://x@127.0.0.1:5432/whatever",
};

afterEach(async () => {
  await truncateAllTenantData();
});

describe("Local Platform Admin bootstrap (real database)", () => {
  it("creates app_users, auth_password_credentials, and platform_admins transactionally", async () => {
    const email = uniqueEmail("bootstrap");
    const result = await bootstrapLocalPlatformAdmin({ runtime, sql, email, password: "BootstrapPass.1" });

    const user = await sql.query<{ id: string; active: boolean }>("select id, active from public.app_users where email = $1", [email]);
    expect(user.rows[0]?.active).toBe(true);

    const credential = await sql.query<{ password_digest: string }>(
      "select password_digest from public.auth_password_credentials where user_id = $1",
      [result.userId],
    );
    expect(credential.rows[0]?.password_digest).not.toContain("BootstrapPass.1");
    expect(credential.rows[0]?.password_digest).toMatch(/^scrypt-v1\$/);

    const admin = await sql.query("select 1 from public.platform_admins where user_id = $1", [result.userId]);
    expect(admin.rowCount).toBe(1);
  });

  it("re-running bootstrap for the same email upserts instead of duplicating", async () => {
    const email = uniqueEmail("bootstrap-repeat");
    const first = await bootstrapLocalPlatformAdmin({ runtime, sql, email, password: "FirstPass.1" });
    const second = await bootstrapLocalPlatformAdmin({ runtime, sql, email, password: "SecondPass.1" });

    expect(second.userId).toBe(first.userId);

    const users = await sql.query("select id from public.app_users where email = $1", [email]);
    expect(users.rowCount).toBe(1);

    const admins = await sql.query("select 1 from public.platform_admins where user_id = $1", [first.userId]);
    expect(admins.rowCount).toBe(1);

    const credential = await sql.query<{ password_digest: string }>(
      "select password_digest from public.auth_password_credentials where user_id = $1",
      [first.userId],
    );
    expect(credential.rowCount).toBe(1);
    expect(credential.rows[0]?.password_digest).toMatch(/^scrypt-v1\$/);
  });

  it("refuses to run outside development/loopback even if called directly with a real executor", async () => {
    const prodRuntime = { nodeEnv: "production", databaseUrl: runtime.databaseUrl };
    await expect(
      bootstrapLocalPlatformAdmin({ runtime: prodRuntime, sql, email: uniqueEmail("blocked"), password: "BlockedPass.1" }),
    ).rejects.toThrow("Local platform-admin bootstrap is unavailable in this environment");

    const users = await sql.query("select 1 from public.app_users where email like 'blocked-%'");
    expect(users.rowCount).toBe(0);
  });
});
