import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetCookieState } from "@/test/postgres/test-cookies";
import { testSqlExecutor, truncateAllTenantData } from "@/test/postgres/test-database";
import { addMembership, createTenantWithOwner, createUser, grantEntitlements } from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import {
  OwnershipError,
  canDeactivateMembership,
  listTenantMembers,
  transferTenantOwnership,
} from "@/lib/auth/tenant-ownership";
import { setPostgresMembershipActive } from "@/lib/auth/postgres-team";
import { requireTenantCapability } from "@/lib/authorization/server";
import { activeEntitlementKeys } from "@/lib/entitlements/entitlement-service";

/**
 * نقل الملكية وحماية آخر مالك.
 *
 * المساحة بلا مالك نشط غير قابلة للإدارة من داخل التطبيق، فالحماية هنا ليست تحسينًا
 * بل شرط سلامة. تُختبر على مستويين: القيد في قاعدة البيانات، والخدمة التي تمنح
 * رسائل مفهومة.
 */

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

async function seedWorkspaceWithMembers(name: string) {
  const { tenant, owner } = await createTenantWithOwner(sql, { tenantName: name });
  await grantEntitlements(sql, tenant.id, "management_platform");
  const admin = await createUser(sql);
  await addMembership(sql, tenant.id, admin.id, "admin");
  const teacher = await createUser(sql);
  await addMembership(sql, tenant.id, teacher.id, "teacher");
  return { tenant, owner, admin, teacher };
}

describe("ownership transfer", () => {
  it("moves ownership to an active member and demotes the previous owner to admin", async () => {
    const fixture = await seedWorkspaceWithMembers("Transfer");
    await loginAs(fixture.owner.id);

    const result = await requireTenantCapability(fixture.tenant.id, "team.manage", async (context) =>
        transferTenantOwnership(context.sql, {
        tenantId: fixture.tenant.id,
        actorUserId: fixture.owner.id,
        actorRole: context.role,
        targetUserId: fixture.admin.id,
      }),
    );

    expect(result.previousOwnerUserId).toBe(fixture.owner.id);
    expect(result.newOwnerUserId).toBe(fixture.admin.id);

    const roles = await sql.query<{ user_id: string; role: string }>(
      "select user_id, role::text as role from public.memberships where tenant_id = $1 order by role",
      [fixture.tenant.id],
    );
    const byUser = new Map(roles.rows.map((row) => [row.user_id, row.role]));
    expect(byUser.get(fixture.admin.id)).toBe("owner");
    expect(byUser.get(fixture.owner.id)).toBe("admin");
  });

  it("leaves exactly one active owner after the transfer", async () => {
    const fixture = await seedWorkspaceWithMembers("One Owner");
    await loginAs(fixture.owner.id);
    await requireTenantCapability(fixture.tenant.id, "team.manage", async (context) =>
        transferTenantOwnership(context.sql, {
        tenantId: fixture.tenant.id,
        actorUserId: fixture.owner.id,
        actorRole: context.role,
        targetUserId: fixture.teacher.id,
      }),
    );

    const owners = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.memberships where tenant_id = $1 and role = 'owner' and active = true",
      [fixture.tenant.id],
    );
    expect(owners.rows[0]?.n).toBe(1);
  });

  it("records an audit entry naming both the previous and the new owner", async () => {
    const fixture = await seedWorkspaceWithMembers("Audit");
    await loginAs(fixture.owner.id);
    await requireTenantCapability(fixture.tenant.id, "team.manage", async (context) =>
        transferTenantOwnership(context.sql, {
        tenantId: fixture.tenant.id,
        actorUserId: fixture.owner.id,
        actorRole: context.role,
        targetUserId: fixture.admin.id,
      }),
    );

    const audit = await sql.query<{ details: { previous_owner?: string; new_owner?: string }; actor_user_id: string }>(
      "select details, actor_user_id from public.audit_logs where tenant_id = $1 and action = 'membership.ownership_transferred'",
      [fixture.tenant.id],
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0]?.details.previous_owner).toBe(fixture.owner.id);
    expect(audit.rows[0]?.details.new_owner).toBe(fixture.admin.id);
    expect(audit.rows[0]?.actor_user_id).toBe(fixture.owner.id);
  });

  it("refuses a transfer performed by a non-owner even with team.manage", async () => {
    const fixture = await seedWorkspaceWithMembers("Non Owner");
    await loginAs(fixture.admin.id);

    const error = await requireTenantCapability(fixture.tenant.id, "team.manage", (context) => {
      expect(context.role).toBe("admin");
      return transferTenantOwnership(context.sql, {
        tenantId: fixture.tenant.id,
        actorUserId: fixture.admin.id,
        actorRole: context.role,
        targetUserId: fixture.teacher.id,
      });
    }).catch((thrown) => thrown);

    expect(error).toBeInstanceOf(OwnershipError);
    expect((error as OwnershipError).reason).toBe("not_owner");
  });

  it("refuses transferring ownership to yourself", async () => {
    const fixture = await seedWorkspaceWithMembers("Self");
    await loginAs(fixture.owner.id);

    const error = await requireTenantCapability(fixture.tenant.id, "team.manage", async (context) =>
        transferTenantOwnership(context.sql, {
        tenantId: fixture.tenant.id,
        actorUserId: fixture.owner.id,
        actorRole: context.role,
        targetUserId: fixture.owner.id,
      }),
    ).catch((thrown) => thrown);

    expect((error as OwnershipError).reason).toBe("self_transfer");
  });

  it("refuses transferring ownership to an inactive member", async () => {
    const fixture = await seedWorkspaceWithMembers("Inactive Target");
    await sql.query("update public.memberships set active = false where tenant_id = $1 and user_id = $2", [
      fixture.tenant.id,
      fixture.teacher.id,
    ]);
    await loginAs(fixture.owner.id);

    const error = await requireTenantCapability(fixture.tenant.id, "team.manage", async (context) =>
        transferTenantOwnership(context.sql, {
        tenantId: fixture.tenant.id,
        actorUserId: fixture.owner.id,
        actorRole: context.role,
        targetUserId: fixture.teacher.id,
      }),
    ).catch((thrown) => thrown);

    expect((error as OwnershipError).reason).toBe("target_inactive");
  });

  it("refuses transferring ownership to a member of another workspace", async () => {
    const a = await seedWorkspaceWithMembers("Owner A");
    const b = await seedWorkspaceWithMembers("Owner B");
    await loginAs(a.owner.id);

    const error = await requireTenantCapability(a.tenant.id, "team.manage", async (context) =>
        transferTenantOwnership(context.sql, {
        tenantId: a.tenant.id,
        actorUserId: a.owner.id,
        actorRole: context.role,
        targetUserId: b.admin.id,
      }),
    ).catch((thrown) => thrown);

    expect((error as OwnershipError).reason).toBe("target_missing");
  });

  it("refuses transferring to the other owner when two owners already exist", async () => {
    const fixture = await seedWorkspaceWithMembers("Two Owners");
    await sql.query("update public.memberships set role = 'owner' where tenant_id = $1 and user_id = $2", [
      fixture.tenant.id,
      fixture.admin.id,
    ]);
    await loginAs(fixture.owner.id);

    const error = await requireTenantCapability(fixture.tenant.id, "team.manage", async (context) =>
        transferTenantOwnership(context.sql, {
        tenantId: fixture.tenant.id,
        actorUserId: fixture.owner.id,
        actorRole: context.role,
        targetUserId: fixture.admin.id,
      }),
    ).catch((thrown) => thrown);

    expect((error as OwnershipError).reason).toBe("target_already_owner");
  });
});

