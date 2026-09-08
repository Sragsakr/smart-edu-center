import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getPostgresCurrentUser } from "./postgres-auth";
import { hashPassword } from "./password";
import { capabilitiesForRole, capabilityDecision, type MemberRole, type TenantCapability } from "@/lib/authorization/policy";
import type { SqlExecutor, TransactionalSqlExecutor } from "@/lib/database/sql-executor";
import type { TeamWorkspaceData } from "@/lib/team-access";

const ASSIGNABLE_ROLES = new Set<MemberRole>(["admin", "teacher", "receptionist", "accountant"]);

export function tokenPair(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: createHash("sha256").update(raw).digest("hex") };
}

export function assertAssignableRole(role: string): asserts role is MemberRole {
  if (!ASSIGNABLE_ROLES.has(role as MemberRole)) throw new Error("اختر صلاحية صحيحة");
}

export async function requirePostgresTenantCapability(
  sql: SqlExecutor,
  tenantId: string,
  capability: TenantCapability,
): Promise<{ userId: string; role: MemberRole }> {
  if (!tenantId) throw new Error("مساحة العمل غير محددة");
  const user = await getPostgresCurrentUser(sql);
  if (!user) throw new Error("Unauthenticated");
  const result = await sql.query<{ role: MemberRole }>(
    `select role::text as role
     from public.memberships
     where tenant_id = $1 and user_id = $2 and active = true
     limit 1`,
    [tenantId, user.id],
  );
  const role = result.rows[0]?.role;
  if (!role) throw new Error("ليس لديك وصول إلى مساحة العمل المطلوبة");
  if (capabilityDecision(role, capability) !== "allow") throw new Error("ليس لديك صلاحية لتنفيذ هذه العملية");
  return { userId: user.id, role };
}

export async function getPostgresTeamWorkspaceData(
  sql: SqlExecutor,
  requestedTenantId?: string,
): Promise<TeamWorkspaceData | null> {
  const user = await getPostgresCurrentUser(sql);
  if (!user) return null;
  const memberships = await sql.query<{ tenant_id: string; role: MemberRole; tenant_name: string }>(
    `select m.tenant_id, m.role::text as role, t.name as tenant_name
     from public.memberships m
     join public.tenants t on t.id = m.tenant_id
     where m.user_id = $1 and m.active = true and t.status = 'active'
     order by m.created_at`,
    [user.id],
  );
  if (!memberships.rows.length) return null;
  const chosen = memberships.rows.find((row) => row.tenant_id === requestedTenantId) ?? memberships.rows[0];
  const workspaces = memberships.rows.map((row) => ({ tenant_id: row.tenant_id, role: row.role, tenant_name: row.tenant_name }));
  const capabilities = capabilitiesForRole(chosen.role);
  const members = (await sql.query<{ user_id: string; role: MemberRole; active: boolean; created_at: string; email: string }>(
    `select m.user_id, m.role::text as role, m.active, m.created_at::text as created_at, u.email::text as email
     from public.memberships m
     join public.app_users u on u.id = m.user_id
     where m.tenant_id = $1
     order by m.created_at`,
    [chosen.tenant_id],
  )).rows;

  let invitations: TeamWorkspaceData["invitations"] = [];
  if (capabilities["invitations.read"] === "allow") {
    await sql.query(
      `update public.invitations
       set status = 'expired', updated_at = now()
       where tenant_id = $1 and status = 'pending' and expires_at <= now()`,
      [chosen.tenant_id],
    );
    invitations = (await sql.query<TeamWorkspaceData["invitations"][number]>(
      `select id, invitee_email, role::text as role, status::text as status,
              expires_at::text as expires_at, last_sent_at::text as last_sent_at,
              created_at::text as created_at
       from public.invitations
       where tenant_id = $1
       order by created_at desc`,
      [chosen.tenant_id],
    )).rows;
  }

  return {
    currentUserId: user.id,
    tenant: { id: chosen.tenant_id, name: chosen.tenant_name },
    role: chosen.role,
    capabilities,
    workspaces,
    members,
    invitations,
  };
}

export type PostgresInvitationPreview = {
  id: string;
  tenantId: string;
  email: string;
  role: MemberRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  accountExists: boolean;
};

