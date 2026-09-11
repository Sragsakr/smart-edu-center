import { afterEach, describe, expect, it } from "vitest";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { createTenantWithOwner, createUser, makePlatformAdmin } from "@/test/postgres/fixtures";
import { PostgresPlatformAdminRepository } from "@/lib/repositories/postgres-platform-admin-repository";
import type { CurrentUserProvider, CurrentUserIdentity } from "@/lib/auth/current-user-provider";

const sql = testSqlExecutor();

function providerFor(user: CurrentUserIdentity | null): CurrentUserProvider {
  return { getCurrentUser: async () => user };
}

afterEach(async () => {
  await truncateAllTenantData();
});

describe("PostgresPlatformAdminRepository (real database)", () => {
  it("reports unauthenticated when there is no current user", async () => {
    const repo = new PostgresPlatformAdminRepository(sql, providerFor(null));
    await expect(repo.getCurrentPlatformAdminAccess()).resolves.toEqual({ status: "unauthenticated" });
  });

  it("reports forbidden for a signed-in user who is not a platform admin", async () => {
    const user = await createUser(sql);
    const repo = new PostgresPlatformAdminRepository(sql, providerFor(user));
    await expect(repo.getCurrentPlatformAdminAccess()).resolves.toEqual({ status: "forbidden" });
  });

  it("reports authorized for a platform admin", async () => {
    const user = await createUser(sql);
    await makePlatformAdmin(sql, user.id);
    const repo = new PostgresPlatformAdminRepository(sql, providerFor(user));
    await expect(repo.getCurrentPlatformAdminAccess()).resolves.toEqual({ status: "authorized", user });
  });

  it("computes overview metrics and lists tenants across all tenants (platform-wide by design)", async () => {
    const tenantA = await createTenantWithOwner(sql, { tenantName: "Tenant A" });
    const tenantB = await createTenantWithOwner(sql, { tenantName: "Tenant B" });
    const admin = await createUser(sql);
    await makePlatformAdmin(sql, admin.id);

    const repo = new PostgresPlatformAdminRepository(sql, providerFor(admin));
    const overview = await repo.getOverviewMetrics();
    expect(overview.totalTenants).toBe(2);
    expect(overview.memberships).toBe(2);

    const tenants = await repo.listTenants();
    const tenantIds = tenants.map((t) => t.id);
    expect(tenantIds).toContain(tenantA.tenant.id);
    expect(tenantIds).toContain(tenantB.tenant.id);
  });

  it("lists platform audit entries with resolved actor/tenant identity", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    const admin = await createUser(sql);
    await makePlatformAdmin(sql, admin.id);
    await sql.query(
      `insert into public.platform_audit_logs (actor_user_id, action, entity_type, entity_id, details)
       values ($1, 'tenant.status.updated', 'tenant', $2, '{}'::jsonb)`,
      [admin.id, tenant.id],
    );

    const repo = new PostgresPlatformAdminRepository(sql, providerFor(admin));
    const audit = await repo.listPlatformAudit();
    const entry = audit.find((row) => row.entity_id === tenant.id);
    expect(entry).toBeDefined();
    expect(entry?.actorEmail).toBe(admin.email);
    expect(entry?.tenant.name).toBe(tenant.name);
    expect(entry?.tenant.source).toBe("tenant");
    void owner;
  });
});
