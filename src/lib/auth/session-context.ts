import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { applicationSql } from "@/lib/database/application-sql";
import type { AccessScopedSqlExecutor } from "@/lib/database/sql-executor";

/**
 * فتح عمليات موثقة داخل سياق وصول يحمل سياسات RLS.
 *
 * قاعدة الاستخدام: **لا يُقرأ أي جدول محمي خارج هذه المسارات.** كل عملية منطقية
 * تُفتح مرة واحدة بـ`withSessionUser`، ثم تُنفَّذ قراءاتها كلها داخل نفس المعاملة
 * بسياق واحد.
 *
 * المرجع: docs/adr/0007.
 */

export const SESSION_COOKIE = "saboraty_session";

export function digestSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** بصمة الجلسة الحالية من الكوكي، أو `null` إن لا جلسة. */
export async function currentSessionDigest(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? digestSessionToken(token) : null;
}

export type AuthenticatedSession = {
  sql: AccessScopedSqlExecutor;
  user: { id: string; email: string };
};

/** صف المستخدم نفسه — متاح للهوية الموثقة بسياسة `app_users_own_row`. */
async function loadSessionUser(
  sql: AccessScopedSqlExecutor,
): Promise<{ id: string; email: string } | null> {
  const result = await sql.query<{ id: string; email: string }>(
    `select id, email::text as email from public.app_users where id = private.current_app_user_id() limit 1`,
  );
  return result.rows[0] ?? null;
}

async function touchLastSeen(sql: AccessScopedSqlExecutor, userId: string): Promise<void> {
  await sql.query(
    `update public.auth_sessions
     set last_seen_at = now()
     where user_id = $1 and revoked_at is null and expires_at > now()`,
    [userId],
  );
}

/**
 * يفتح عملية موثقة، أو يعيد `null` إن لم توجد جلسة صالحة.
 *
 * الهوية تُشتق داخل قاعدة البيانات من بصمة الجلسة، فلا تُمرَّر هوية كوسيط.
 */
export async function withSessionUser<Result>(
  operation: (session: AuthenticatedSession) => Promise<Result>,
): Promise<Result | null> {
  const digest = await currentSessionDigest();
  if (!digest) return null;

  const result = await applicationSql().withSession(digest, async (sql) => {
    const user = await loadSessionUser(sql);
    if (!user) return null;
    await touchLastSeen(sql, user.id);
    return operation({ sql, user });
  });
  return result;
}

/**
 * كالسابق لكن يوجّه إلى `/login` إن لم توجد جلسة.
 *
 * يُستخدم في الصفحات؛ أما Server Actions فتستخدم `withSessionUser` وتتعامل مع `null`
 * بنفسها لأن `redirect` داخل معاملة مفتوحة سلوك غير مرغوب.
 */
export async function requireSessionUser<Result>(
  operation: (session: AuthenticatedSession) => Promise<Result>,
): Promise<Result> {
  const result = await withSessionUser(operation);
  if (result === null) redirect("/login");
  return result;
}

export type PlatformScopeOutcome<Result> =
  | { status: "authorized"; value: Result }
  | { status: "unauthenticated" }
  | { status: "forbidden" };

/**
 * يفتح عملية بنطاق المنصة **بعد** التحقق من `platform_admins`.
 *
 * نطاق المنصة لا يُمنح إلا من هنا، وهذا هو المسار الوحيد الذي يسمح لـ`/platform-admin`
 * بعبور المساحات. التحقق يقرأ صف المستخدم نفسه من `platform_admins`، وهو مسموح
 * للهوية الموثقة وحدها.
 */
export async function withPlatformScope<Result>(
  operation: (session: AuthenticatedSession) => Promise<Result>,
): Promise<PlatformScopeOutcome<Result>> {
  const digest = await currentSessionDigest();
  if (!digest) return { status: "unauthenticated" };

  const outcome = await applicationSql().withSession(digest, async (sql) => {
    const user = await loadSessionUser(sql);
    if (!user) return { status: "unauthenticated" } as const;

    const admin = await sql.query(
      `select 1 from public.platform_admins where user_id = $1 limit 1`,
      [user.id],
    );
    if (admin.rowCount === 0) return { status: "forbidden" } as const;

    await touchLastSeen(sql, user.id);
    await sql.enterPlatformScope();
    return { status: "authorized", value: await operation({ sql, user }) } as const;
  });
  return outcome;
}

/**
 * يفتح عملية داخل مساحة عمل بعد حل علاقة العضو.
 *
 * الأنسب للصفحات: يحل الهوية ثم يدخل المساحة النشطة داخل نفس المعاملة.
 */
export async function withTenantSession<Result>(
  operation: (session: AuthenticatedSession & { tenantId: string; role: string }) => Promise<Result>,
): Promise<Result | null> {
  return withSessionUser(async (session) => {
    const membership = await session.sql.query<{ tenant_id: string; role: string }>(
      `select tenant_id, role::text as role
       from public.memberships
       where user_id = $1 and active = true
       order by created_at
       limit 1`,
      [session.user.id],
    );
    const row = membership.rows[0];
    if (!row) return null;
    await session.sql.enterTenantScope(row.tenant_id);
    return operation({ ...session, tenantId: row.tenant_id, role: row.role });
  });
}