export async function getPostgresInvitationPreview(sql: SqlExecutor, rawToken: string): Promise<PostgresInvitationPreview | null> {
  if (!rawToken || rawToken.length < 32) return null;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const result = await sql.query<{ id: string; tenant_id: string; invitee_email: string; role: MemberRole; status: PostgresInvitationPreview["status"]; expires_at: string; account_exists: boolean }>(
    `select i.id, i.tenant_id, i.invitee_email, i.role::text as role, i.status::text as status,
            i.expires_at::text as expires_at,
            exists(select 1 from public.app_users u where lower(u.email) = lower(i.invitee_email)) as account_exists
     from public.invitations i where i.token_hash = $1 limit 1`,
    [tokenHash],
  );
  const invitation = result.rows[0];
  if (!invitation) return null;
  const expired = invitation.status === "pending" && new Date(invitation.expires_at).getTime() <= Date.now();
  return {
    id: invitation.id,
    tenantId: invitation.tenant_id,
    email: invitation.invitee_email,
    role: invitation.role,
    status: expired ? "expired" : invitation.status,
    expiresAt: invitation.expires_at,
    accountExists: invitation.account_exists,
  };
}

export async function registerAndAcceptPostgresInvitation(
  sql: TransactionalSqlExecutor,
  email: string,
  password: string,
  rawToken: string,
): Promise<{ id: string; email: string }> {
  const passwordDigest = await hashPassword(password);
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return sql.transaction(async (transaction) => {
    const userResult = await transaction.query<{ id: string; email: string }>(
      `insert into public.app_users (id, email, active)
       values (gen_random_uuid(), $1, true)
       returning id, email`,
      [email.trim().toLowerCase()],
    );
    const user = userResult.rows[0];
    if (!user) throw new Error("تعذر إنشاء الحساب من الدعوة");
    await transaction.query(
      `insert into public.auth_password_credentials (user_id, password_digest)
       values ($1, $2)`,
      [user.id, passwordDigest],
    );
    const invitationResult = await transaction.query<{ id: string; tenant_id: string; invitee_email: string; role: MemberRole; status: string; expires_at: string }>(
      `select id, tenant_id, invitee_email, role::text as role, status::text as status, expires_at
       from public.invitations where token_hash = $1 for update`,
      [tokenHash],
    );
    const invitation = invitationResult.rows[0];
    if (!invitation || invitation.status !== "pending") throw new Error("رابط الدعوة غير صالح أو تم استخدامه من قبل");
    if (new Date(invitation.expires_at).getTime() <= Date.now()) throw new Error("انتهت صلاحية الدعوة");
    if (invitation.invitee_email.toLowerCase() !== user.email.toLowerCase()) throw new Error("هذه الدعوة موجهة إلى بريد إلكتروني آخر");
    await transaction.query(
      `insert into public.memberships (tenant_id, user_id, role, active)
       values ($1, $2, $3, true)`,
      [invitation.tenant_id, user.id, invitation.role],
    );
    await transaction.query(
      `update public.invitations set status = 'accepted', accepted_by = $1, accepted_at = now(), updated_at = now() where id = $2`,
      [user.id, invitation.id],
    );
    await insertTeamAudit(transaction, invitation.tenant_id, user.id, "membership.invitation.accepted", invitation.id, { email: user.email });
    return user;
  });
}

export async function acceptPostgresInvitation(
  sql: TransactionalSqlExecutor,
  rawToken: string,
  userId: string,
  email: string,
): Promise<void> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return sql.transaction(async (transaction) => {
    const result = await transaction.query<{ id: string; tenant_id: string; invitee_email: string; role: MemberRole; status: string; expires_at: string }>(
      `select id, tenant_id, invitee_email, role::text as role, status::text as status, expires_at
       from public.invitations where token_hash = $1 for update`,
      [tokenHash],
    );
    const invitation = result.rows[0];
    if (!invitation || invitation.status !== "pending") throw new Error("رابط الدعوة غير صالح أو تم استخدامه من قبل");
    if (new Date(invitation.expires_at).getTime() <= Date.now()) throw new Error("انتهت صلاحية الدعوة");
    if (invitation.invitee_email.toLowerCase() !== email.toLowerCase()) throw new Error("هذه الدعوة موجهة إلى بريد إلكتروني آخر");
    await transaction.query(
      `insert into public.memberships (tenant_id, user_id, role, active)
       values ($1, $2, $3, true)
       on conflict (tenant_id, user_id) do update set role = excluded.role, active = true, updated_at = now()`,
      [invitation.tenant_id, userId, invitation.role],
    );
    await transaction.query(
      `update public.invitations
       set status = 'accepted', accepted_by = $1, accepted_at = now(), updated_at = now()
       where id = $2`,
      [userId, invitation.id],
    );
    await insertTeamAudit(transaction, invitation.tenant_id, userId, "membership.invitation.accepted", invitation.id, { email });
  });
}

