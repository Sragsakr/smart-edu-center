import "server-only";

import type { MemberRole } from "@/lib/authorization/policy";
import type { AccessScopedSqlExecutor, SqlExecutor } from "@/lib/database/sql-executor";

/**
 * نقل ملكية مساحة العمل وحماية آخر مالك.
 *
 * **القاعدة الحاكمة:** مساحة بلا مالك نشط غير قابلة للاسترداد من داخل التطبيق —
 * لا يستطيع أحد إدارة الفريق أو الإعدادات، ويحتاج الأمر تدخلًا من إدارة المنصة.
 * لذلك يُحمى هذا الـinvariant على مستويين:
 *
 * 1. **قيد في قاعدة البيانات:** trigger مؤجّل يفشل عند `commit` إن لم يبقَ مالك نشط.
 * 2. **خدمة صريحة:** تمنح رسائل مفهومة وتدقيقًا، وتشرح البديل الصحيح (نقل الملكية أولًا).
 *
 * ولا يكفي أحدهما: القيد يمنع الكارثة حتى لو أخطأ استعلام مستقبلي، والخدمة تجعل
 * المسار مفهومًا بدل رسالة قيد خام.
 *
 * المرجع: `P02-07` في docs/MASTER_EXECUTION_PLAN.md، و[`RBAC_MATRIX.md`](../../../docs/RBAC_MATRIX.md) §5.
 */

export class OwnershipError extends Error {
  constructor(
    readonly reason:
      | "not_owner"
      | "target_missing"
      | "target_inactive"
      | "target_already_owner"
      | "self_transfer",
    message: string,
  ) {
    super(message);
    this.name = "OwnershipError";
  }
}

export type TenantMember = {
  userId: string;
  email: string;
  role: MemberRole;
  active: boolean;
};

/** أعضاء المساحة مرتّبين بحيث يظهر المالك أولًا — للعرض والاختيار. */
export async function listTenantMembers(sql: SqlExecutor, tenantId: string): Promise<TenantMember[]> {
  const result = await sql.query<{ user_id: string; email: string; role: MemberRole; active: boolean }>(
    `select m.user_id, u.email::text as email, m.role::text as role, m.active
     from public.memberships m
     join public.app_users u on u.id = m.user_id
     where m.tenant_id = $1
     order by (m.role = 'owner') desc, m.created_at`,
    [tenantId],
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    role: row.role,
    active: row.active,
  }));
}

/** عدد المالكين النشطين — يُقفلهم قبل أي تغيير يمسّهم. */
async function lockActiveOwners(sql: SqlExecutor, tenantId: string): Promise<string[]> {
  const result = await sql.query<{ user_id: string }>(
    `select user_id
     from public.memberships
     where tenant_id = $1 and role = 'owner' and active = true
     for update`,
    [tenantId],
  );
  return result.rows.map((row) => row.user_id);
}

/**
 * ينقل الملكية إلى عضو نشط آخر في **معاملة واحدة**.
 *
 * الترتيب مقصود: يرفع المنقول إليه أولًا ثم يخفض القائم، فلا تصبح هناك لحظة
 * تنتهي فيها المعاملة بلا مالك. والفحص المؤجّل في قاعدة البيانات يراقب الحالة
 * النهائية عند الـcommit، فيقبل هذه اللحظة الوسيطة ويرفض النهاية بلا مالك.
 */
export async function transferTenantOwnership(
  sql: AccessScopedSqlExecutor,
  {
    tenantId,
    actorUserId,
    actorRole,
    targetUserId,
  }: {
    tenantId: string;
    actorUserId: string;
    actorRole: MemberRole;
    targetUserId: string;
  },
): Promise<{ previousOwnerUserId: string; newOwnerUserId: string }> {
  if (actorRole !== "owner") {
    throw new OwnershipError("not_owner", "نقل الملكية متاح للمالك وحده");
  }
  if (actorUserId === targetUserId) {
    throw new OwnershipError("self_transfer", "لا يمكن نقل الملكية إلى نفسك");
  }

  // قفل المالكين النشطين يمنع نقلين متزامنين يتنافسان على نفس الملكية.
  await lockActiveOwners(sql, tenantId);

  const target = await sql.query<{ role: MemberRole; active: boolean }>(
    `select role::text as role, active
     from public.memberships
     where tenant_id = $1 and user_id = $2
     for update`,
    [tenantId, targetUserId],
  );
  const membership = target.rows[0];
  if (!membership) throw new OwnershipError("target_missing", "العضو المطلوب ليس ضمن هذه المساحة");
  if (!membership.active) {
    throw new OwnershipError("target_inactive", "لا يمكن نقل الملكية إلى عضو معطّل. أعد تنشيطه أولًا");
  }
  if (membership.role === "owner") {
    throw new OwnershipError("target_already_owner", "هذا العضو مالك بالفعل");
  }

  // الرفع قبل الخفض: أقل نافذة ممكنة بلا مالك داخل المعاملة.
  await sql.query(
    `update public.memberships set role = 'owner', updated_at = now()
     where tenant_id = $1 and user_id = $2`,
    [tenantId, targetUserId],
  );
  await sql.query(
    `update public.memberships set role = 'admin', updated_at = now()
     where tenant_id = $1 and user_id = $2`,
    [tenantId, actorUserId],
  );

  await sql.query(
    `insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, details)
     values ($1, $2, 'membership.ownership_transferred', 'membership', $3, $4::jsonb)`,
    [
      tenantId,
      actorUserId,
      targetUserId,
      JSON.stringify({ previous_owner: actorUserId, new_owner: targetUserId, previous_owner_new_role: "admin" }),
    ],
  );

  return { previousOwnerUserId: actorUserId, newOwnerUserId: targetUserId };
}

/**
 * هل يمكن تعطيل هذه العضوية دون ترك المساحة بلا مالك؟
 *
 * يستخدمه قرار الخدمة، والقيد في قاعدة البيانات يبقى الحاجز الأخير.
 * وتمكين تعطيل مالك **غير أخير** مقصود، لأن نقل الملكية قد يكون جزئيًا بحكم الواقع:
 * مساحة بمالكين اثنين يمكن لأحدهما مغادرتها بعد أن صار الآخر مالكًا.
 */
export async function canDeactivateMembership(
  sql: SqlExecutor,
  tenantId: string,
  targetUserId: string,
): Promise<{ allowed: boolean; reason?: "target_missing" | "last_owner" }> {
  const result = await sql.query<{ role: MemberRole; active: boolean; owner_count: number }>(
    `select m.role::text as role, m.active,
            (select count(*)::int from public.memberships o
              where o.tenant_id = m.tenant_id and o.role = 'owner' and o.active = true) as owner_count
     from public.memberships m
     where m.tenant_id = $1 and m.user_id = $2`,
    [tenantId, targetUserId],
  );
  const row = result.rows[0];
  if (!row) return { allowed: false, reason: "target_missing" };
  if (row.role === "owner" && row.owner_count <= 1) return { allowed: false, reason: "last_owner" };
  return { allowed: true };
}

/** رسالة الرفض العربية لكل سبب — تُعرض في الواجهة. */
export const ownershipErrorMessages: Record<OwnershipError["reason"], string> = {
  not_owner: "نقل الملكية متاح للمالك وحده",
  target_missing: "العضو المطلوب ليس ضمن هذه المساحة",
  target_inactive: "لا يمكن نقل الملكية إلى عضو معطّل. أعد تنشيطه أولًا",
  target_already_owner: "هذا العضو مالك بالفعل",
  self_transfer: "لا يمكن نقل الملكية إلى نفسك",
};
