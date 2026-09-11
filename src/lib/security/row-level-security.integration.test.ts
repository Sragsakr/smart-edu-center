import { afterEach, describe, expect, it } from "vitest";
import { Client } from "pg";

import { appRoleUrl, TEST_APP_ROLE_PASSWORD } from "../../../postgres/scripts/reset-test-database.mjs";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { addMembership, createBranch, createTenantWithOwner, createUser } from "@/test/postgres/fixtures";

/**
 * إلزام RLS فعليًا.
 *
 * هذه الاختبارات تتصل بدور التطبيق `saboraty_app` (بلا superuser وبلا bypassrls)،
 * لا بدور المالك. السبب مباشر: `FORCE ROW LEVEL SECURITY` لا يُلزم الـsuperuser،
 * فلو اختبرنا بدور المالك لاختبرنا شيئًا غير الذي يعمل به التطبيق ومرّرنا حماية صورية.
 *
 * المرجع: docs/adr/0007.
 */

const ownerSql = testSqlExecutor();

function appConnectionUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is required for the RLS enforcement tests");
  return appRoleUrl(url).url;
}

/** يفتح اتصالًا بدور التطبيق وينفّذ عملية داخل سياق وصول محدَّد. */
async function asAppRole<Result>(
  context: { userId?: string; tenantId?: string; platform?: boolean },
  operation: (client: Client) => Promise<Result>,
): Promise<Result> {
  const client = new Client({ connectionString: appConnectionUrl() });
  await client.connect();
  try {
    await client.query("begin");
    if (context.userId) await client.query("select set_config('app.app_user_id', $1, true)", [context.userId]);
    if (context.tenantId) {
      await client.query("select set_config('app.current_tenant_id', $1, true)", [context.tenantId]);
    }
    if (context.platform) await client.query("select set_config('app.platform_scope', 'on', true)");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function countAs(
  table: string,
  context: { userId?: string; tenantId?: string; platform?: boolean },
): Promise<number> {
  const result = await asAppRole(context, (client) =>
    client.query(`select count(*)::int as count from public.${table}`),
  );
  return result.rows[0].count;
}

afterEach(async () => {
  await truncateAllTenantData();
});

describe("RLS is enforced for the runtime role", () => {
  it("cannot read any tenant row without an access context", async () => {
    await createTenantWithOwner(ownerSql, { tenantName: "Isolation A" });
    await createTenantWithOwner(ownerSql, { tenantName: "Isolation B" });

    expect(await countAs("tenants", {})).toBe(0);
    expect(await countAs("branches", {})).toBe(0);
    expect(await countAs("memberships", {})).toBe(0);
  });

  it("reads only the active tenant, never a sibling tenant", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Scoped A" });
    const b = await createTenantWithOwner(ownerSql, { tenantName: "Scoped B" });
    await createBranch(ownerSql, a.tenant.id, "A Branch");
    await createBranch(ownerSql, b.tenant.id, "B Branch");

    expect(await countAs("tenants", { tenantId: a.tenant.id })).toBe(1);
    expect(await countAs("branches", { tenantId: a.tenant.id })).toBe(1);

    const visible = await asAppRole({ tenantId: a.tenant.id }, (client) =>
      client.query<{ name: string }>("select name from public.branches"),
    );
    expect(visible.rows.map((row) => row.name)).toEqual(["A Branch"]);
  });

  it("rejects an insert that targets another tenant", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Write A" });
    const b = await createTenantWithOwner(ownerSql, { tenantName: "Write B" });

    await expect(
      asAppRole({ tenantId: a.tenant.id }, (client) =>
        client.query("insert into public.branches (tenant_id, name) values ($1, 'Injected')", [b.tenant.id]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("rejects an update that would move a row into another tenant", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Update A" });
    const b = await createTenantWithOwner(ownerSql, { tenantName: "Update B" });
    const branch = await createBranch(ownerSql, a.tenant.id, "Movable");

    await expect(
      asAppRole({ tenantId: a.tenant.id }, (client) =>
        client.query("update public.branches set tenant_id = $1 where id = $2", [b.tenant.id, branch.id]),
      ),
    ).rejects.toThrow();
  });

  it("cannot delete rows of another tenant", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Delete A" });
    const b = await createTenantWithOwner(ownerSql, { tenantName: "Delete B" });
    await createBranch(ownerSql, b.tenant.id, "Protected");

    const deleted = await asAppRole({ tenantId: a.tenant.id }, (client) =>
      client.query("delete from public.branches"),
    );
    expect(deleted.rowCount).toBe(0);

    expect(await countAs("branches", { platform: true })).toBe(1);
  });

  it("reads only the signed-in user's own row in app_users", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Users A" });
    await createTenantWithOwner(ownerSql, { tenantName: "Users B" });

    expect(await countAs("app_users", { userId: a.owner.id })).toBe(1);
    expect(await countAs("app_users", {})).toBe(0);
  });

  it("lets a member read their own membership before the tenant is known", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Bootstrap A" });
    await createTenantWithOwner(ownerSql, { tenantName: "Bootstrap B" });

    const memberships = await asAppRole({ userId: a.owner.id }, (client) =>
      client.query<{ tenant_id: string }>("select tenant_id from public.memberships"),
    );
    expect(memberships.rows).toEqual([{ tenant_id: a.tenant.id }]);
  });

  it("lets colleagues in one workspace read each other's basic identity", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Colleagues" });
    const colleague = await createUser(ownerSql);
    await addMembership(ownerSql, a.tenant.id, colleague.id, "accountant");

    const visible = await asAppRole({ userId: a.owner.id, tenantId: a.tenant.id }, (client) =>
      client.query<{ email: string }>("select email::text as email from public.app_users order by email"),
    );
    const emails = visible.rows.map((row) => row.email);
    expect(emails).toContain(a.owner.email);
    expect(emails).toContain(colleague.email);
  });

  it("does not expose a user who shares no workspace", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Sep A" });
    const b = await createTenantWithOwner(ownerSql, { tenantName: "Sep B" });

    const visible = await asAppRole({ userId: a.owner.id, tenantId: a.tenant.id }, (client) =>
      client.query<{ email: string }>("select email::text as email from public.app_users"),
    );
    expect(visible.rows.map((row) => row.email)).not.toContain(b.owner.email);
  });

  it("stops exposing a colleague once their membership is deactivated", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Removed Colleague" });
    const colleague = await createUser(ownerSql);
    await addMembership(ownerSql, a.tenant.id, colleague.id, "teacher", false);

    const visible = await asAppRole({ userId: a.owner.id, tenantId: a.tenant.id }, (client) =>
      client.query<{ email: string }>("select email::text as email from public.app_users"),
    );
    expect(visible.rows.map((row) => row.email)).not.toContain(colleague.email);
  });

  it("lets a member read the tenant row of a workspace they actively belong to", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Named A" });
    await createTenantWithOwner(ownerSql, { tenantName: "Named B" });

    const visible = await asAppRole({ userId: a.owner.id }, (client) =>
      client.query<{ name: string }>("select name from public.tenants"),
    );
    expect(visible.rows.map((row) => row.name)).toEqual(["Named A"]);
  });

  it("does not let a member read a tenant they do not belong to, even with the tenant id known", async () => {
    await createTenantWithOwner(ownerSql, { tenantName: "Known A" });
    const b = await createTenantWithOwner(ownerSql, { tenantName: "Known B" });
    const outsider = await createTenantWithOwner(ownerSql, { tenantName: "Outsider" });

    const visible = await asAppRole({ userId: outsider.owner.id, tenantId: outsider.tenant.id }, (client) =>
      client.query<{ name: string }>("select name from public.tenants"),
    );
    expect(visible.rows.map((row) => row.name)).toEqual(["Outsider"]);
    expect(visible.rows.map((row) => row.name)).not.toContain(b.tenant.name);
  });

  it("stops exposing a workspace name once the membership is deactivated", async () => {
    const a = await createTenantWithOwner(ownerSql, { tenantName: "Revoked Member" });
    await ownerSql.query("update public.memberships set active = false where tenant_id = $1 and user_id = $2", [
      a.tenant.id,
      a.owner.id,
    ]);

    expect(await countAs("tenants", { userId: a.owner.id })).toBe(0);
  });

  it("grants every tenant to platform scope", async () => {
    await createTenantWithOwner(ownerSql, { tenantName: "Platform A" });
    await createTenantWithOwner(ownerSql, { tenantName: "Platform B" });

    expect(await countAs("tenants", { platform: true })).toBe(2);
    expect(await countAs("branches", { platform: true })).toBe(0);
  });

  it("does not leak the platform scope into a later transaction on the same connection", async () => {
    await createTenantWithOwner(ownerSql, { tenantName: "Leak Check" });

    const client = new Client({ connectionString: appConnectionUrl() });
    await client.connect();
    try {
      // معاملة بنطاق منصة ثم انتهاء
      await client.query("begin");
      await client.query("select set_config('app.platform_scope', 'on', true)");
      const inside = await client.query<{ count: number }>("select count(*)::int as count from public.tenants");
      await client.query("commit");
      expect(inside.rows[0].count).toBe(1);

      // نفس الاتصال، بلا سياق: يجب أن يُصفَّر الإعداد المحلي تلقائيًا
      const after = await client.query<{ count: number }>("select count(*)::int as count from public.tenants");
      expect(after.rows[0].count).toBe(0);
    } finally {
      await client.end();
    }
  });

  it("exposes the capability catalog to any identity because it holds no business data", async () => {
    expect(await countAs("capability_catalog", {})).toBeGreaterThan(0);
  });

  it("cannot modify the capability catalog outside platform scope", async () => {
    await expect(
      asAppRole({}, (client) =>
        client.query(
          `insert into public.capability_catalog (key, kind, included_from_level, title_ar, description_ar, sort_order)
           values ('evil.key', 'addon', null, 'x', 'y', 1)`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("keeps the runtime role free of superuser and bypassrls privileges", async () => {
    const result = await asAppRole({}, (client) =>
      client.query<{ role_name: string; rolsuper: boolean; rolbypassrls: boolean }>(
        `select current_user as role_name, rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
      ),
    );
    const role = result.rows[0];
    expect(role.role_name).toBe("saboraty_app");
    expect(role.rolsuper).toBe(false);
    expect(role.rolbypassrls).toBe(false);
    expect(TEST_APP_ROLE_PASSWORD.length).toBeGreaterThan(0);
  });
});