describe("last-owner protection in the database", () => {
  it("refuses to deactivate the only active owner even through raw SQL", async () => {
    const fixture = await seedWorkspaceWithMembers("Raw Guard");
    await expect(
      sql.query("update public.memberships set active = false where tenant_id = $1 and role = 'owner'", [
        fixture.tenant.id,
      ]),
    ).rejects.toThrow(/at least one active owner/);

    const owners = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.memberships where tenant_id = $1 and role = 'owner' and active = true",
      [fixture.tenant.id],
    );
    expect(owners.rows[0]?.n).toBe(1);
  });

  it("refuses to demote the only owner to another role", async () => {
    const fixture = await seedWorkspaceWithMembers("Demote Guard");
    await expect(
      sql.query("update public.memberships set role = 'admin' where tenant_id = $1 and user_id = $2", [
        fixture.tenant.id,
        fixture.owner.id,
      ]),
    ).rejects.toThrow(/at least one active owner/);
  });

  it("refuses to delete the only owner membership", async () => {
    const fixture = await seedWorkspaceWithMembers("Delete Guard");
    await expect(
      sql.query("delete from public.memberships where tenant_id = $1 and user_id = $2", [
        fixture.tenant.id,
        fixture.owner.id,
      ]),
    ).rejects.toThrow(/at least one active owner/);
  });

  it("allows deactivating an owner once a second owner exists", async () => {
    const fixture = await seedWorkspaceWithMembers("Second Owner");
    await sql.query("update public.memberships set role = 'owner' where tenant_id = $1 and user_id = $2", [
      fixture.tenant.id,
      fixture.admin.id,
    ]);

    await expect(
      sql.query("update public.memberships set active = false where tenant_id = $1 and user_id = $2", [
        fixture.tenant.id,
        fixture.owner.id,
      ]),
    ).resolves.toBeTruthy();

    const owners = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.memberships where tenant_id = $1 and role = 'owner' and active = true",
      [fixture.tenant.id],
    );
    expect(owners.rows[0]?.n).toBe(1);
  });

  it("does not block a tenant whose memberships are inserted before it is populated", async () => {
    // الترتيب الشائع: مساحة جديدة ثم عضوية المالك. الفحص المؤجّل يرى الحالة النهائية.
    const owner = await createUser(sql);
    const tenant = await sql.query<{ id: string }>(
      `insert into public.tenants (name, slug, tenant_type, product_level, created_by)
       values ('Late Owner', 'late-owner', 'center', 'operations', $1) returning id`,
      [owner.id],
    );
    await addMembership(sql, tenant.rows[0]!.id, owner.id, "owner");

    const owners = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.memberships where tenant_id = $1 and role = 'owner'",
      [tenant.rows[0]!.id],
    );
    expect(owners.rows[0]?.n).toBe(1);
  });

  it("still allows a whole workspace and its memberships to be removed with the tenant", async () => {
    const fixture = await seedWorkspaceWithMembers("Cascade");
    await expect(
      sql.query("delete from public.tenants where id = $1", [fixture.tenant.id]),
    ).resolves.toBeTruthy();
  });
});

