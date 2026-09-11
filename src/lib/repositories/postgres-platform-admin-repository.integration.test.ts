import { afterEach, describe, expect, it } from "vitest";
import { resetCookieState } from "@/test/postgres/test-cookies";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { createTenantWithOwner, createUser, makePlatformAdmin } from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import { PostgresPlatformAdminRepository } from "@/lib/repositories/postgres-platform-admin-repository";
import { PostgresCurrentUserProvider } from "@/lib/auth/postgres-current-user-provider";

const sql = testSqlExecutor();

/**
 * الهوية تُشتق من الجلسة لا من حقن يدوي، لأن نطاق المنصة يُفتح من مسار
 * `withPlatformScope` الذي يقرأ الكوكي. هذا يختبر المسار الحقيقي لا محاكاة له.
 */
async function loginAs(userId: string | null) {
  resetCookieState();
  if (userId) await createPostgresSession(sql, userId);
}

function repository() {
  return new PostgresPlatformAdminRepository(sql, new PostgresCurrentUserProvider());
}

afterEach(async () => {
  await truncateAllTenantData();
  resetCookieState();
});

describe("PostgresPlatformAdminRepository (real database)", () => {
  it("reports unauthenticated when there is no current user", async () => {
    await loginAs(null);
    await expect(repository().getCurrentPlatformAdminAccess()).resolves.toEqual({ status: "unauthenticated" });
  });

  it("reports forbidden for a signed-in user who is not a platform admin", async () => {
    const user = await createUser(sql);
    await loginAs(user.id);
    const repo = repository();
    await expect(repo.getCurrentPlatformAdminAccess()).resolves.toEqual({ status: "forbidden" });
  });

  it("reports authorized for a platform admin", async () => {
    const user = await createUser(sql);
    await makePlatformAdmin(sql, user.id);
    await loginAs(user.id);
    const repo = repository();
    await expect(repo.getCurrentPlatformAdminAccess()).resolves.toEqual({ status: "authorized", user });
  });

  it("computes overview metrics and lists tenants across all tenants (platform-wide by design)", async () => {
    const tenantA = await createTenantWithOwner(sql, { tenantName: "Tenant A" });
    const tenantB = await createTenantWithOwner(sql, { tenantName: "Tenant B" });
    const admin = await createUser(sql);
    await makePlatformAdmin(sql, admin.id);

    await loginAs(admin.id);
    const repo = repository();
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

    await loginAs(admin.id);
    const repo = repository();
    const audit = await repo.listPlatformAudit();
    const entry = audit.find((row) => row.entity_id === tenant.id);
    expect(entry).toBeDefined();
    expect(entry?.actorEmail).toBe(admin.email);
    expect(entry?.tenant.name).toBe(tenant.name);
    expect(entry?.tenant.source).toBe("tenant");
    void owner;
  });
});
