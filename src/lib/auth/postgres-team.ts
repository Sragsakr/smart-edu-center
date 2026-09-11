import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { hashPassword } from "./password";
import { withSessionUser } from "@/lib/auth/session-context";
import { capabilityReport } from "@/lib/authorization/access-contract";
import {
  capabilityDecision,
  tenantCapabilities,
  type MemberRole,
  type TenantCapability,
} from "@/lib/authorization/policy";
import { activeEntitlementKeys } from "@/lib/entitlements/entitlement-service";
import type {
  AccessScopedSqlExecutor,
  SqlExecutor,
  TransactionalSqlExecutor,
} from "@/lib/database/sql-executor";
import type { TeamWorkspaceData } from "@/lib/team-access";

const ASSIGNABLE_ROLES = new Set<MemberRole>(["admin", "teacher", "receptionist", "accountant"]);

export function tokenPair(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: createHash("sha256").update(raw).digest("hex") };
}

export function assertAssignableRole(role: string): asserts role is MemberRole {
  if (!ASSIGNABLE_ROLES.has(role as MemberRole)) throw new Error("اختر صلاحية صحيحة");
}

/**
 * يفرض عضوية نشطة + صلاحية الدور داخل مساحة عمل محددة.
 *
 * يفتح سياقه بنفسه: يحل الهوية من الجلسة ثم يدخل المساحة النشطة داخل نفس المعاملة،
 * لأنه لا يجوز قراءة `memberships` خارج سياق خاضع لسياسات RLS.
 */
export async function requirePostgresTenantCapability<Result>(
  tenantId: string,
  capability: TenantCapability,
  operation: (context: { sql: AccessScopedSqlExecutor; userId: string; role: MemberRole }) => Promise<Result>,
): Promise<Result> {
  if (!tenantId) throw new Error("مساحة العمل غير محددة");

  // العملية تُنفَّذ **داخل** callback الجلسة. تنفيذها بعد رجوعه يعني أن الـcommit قد
  // وقع وسياق المساحة صُفِّر، فأي قراءة لاحقة ترجع صفر صفوف — ويرفضها المُنفّذ صراحةً.
  // والغلاف يفصل «لا جلسة» عن نتيجة العملية، لأن النتيجة قد تكون فارغة بطبيعتها.
  const outcome = await withSessionUser(async ({ sql, user }) => {
    await sql.enterTenantScope(tenantId);
    const result = await sql.query<{ role: MemberRole }>(
      `select role::text as role
       from public.memberships
       where tenant_id = $1 and user_id = $2 and active = true
       limit 1`,
      [tenantId, user.id],
    );
    const role = result.rows[0]?.role;
    if (!role) throw new Error("ليس لديك وصول إلى مساحة العمل المطلوبة");
    if (capabilityDecision(role, capability) !== "allow") {
      throw new Error("ليس لديك صلاحية لتنفيذ هذه العملية");
    }
    return { value: await operation({ sql, userId: user.id, role }) };
  });
  if (!outcome) throw new Error("Unauthenticated");
  return outcome.value;
}

export async function getPostgresTeamWorkspaceData(
  requestedTenantId?: string,
): Promise<TeamWorkspaceData | null> {
  return withSessionUser(({ sql, user }) => loadTeamWorkspaceData(sql, user.id, requestedTenantId));
}