describe("service-level ownership guards and messages", () => {
  it("reports that the last owner cannot be deactivated", async () => {
    const fixture = await seedWorkspaceWithMembers("Guard Last");
    const decision = await canDeactivateMembership(sql, fixture.tenant.id, fixture.owner.id);
    expect(decision).toEqual({ allowed: false, reason: "last_owner" });
  });

  it("reports that a non-owner can be deactivated", async () => {
    const fixture = await seedWorkspaceWithMembers("Guard Non Owner");
    const decision = await canDeactivateMembership(sql, fixture.tenant.id, fixture.teacher.id);
    expect(decision.allowed).toBe(true);
  });

  it("lets an owner deactivate a second owner but not the last one", async () => {
    const fixture = await seedWorkspaceWithMembers("Guard Two");
    await sql.query("update public.memberships set role = 'owner' where tenant_id = $1 and user_id = $2", [
      fixture.tenant.id,
      fixture.admin.id,
    ]);

    await loginAs(fixture.owner.id);
    await expect(
      requireTenantCapability(fixture.tenant.id, "team.manage", (context) =>
        setPostgresMembershipActive(context.sql, fixture.tenant.id, fixture.owner.id, context.role, fixture.admin.id, false),
      ),
    ).resolves.toBeUndefined();

    await expect(
      requireTenantCapability(fixture.tenant.id, "team.manage", (context) =>
        setPostgresMembershipActive(context.sql, fixture.tenant.id, fixture.owner.id, context.role, fixture.owner.id, false),
      ),
    ).rejects.toThrow();
  });

  it("explains the alternative instead of surfacing a raw constraint error", async () => {
    const fixture = await seedWorkspaceWithMembers("Message");
    const second = await createUser(sql);
    await addMembership(sql, fixture.tenant.id, second.id, "owner");
    await loginAs(fixture.owner.id);

    // مالكان: تعطيل أحدهما مسموح. وقرار «آخر مالك» يُقرأ داخل نفس السياق.
    const outcome = await requireTenantCapability(fixture.tenant.id, "team.manage", async (context) => {
      await setPostgresMembershipActive(context.sql, fixture.tenant.id, fixture.owner.id, context.role, second.id, false);
      return canDeactivateMembership(context.sql, fixture.tenant.id, fixture.owner.id);
    });
    expect(outcome).toEqual({ allowed: false, reason: "last_owner" });
  });

  it("stops a non-owner from touching an owner at all", async () => {
    const fixture = await seedWorkspaceWithMembers("Non Owner Guard");
    await expect(
      setPostgresMembershipActive(sql, fixture.tenant.id, fixture.admin.id, "admin", fixture.owner.id, false),
    ).rejects.toThrow("إلا من مالك آخر");

    const owners = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.memberships where tenant_id = $1 and role = 'owner' and active = true",
      [fixture.tenant.id],
    );
    expect(owners.rows[0]?.n).toBe(1);
  });
});

describe("member listing", () => {
  it("lists members with the owner first and never exposes another workspace's members", async () => {
    const a = await seedWorkspaceWithMembers("List A");
    const b = await seedWorkspaceWithMembers("List B");
    await loginAs(a.owner.id);

    const members = await requireTenantCapability(a.tenant.id, "team.read", (context) =>
      listTenantMembers(context.sql, a.tenant.id),
    );

    expect(members[0]?.role).toBe("owner");
    const ids = members.map((member) => member.userId);
    expect(ids).toContain(a.owner.id);
    expect(ids).toContain(a.admin.id);
    expect(ids).not.toContain(b.owner.id);
    expect(ids).not.toContain(b.admin.id);
  });

  it("keeps entitlements intact across an ownership transfer", async () => {
    const fixture = await seedWorkspaceWithMembers("Entitlements");
    await loginAs(fixture.owner.id);
    const beforeKeys = await requireTenantCapability(fixture.tenant.id, "team.manage", async (context) => {
      const keys = await activeEntitlementKeys(context.sql, fixture.tenant.id);
      await transferTenantOwnership(context.sql, {
        tenantId: fixture.tenant.id,
        actorUserId: fixture.owner.id,
        actorRole: context.role,
        targetUserId: fixture.admin.id,
      });
      return keys;
    });

    const afterKeys = await activeEntitlementKeys(sql, fixture.tenant.id);
    expect([...afterKeys].sort()).toEqual([...beforeKeys].sort());
  });
});