export async function ensurePostgresInvitableEmail(sql: SqlExecutor, email: string): Promise<void> {
  const result = await sql.query<{ id: string }>(
    "select id from public.app_users where lower(email) = lower($1) limit 1",
    [email],
  );
  if (result.rows[0]) throw new Error("هذا البريد مسجل بالفعل في النظام؛ الدعوات متاحة للحسابات الجديدة فقط");
}

export async function createPostgresInvitation(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  userId: string,
  email: string,
  role: MemberRole,
  expiresAt: Date,
): Promise<{ id: string; rawToken: string }> {
  const { raw, hash } = tokenPair();
  return sql.transaction(async (transaction) => {
    const result = await transaction.query<{ id: string }>(
      `insert into public.invitations
         (tenant_id, invitee_email, role, token_hash, expires_at, created_by, last_sent_at)
       values ($1, $2, $3, $4, $5, $6, now())
       returning id`,
      [tenantId, email, role, hash, expiresAt, userId],
    );
    const invitation = result.rows[0];
    if (!invitation) throw new Error("تعذر إنشاء الدعوة");
    await insertTeamAudit(transaction, tenantId, userId, "membership.invitation.created", invitation.id, { email, role, delivery: "share-link" });
    return { id: invitation.id, rawToken: raw };
  });
}

export async function insertTeamAudit(
  sql: SqlExecutor,
  tenantId: string,
  userId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await sql.query(
    `insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, details)
     values ($1, $2, $3, 'invitation', $4, $5::jsonb)`,
    [tenantId, userId, action, entityId, JSON.stringify(details)],
  );
}

export async function updatePostgresInvitation(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  userId: string,
  invitationId: string,
  mode: "resend" | "revoke",
): Promise<{ rawToken?: string; email?: string; role?: MemberRole }> {
  return sql.transaction(async (transaction) => {
    const current = await transaction.query<{ invitee_email: string; role: MemberRole; status: string }>(
      `select invitee_email, role::text as role, status::text as status
       from public.invitations where id = $1 and tenant_id = $2 for update`,
      [invitationId, tenantId],
    );
    const invitation = current.rows[0];
    if (!invitation || invitation.status !== "pending") throw new Error("الدعوة غير قابلة للتعديل");
    if (mode === "revoke") {
      await transaction.query(
        `update public.invitations set status = 'revoked', revoked_at = now(), updated_at = now()
         where id = $1 and tenant_id = $2 and status = 'pending'`,
        [invitationId, tenantId],
      );
      await insertTeamAudit(transaction, tenantId, userId, "membership.invitation.revoked", invitationId, {});
      return {};
    }
    const { raw, hash } = tokenPair();
    await transaction.query(
      `update public.invitations
       set token_hash = $1, expires_at = now() + interval '7 days', last_sent_at = now(), updated_at = now()
       where id = $2 and tenant_id = $3 and status = 'pending'`,
      [hash, invitationId, tenantId],
    );
    await insertTeamAudit(transaction, tenantId, userId, "membership.invitation.resent", invitationId, { email: invitation.invitee_email, role: invitation.role, delivery: "share-link" });
    return { rawToken: raw, email: invitation.invitee_email, role: invitation.role };
  });
}

export async function setPostgresMembershipActive(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  actorUserId: string,
  actorRole: MemberRole,
  targetUserId: string,
  active: boolean,
): Promise<void> {
  if (targetUserId === actorUserId && !active) throw new Error("لا يمكنك تعطيل عضويتك الحالية من هنا");
  return sql.transaction(async (transaction) => {
    const result = await transaction.query<{ role: MemberRole; active: boolean }>(
      `select role::text as role, active from public.memberships
       where tenant_id = $1 and user_id = $2 for update`,
      [tenantId, targetUserId],
    );
    const target = result.rows[0];
    if (!target) throw new Error("العضوية غير موجودة");
    if (target.role === "owner") throw new Error("لا يمكن تعطيل المالك من إدارة الفريق");
    if (actorRole === "admin" && target.role === "admin") throw new Error("المشرف لا يستطيع تعديل مشرف آخر");
    if (target.active === active) throw new Error(active ? "العضوية نشطة بالفعل" : "العضوية معطلة بالفعل");
    await transaction.query("update public.memberships set active = $1, updated_at = now() where tenant_id = $2 and user_id = $3", [active, tenantId, targetUserId]);
    await insertTeamAudit(transaction, tenantId, actorUserId, active ? "membership.reactivated" : "membership.disabled", targetUserId, { restored_role: target.role });
  });
}
