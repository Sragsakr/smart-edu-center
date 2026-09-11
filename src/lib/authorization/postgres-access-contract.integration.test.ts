import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetCookieState } from "@/test/postgres/test-cookies";
import { testSqlExecutor, truncateAllTenantData } from "@/test/postgres/test-database";
import { addMembership, createTenantWithOwner, createUser, grantEntitlements } from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import {
  AuthorizationError,
  EntitlementError,
  requireTenantCapability,
  requireTenantCapabilityWithScope,
  tenantCapabilityReport,
} from "@/lib/authorization/server";

const sql = testSqlExecutor();

beforeEach(() => {
  resetCookieState();
});

afterEach(async () => {
  await truncateAllTenantData();
});

async function loginAs(userId: string) {
  resetCookieState();
  await createPostgresSession(sql, userId);
}

describe("server capability enforcement combines entitlement, role and scope", () => {
  it("allows an entitled owner to perform an unscoped capability", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql, { productLevel: "management_platform" });
    await grantEntitlements(sql, tenant.id, "management_platform");
    await loginAs(owner.id);

    const context = await requireTenantCapability(tenant.id, "students.read");
    expect(context.role).toBe("owner");
    expect(context.entitlements.has("ops.core")).toBe(true);
  });

  it("blocks a role that would otherwise be allowed when the workspace has no entitlement", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql, { productLevel: "operations" });
    // لا منح استحقاقات: محاكاة مساحة لم تُفعّل لها أي قدرة بعد.
    await loginAs(owner.id);

    await expect(requireTenantCapability(tenant.id, "students.read")).rejects.toBeInstanceOf(EntitlementError);
    await expect(requireTenantCapability(tenant.id, "students.read")).rejects.toThrow("غير مفعّلة");
  });

  it("reports the missing entitlement key so the UI can explain the upgrade", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql, { productLevel: "operations" });
    await loginAs(owner.id);

    const error = await requireTenantCapability(tenant.id, "payments.record").catch((thrown) => thrown);
    expect(error).toBeInstanceOf(EntitlementError);
    expect((error as EntitlementError).missingEntitlement).toBe("ops.core");
  });

  it("separates an entitlement failure from a role failure", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql, { productLevel: "management_platform" });
    await grantEntitlements(sql, tenant.id, "management_platform");

    const accountant = await createUser(sql);
    await addMembership(sql, tenant.id, accountant.id, "accountant");
    await loginAs(accountant.id);

    // المحاسب لا يملك تعليم الحضور، لكن الفشل هنا سببه الدور لا الاشتراك.
    const error = await requireTenantCapability(tenant.id, "attendance.mark").catch((thrown) => thrown);
    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error).not.toBeInstanceOf(EntitlementError);
    expect((error as Error).message).toContain("صلاحية");

    // والعكس: المالك يملك الصلاحية ولا يمنعه الاشتراك.
    await loginAs(owner.id);
    await expect(requireTenantCapability(tenant.id, "attendance.mark")).resolves.toBeTruthy();
  });

  it("refuses a scoped capability through the unscoped entry point", async () => {
    const { tenant } = await createTenantWithOwner(sql, { productLevel: "management_platform" });
    await grantEntitlements(sql, tenant.id, "management_platform");

    const teacher = await createUser(sql);
    await addMembership(sql, tenant.id, teacher.id, "teacher");
    await loginAs(teacher.id);

    await expect(requireTenantCapability(tenant.id, "students.read")).rejects.toThrow("نطاق المورد");
    await expect(requireTenantCapability(tenant.id, "attendance.mark")).rejects.toThrow("نطاق المورد");
  });

  it("allows a scoped capability only when the resource scope check passes", async () => {
    const { tenant } = await createTenantWithOwner(sql, { productLevel: "management_platform" });
    await grantEntitlements(sql, tenant.id, "management_platform");

    const teacher = await createUser(sql);
    await addMembership(sql, tenant.id, teacher.id, "teacher");
    await loginAs(teacher.id);

    await expect(
      requireTenantCapabilityWithScope(tenant.id, "attendance.mark", async () => false),
    ).rejects.toThrow("خارج نطاق صلاحيتك");

    const context = await requireTenantCapabilityWithScope(tenant.id, "attendance.mark", async () => true);
    expect(context.role).toBe("teacher");
  });

  it("still checks the entitlement before running a scope check", async () => {
    const { tenant } = await createTenantWithOwner(sql, { productLevel: "operations" });
    const teacher = await createUser(sql);
    await addMembership(sql, tenant.id, teacher.id, "teacher");
    await loginAs(teacher.id);

    let scopeCheckRan = false;
    await expect(
      requireTenantCapabilityWithScope(tenant.id, "attendance.mark", async () => {
        scopeCheckRan = true;
        return true;
      }),
    ).rejects.toBeInstanceOf(EntitlementError);
    expect(scopeCheckRan).toBe(false);
  });

  it("denies a suspended workspace even to its own owner", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql, { productLevel: "management_platform" });
    await grantEntitlements(sql, tenant.id, "management_platform");
    await sql.query("update public.tenants set status = 'suspended' where id = $1", [tenant.id]);
    await loginAs(owner.id);

    await expect(requireTenantCapability(tenant.id, "students.read")).rejects.toThrow("موقوفة");
  });

  it("denies an inactive membership without touching the entitlement layer", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql, { productLevel: "management_platform" });
    await grantEntitlements(sql, tenant.id, "management_platform");
    await sql.query("update public.memberships set active = false where tenant_id = $1 and user_id = $2", [
      tenant.id,
      owner.id,
    ]);
    await loginAs(owner.id);

    await expect(requireTenantCapability(tenant.id, "students.read")).rejects.toThrow("غير مفعّلة");
  });

  it("never lets a member of another workspace inherit this workspace entitlement", async () => {
    const entitled = await createTenantWithOwner(sql, { productLevel: "management_platform" });
    await grantEntitlements(sql, entitled.tenant.id, "management_platform");
    const closed = await createTenantWithOwner(sql, { productLevel: "operations" });
    await loginAs(closed.owner.id);

    await expect(requireTenantCapability(closed.tenant.id, "students.read")).rejects.toBeInstanceOf(EntitlementError);
    await expect(requireTenantCapability(entitled.tenant.id, "students.read")).rejects.toThrow(
      "ليس لديك وصول",
    );
  });

  it("computes a capability report from both layers for UI display only", async () => {
    const { tenant } = await createTenantWithOwner(sql, { productLevel: "management_platform" });
    await grantEntitlements(sql, tenant.id, "management_platform");

    const accountant = await createUser(sql);
    await addMembership(sql, tenant.id, accountant.id, "accountant");
    await loginAs(accountant.id);

    const report = await tenantCapabilityReport(tenant.id, ["invoices.create", "attendance.mark", "students.read"]);
    expect(report["invoices.create"]).toEqual({ allowed: true, reason: "granted" });
    expect(report["attendance.mark"]).toEqual({ allowed: false, reason: "role_denied" });
    expect(report["students.read"]?.allowed).toBe(true);
  });
});
