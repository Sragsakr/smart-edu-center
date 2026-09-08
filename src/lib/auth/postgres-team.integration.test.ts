import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCookieState } from "@/test/postgres/test-cookies";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { createTenantWithOwner, createUser, uniqueEmail } from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import {
  acceptPostgresInvitation,
  createPostgresInvitation,
  ensurePostgresInvitableEmail,
  getPostgresInvitationPreview,
  getPostgresTeamWorkspaceData,
  registerAndAcceptPostgresInvitation,
  requirePostgresTenantCapability,
  setPostgresMembershipActive,
  updatePostgresInvitation,
} from "@/lib/auth/postgres-team";

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

function futureDate(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe("Team & invitation flows (real database)", () => {
  it("scopes team workspace data to the owner's own tenant and never a requested foreign tenant", async () => {
    const { tenant: tenantA, owner: ownerA } = await createTenantWithOwner(sql, { tenantName: "Tenant A" });
    const { tenant: tenantB } = await createTenantWithOwner(sql, { tenantName: "Tenant B" });

    await loginAs(ownerA.id);
    const data = await getPostgresTeamWorkspaceData(sql, tenantB.id);
    expect(data?.tenant.id).toBe(tenantA.id);
    expect(data?.workspaces.map((w) => w.tenant_id)).not.toContain(tenantB.id);
  });

  it("creates invitations storing only a token digest and rejects a duplicate pending email", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    await ensurePostgresInvitableEmail(sql, uniqueEmail("brand-new"));

    const email = uniqueEmail("invitee");
    const { rawToken } = await createPostgresInvitation(sql, tenant.id, owner.id, email, "teacher", futureDate());

    const stored = await sql.query<{ token_hash: string }>("select token_hash from public.invitations where invitee_email = $1", [email]);
    expect(stored.rows[0]?.token_hash).not.toBe(rawToken);
    expect(stored.rows[0]?.token_hash).toHaveLength(64);

    await expect(createPostgresInvitation(sql, tenant.id, owner.id, email, "teacher", futureDate())).rejects.toThrow();
  });

  it("resend rotates the token and revoke prevents acceptance", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    const email = uniqueEmail("resend");
    const created = await createPostgresInvitation(sql, tenant.id, owner.id, email, "teacher", futureDate());
    const invitationRow = await sql.query<{ id: string }>("select id from public.invitations where invitee_email = $1", [email]);
    const invitationId = invitationRow.rows[0]!.id;

    const resent = await updatePostgresInvitation(sql, tenant.id, owner.id, invitationId, "resend");
    expect(resent.rawToken).toBeDefined();
    expect(resent.rawToken).not.toBe(created.rawToken);

    const oldTokenPreview = await getPostgresInvitationPreview(sql, created.rawToken);
    expect(oldTokenPreview).toBeNull();

    await updatePostgresInvitation(sql, tenant.id, owner.id, invitationId, "revoke");
    const revokedPreview = await getPostgresInvitationPreview(sql, resent.rawToken!);
    expect(revokedPreview?.status).toBe("revoked");

    await expect(
      registerAndAcceptPostgresInvitation(sql, email, "AcceptPass.1", resent.rawToken!),
    ).rejects.toThrow();
  });

  it("rejects an expired invitation and a wrong-email acceptance attempt", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    const email = uniqueEmail("expiring");
    const { rawToken } = await createPostgresInvitation(sql, tenant.id, owner.id, email, "teacher", futureDate(1));
    await sql.query(
      "update public.invitations set created_at = now() - interval '2 hours', expires_at = now() - interval '1 hour' where invitee_email = $1",
      [email],
    );

    await expect(registerAndAcceptPostgresInvitation(sql, email, "ExpiredPass.1", rawToken)).rejects.toThrow();

    const { rawToken: freshToken } = await createPostgresInvitation(sql, tenant.id, owner.id, uniqueEmail("targeted"), "teacher", futureDate());
    await expect(
      registerAndAcceptPostgresInvitation(sql, uniqueEmail("attacker"), "AttackPass.1", freshToken),
    ).rejects.toThrow("موجهة إلى بريد إلكتروني آخر");
  });

  it("does not allow replaying an already-accepted invitation token", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    const email = uniqueEmail("replay");
    const { rawToken } = await createPostgresInvitation(sql, tenant.id, owner.id, email, "teacher", futureDate());

    await registerAndAcceptPostgresInvitation(sql, email, "ReplayPass.1", rawToken);
    await expect(registerAndAcceptPostgresInvitation(sql, email, "ReplayPass.1", rawToken)).rejects.toThrow();
  });

  it("accepting an invitation transactionally creates user + credentials + membership and logs audit", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    const email = uniqueEmail("full-accept");
    const { rawToken } = await createPostgresInvitation(sql, tenant.id, owner.id, email, "teacher", futureDate());

    const user = await registerAndAcceptPostgresInvitation(sql, email, "FullAcceptPass.1", rawToken);

    const membership = await sql.query("select role::text as role from public.memberships where tenant_id = $1 and user_id = $2", [tenant.id, user.id]);
    expect(membership.rows[0]?.role).toBe("teacher");

    const credential = await sql.query("select 1 from public.auth_password_credentials where user_id = $1", [user.id]);
    expect(credential.rowCount).toBe(1);

    const audit = await sql.query("select action from public.audit_logs where entity_id = $1", [
      (await sql.query<{ id: string }>("select id from public.invitations where invitee_email = $1", [email])).rows[0]!.id,
    ]);
    expect(audit.rows.some((row) => row.action === "membership.invitation.accepted")).toBe(true);
  });

  it("an already-registered user accepting an invitation adds membership without creating a duplicate user", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    const existing = await createUser(sql);
    const { rawToken } = await createPostgresInvitation(sql, tenant.id, owner.id, existing.email, "accountant", futureDate());

    await acceptPostgresInvitation(sql, rawToken, existing.id, existing.email);

    const users = await sql.query("select 1 from public.app_users where email = $1", [existing.email]);
    expect(users.rowCount).toBe(1);
    const membership = await sql.query("select role::text as role from public.memberships where tenant_id = $1 and user_id = $2", [tenant.id, existing.id]);
    expect(membership.rows[0]?.role).toBe("accountant");
  });

  it("admin cannot disable the owner or another admin, and users cannot disable themselves", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    const adminA = await createUser(sql);
    const adminB = await createUser(sql);
    await sql.query("insert into public.memberships (tenant_id, user_id, role, active) values ($1, $2, 'admin', true)", [tenant.id, adminA.id]);
    await sql.query("insert into public.memberships (tenant_id, user_id, role, active) values ($1, $2, 'admin', true)", [tenant.id, adminB.id]);

    await expect(setPostgresMembershipActive(sql, tenant.id, adminA.id, "admin", owner.id, false)).rejects.toThrow("لا يمكن تعطيل المالك");
    await expect(setPostgresMembershipActive(sql, tenant.id, adminA.id, "admin", adminB.id, false)).rejects.toThrow("لا يستطيع تعديل مشرف آخر");
    await expect(setPostgresMembershipActive(sql, tenant.id, adminA.id, "admin", adminA.id, false)).rejects.toThrow("لا يمكنك تعطيل عضويتك");
  });

  it("owner can disable and re-enable a regular staff member and each action is audited", async () => {
    const { tenant, owner } = await createTenantWithOwner(sql);
    const teacher = await createUser(sql);
    await sql.query("insert into public.memberships (tenant_id, user_id, role, active) values ($1, $2, 'teacher', true)", [tenant.id, teacher.id]);

    await setPostgresMembershipActive(sql, tenant.id, owner.id, "owner", teacher.id, false);
    let membership = await sql.query<{ active: boolean }>("select active from public.memberships where tenant_id = $1 and user_id = $2", [tenant.id, teacher.id]);
    expect(membership.rows[0]?.active).toBe(false);

    await setPostgresMembershipActive(sql, tenant.id, owner.id, "owner", teacher.id, true);
    membership = await sql.query<{ active: boolean }>("select active from public.memberships where tenant_id = $1 and user_id = $2", [tenant.id, teacher.id]);
    expect(membership.rows[0]?.active).toBe(true);

    const audit = await sql.query<{ action: string }>("select action from public.audit_logs where tenant_id = $1 and entity_id = $2 order by created_at", [tenant.id, teacher.id]);
    expect(audit.rows.map((r) => r.action)).toEqual(["membership.disabled", "membership.reactivated"]);
  });

  it("requirePostgresTenantCapability denies access to a user without a membership in the tenant", async () => {
    const { tenant } = await createTenantWithOwner(sql);
    const outsider = await createUser(sql);
    await loginAs(outsider.id);
    await expect(requirePostgresTenantCapability(sql, tenant.id, "team.manage")).rejects.toThrow("ليس لديك وصول");
  });
});
