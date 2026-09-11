import "server-only";

import type { AccessScopedSqlExecutor, SqlExecutor } from "@/lib/database/sql-executor";
import { describeDevice, type DeviceKind } from "@/lib/auth/device-label";

/**
 * إدارة جلسات الحساب وأجهزته.
 *
 * **الحدود الأمنية:** كل كتابة هنا تحمل `user_id` في شرطها، فلا تستطيع لمس صف
 * حساب آخر حتى لو أخطأ نداء أعلى. وهذا حاجز ثانٍ فوق RLS لا بديل عنه: RLS تحمي
 * من استعلام نسي فلتره، والشرط يحمي من نداء بمعرّف غير صحيح.
 *
 * والدلالات مقصودة: السحب **إبطال** لا حذف، فيبقى أثر الجلسة للسجل والتحقيق، ولا
 * تُحذف صفوف يمكن أن تكون موضع سؤال لاحقًا.
 *
 * المرجع: `P02-08` في docs/MASTER_EXECUTION_PLAN.md، و[`RBAC_MATRIX.md`](../../../docs/RBAC_MATRIX.md) §5.
 */

export type AccountSession = {
  id: string;
  deviceKind: DeviceKind;
  deviceLabel: string;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type SessionRow = {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  token_digest: string;
};

/**
 * جلسات المستخدم النشطة، الأحدث نشاطًا أولًا.
 *
 * الجلسة الحالية تُعلَّم بـ`isCurrent` بدل استبعادها، لأن المستخدم يحتاج أن يعرف
 * أي جهاز هو الذي يقرأ منه الآن قبل أن يسحب البقية.
 */
export async function listAccountSessions(
  sql: AccessScopedSqlExecutor,
  { userId, currentDigest }: { userId: string; currentDigest: string | null },
): Promise<AccountSession[]> {
  const result = await sql.query<SessionRow>(
    `select id, user_agent, host(ip_address) as ip_address,
            created_at::text as created_at, last_seen_at::text as last_seen_at,
            expires_at::text as expires_at, token_digest
     from public.auth_sessions
     where user_id = $1 and revoked_at is null and expires_at > now()
     order by last_seen_at desc`,
    [userId],
  );

  return result.rows.map((row) => {
    const device = describeDevice(row.user_agent);
    return {
      id: row.id,
      deviceKind: device.kind,
      deviceLabel: device.label,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
      isCurrent: currentDigest !== null && row.token_digest === currentDigest,
    };
  });
}

/**
 * يسحب جلسة واحدة للمستخدم.
 *
 * يعيد `false` بدل الرمي إن لم يطابق شيء، لأن «الصف ليس لك» و«الصف غير موجود»
 * نتيجتان متماثلتان من منظور المستخدم، ولا يصح أن تُكشف إحداهما للأخرى.
 */
export async function revokeAccountSession(
  sql: AccessScopedSqlExecutor,
  { userId, sessionId }: { userId: string; sessionId: string },
): Promise<boolean> {
  const result = await sql.query(
    `update public.auth_sessions
     set revoked_at = now(), last_seen_at = now()
     where id = $1 and user_id = $2 and revoked_at is null`,
    [sessionId, userId],
  );
  return result.rowCount === 1;
}

/**
 * يسحب كل الجلسات عدا الحالية — «اخرج من الأجهزة الأخرى».
 *
 * استثناء الجلسة الحالية مقصود: بدونه يخرج المستخدم من الجهاز الذي يضغط فيه الزر،
 * فيبدو الإجراء كفشل. ومن يريد الخروج من كل شيء يستخدم تسجيل الخروج.
 */
export async function revokeOtherAccountSessions(
  sql: AccessScopedSqlExecutor,
  { userId, currentDigest }: { userId: string; currentDigest: string | null },
): Promise<number> {
  const result = await sql.query(
    `update public.auth_sessions
     set revoked_at = now(), last_seen_at = now()
     where user_id = $1
       and revoked_at is null
       and ($2::text is null or token_digest <> $2)`,
    [userId, currentDigest],
  );
  return result.rowCount;
}

/**
 * يسحب كل جلسات المستخدم بلا استثناء.
 *
 * القاعدة الواحدة التي تُطبَّق بعد تغيير كلمة المرور أو تعطيل الحساب أو بأمر
 * إداري، فتُستدعى من `postgres-password-recovery.ts` بدل تكرار جملة التحديث هناك.
 * والنوع `SqlExecutor` لا `AccessScopedSqlExecutor` لأن العملية لا توسّع نطاقًا:
 * تمر بسياق مُهيَّأ مسبقًا (هوية أو إثبات استعادة).
 */
export async function revokeAllAccountSessions(
  sql: SqlExecutor,
  { userId }: { userId: string },
): Promise<number> {
  const result = await sql.query(
    `update public.auth_sessions
     set revoked_at = now(), last_seen_at = now()
     where user_id = $1 and revoked_at is null`,
    [userId],
  );
  return result.rowCount;
}