async function loadTeamWorkspaceData(
  sql: AccessScopedSqlExecutor,
  userId: string,
  requestedTenantId?: string,
): Promise<TeamWorkspaceData | null> {
  const user = { id: userId };
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

  // الدخول إلى المساحة المختارة بعد حلّ العلاقة، فتفتح سياسات RLS جداولها.
  await sql.enterTenantScope(chosen.tenant_id);

  const workspaces = memberships.rows.map((row) => ({ tenant_id: row.tenant_id, role: row.role, tenant_name: row.tenant_name }));

  // التقرير يُحسب من الطبقات الثلاث معًا: اشتراك المساحة، ثم صلاحية الدور.
  // الاعتماد على الدور وحده كان يُظهر أزرارًا لمساحة لا تملك الميزة أصلًا.
  const capabilities = capabilityReport({
    role: chosen.role,
    entitlements: await activeEntitlementKeys(sql, chosen.tenant_id),
    capabilities: tenantCapabilities,
  });
  const members = (await sql.query<{ user_id: string; role: MemberRole; active: boolean; created_at: string; email: string }>(
    `select m.user_id, m.role::text as role, m.active, m.created_at::text as created_at, u.email::text as email
     from public.memberships m
     join public.app_users u on u.id = m.user_id
     where m.tenant_id = $1
     order by m.created_at`,
    [chosen.tenant_id],
  )).rows;

  let invitations: TeamWorkspaceData["invitations"] = [];
  if (capabilities["invitations.read"]?.allowed) {
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
    currentUserId: userId,
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
  // القراءة تمر بالدالة المحدودة: سياسات `invitations` مشروطة بسياق مساحة، وصفحة
  // الدعوة تُفتح بلا أي سياق، فقراءة الجدول مباشرة ترجع صفر صفوف دائمًا.
  const result = await sql.query<{
    id: string;
    tenant_id: string;
    invitee_email: string;
    role: MemberRole;
    status: PostgresInvitationPreview["status"];
    expires_at: string;
    account_exists: boolean;
  }>(
    `select i.id, i.tenant_id, i.invitee_email::text as invitee_email, i.role::text as role,
            i.status::text as status, i.expires_at::text as expires_at, i.account_exists
     from private.invitation_by_token($1) i`,
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

/** يحلّ دعوة الموظفين من رمزها بلا سياق مساحة، بأقل أعمدة ممكنة. */
async function resolveInvitationByToken(
  sql: AccessScopedSqlExecutor,
  tokenHash: string,
): Promise<{ id: string; tenantId: string; inviteeEmail: string; role: MemberRole }> {
  const result = await sql.query<{
    id: string;
    tenant_id: string;
    invitee_email: string;
    role: MemberRole;
    status: string;
    expires_at: string;
  }>(
    `select id, tenant_id, invitee_email::text as invitee_email, role::text as role,
            status::text as status, expires_at::text as expires_at
     from private.invitation_by_token($1)`,
    [tokenHash],
  );
  const invitation = result.rows[0];
  if (!invitation) throw new Error("رابط الدعوة غير صالح");
  if (invitation.status !== "pending") throw new Error("رابط الدعوة غير صالح أو تم استخدامه من قبل");
  if (new Date(invitation.expires_at).getTime() <= Date.now()) throw new Error("انتهت صلاحية الدعوة");
  return {
    id: invitation.id,
    tenantId: invitation.tenant_id,
    inviteeEmail: invitation.invitee_email,
    role: invitation.role,
  };
}

/**
 * يقفل الدعوة بعد الدخول إلى المساحة ويُعيد التحقق من حالتها.
 *
 * `FOR UPDATE` يطبّق سياسة UPDATE المشروطة بسياق مساحة، فلا يُستخدم في خطوة
 * حل الرمز. وإعادة التحقق تمنع سباق طلبين يقبلان الرمز نفسه.
 */
async function lockInvitationInTenant(
  sql: AccessScopedSqlExecutor,
  tokenHash: string,
): Promise<{ id: string; tenantId: string; role: MemberRole }> {
  const result = await sql.query<{
    id: string;
    tenant_id: string;
    role: MemberRole;
    status: string;
    expires_at: string;
  }>(
    `select id, tenant_id, role::text as role, status::text as status, expires_at::text as expires_at
     from public.invitations where token_hash = $1 for update`,
    [tokenHash],
  );
  const invitation = result.rows[0];
  if (!invitation) throw new Error("رابط الدعوة غير صالح");
  if (invitation.status !== "pending") throw new Error("رابط الدعوة غير صالح أو تم استخدامه من قبل");
  if (new Date(invitation.expires_at).getTime() <= Date.now()) throw new Error("انتهت صلاحية الدعوة");
  return { id: invitation.id, tenantId: invitation.tenant_id, role: invitation.role };
}

/** إنشاء حساب جديد من دعوة ثم ربطه بالمساحة، في معاملة وسياق واحدين. */
export async function registerAndAcceptPostgresInvitation(
  sql: TransactionalSqlExecutor,
  email: string,
  password: string,
  rawToken: string,
): Promise<{ id: string; email: string }> {
  const passwordDigest = await hashPassword(password);
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const normalizedEmail = email.trim().toLowerCase();
  const userId = randomUUID();

  return sql.withoutSession(async (scoped) => {
    const resolved = await resolveInvitationByToken(scoped, tokenHash);
    if (resolved.inviteeEmail.trim().toLowerCase() !== normalizedEmail) {
      throw new Error("هذه الدعوة موجهة إلى بريد إلكتروني آخر");
    }

    await scoped.enterTenantScope(resolved.tenantId);
    const invitation = await lockInvitationInTenant(scoped, tokenHash);

    // بلا RETURNING: قراءة صف app_users العائد تحتاج هوية لا وجود لها بعد.
    await scoped.query(`insert into public.app_users (id, email, active) values ($1, $2, true)`, [
      userId,
      normalizedEmail,
    ]);
    await scoped.query(
      `insert into public.auth_password_credentials (user_id, password_digest) values ($1, $2)`,
      [userId, passwordDigest],
    );
    await scoped.query(
      `insert into public.memberships (tenant_id, user_id, role, active) values ($1, $2, $3, true)`,
      [invitation.tenantId, userId, invitation.role],
    );
    await scoped.query(
      `update public.invitations
       set status = 'accepted', accepted_by = $1, accepted_at = now(), updated_at = now()
       where id = $2`,
      [userId, invitation.id],
    );
    await insertTeamAudit(scoped, invitation.tenantId, userId, "membership.invitation.accepted", invitation.id, {
      email: normalizedEmail,
    });
    return { id: userId, email: normalizedEmail };
  });
}

/** يقبل حسابًا موجودًا في مساحة الدعوة، في معاملة وسياق واحدين. */
export async function acceptPostgresInvitation(
  scoped: AccessScopedSqlExecutor,
  rawToken: string,
  userId: string,
  email: string,
): Promise<void> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const resolved = await resolveInvitationByToken(scoped, tokenHash);
    if (resolved.inviteeEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error("هذه الدعوة موجهة إلى بريد إلكتروني آخر");
    }

    await scoped.enterTenantScope(resolved.tenantId);
    const invitation = await lockInvitationInTenant(scoped, tokenHash);
    await scoped.query(
      `insert into public.memberships (tenant_id, user_id, role, active)
       values ($1, $2, $3, true)
       on conflict (tenant_id, user_id) do update set role = excluded.role, active = true, updated_at = now()`,
      [invitation.tenantId, userId, invitation.role],
    );
    await scoped.query(
      `update public.invitations
       set status = 'accepted', accepted_by = $1, accepted_at = now(), updated_at = now()
       where id = $2`,
      [userId, invitation.id],
    );
  await insertTeamAudit(scoped, invitation.tenantId, userId, "membership.invitation.accepted", invitation.id, {
    email,
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
  sql: SqlExecutor,
  tenantId: string,
  userId: string,
  email: string,
  role: MemberRole,
  expiresAt: Date,
): Promise<{ id: string; rawToken: string }> {
  const { raw, hash } = tokenPair();
  return (async (transaction: SqlExecutor) => {
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
  })(sql)
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
  sql: SqlExecutor,
  tenantId: string,
  userId: string,
  invitationId: string,
  mode: "resend" | "revoke",
): Promise<{ rawToken?: string; email?: string; role?: MemberRole }> {
  return (async (transaction: SqlExecutor) => {
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
  })(sql)
}

export async function setPostgresMembershipActive(
  sql: SqlExecutor,
  tenantId: string,
  actorUserId: string,
  actorRole: MemberRole,
  targetUserId: string,
  active: boolean,
): Promise<void> {
  if (targetUserId === actorUserId && !active) throw new Error("لا يمكنك تعطيل عضويتك الحالية من هنا");
  return (async (transaction: SqlExecutor) => {
    const result = await transaction.query<{ role: MemberRole; active: boolean; owner_count: number }>(
      `select m.role::text as role, m.active,
              (select count(*)::int from public.memberships o
                where o.tenant_id = m.tenant_id and o.role = 'owner' and o.active = true) as owner_count
       from public.memberships m
       where m.tenant_id = $1 and m.user_id = $2 for update`,
      [tenantId, targetUserId],
    );
    const target = result.rows[0];
    if (!target) throw new Error("العضوية غير موجودة");
    // حماية المالك على ثلاث درجات، مرتّبة من الأعم إلى الأدق:
    // 1) غير المالك لا يمسّ المالك إطلاقًا — مطابقة للمصفوفة (إدارة المالك للمالك فقط).
    // 2) تعطيل مالك مسموح إن بقي مالك نشط آخر.
    // 3) تعطيل الأخير ممنوع: المساحة تصبح بلا مالك ولا سبيل لإدارتها، فالبديل نقل الملكية.
    // وإعادة تنشيط مالك معطّل مسموحة لأنها لا تُفقد المساحة مالكًا.
    if (target.role === "owner") {
      if (actorRole !== "owner") throw new Error("لا يمكن تعديل مالك المساحة إلا من مالك آخر");
      if (!active && target.owner_count <= 1) {
        throw new Error("لا يمكن تعطيل آخر مالك للمساحة. انقل الملكية إلى عضو آخر أولًا");
      }
    }
    if (actorRole === "admin" && target.role === "admin") throw new Error("المشرف لا يستطيع تعديل مشرف آخر");
    if (target.active === active) throw new Error(active ? "العضوية نشطة بالفعل" : "العضوية معطلة بالفعل");
    await transaction.query("update public.memberships set active = $1, updated_at = now() where tenant_id = $2 and user_id = $3", [active, tenantId, targetUserId]);
    await insertTeamAudit(transaction, tenantId, actorUserId, active ? "membership.reactivated" : "membership.disabled", targetUserId, { restored_role: target.role });
  })(sql)
}
