import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import type {
  AccessScopedSqlExecutor,
  SqlExecutor,
  TransactionalSqlExecutor,
} from "@/lib/database/sql-executor";
import { digestSessionToken, SESSION_COOKIE } from "@/lib/auth/session-context";
import { hashPassword, verifyPassword } from "./password";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type AuthUserRow = { id: string; email: string };

/** صف نتيجة دالة الدخول — بصمة فقط، ولا تُعاد كلمة المرور الخام أبدًا. */
type LoginLookupRow = { user_id: string; email: string; password_digest: string };

type PostgresAccountAccess = {
  isPlatformAdmin: boolean;
  hasMembership: boolean;
  requestStatus: string | null;
};

function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function createPostgresSession(
  sql: SqlExecutor,
  userId: string,
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql.query(
    `insert into public.auth_sessions (user_id, token_digest, expires_at)
     values ($1, $2, $3)`,
    [userId, digestSessionToken(token), expiresAt],
  );
  await setSessionCookie(token, expiresAt);
}

export async function clearPostgresSession(sql: SqlExecutor): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await sql.query(
      `update public.auth_sessions
       set revoked_at = now(), last_seen_at = now()
       where token_digest = $1 and revoked_at is null`,
      [digestSessionToken(token)],
    );
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * صف المستخدم الموثق داخل معاملة تحمل بصمة جلسة صالحة.
 *
 * لا تقرأ الجلسة من الكوكي بنفسها: من فتح السياق هو من يعرف البصمة، وقاعدة
 * البيانات تشتق الهوية منها عبر دالة `security definer`. لذلك تقرأ هذه الدالة
 * صف المستخدم من السياسة وحدها ولا تحتاج أي قراءة خارج RLS.
 */
export async function getPostgresCurrentUser(
  sql: AccessScopedSqlExecutor,
): Promise<AuthUserRow | null> {
  const result = await sql.query<AuthUserRow>(
    `select id, email::text as email
     from public.app_users
     where id = private.current_app_user_id()
     limit 1`,
  );
  return result.rows[0] ?? null;
}

/**
 * إنشاء حساب جديد.
 *
 * يعمل بلا جلسة بطبيعته (لا هوية بعد)، والسياسة تسمح بالإضافة فقط حين لا توجد
 * جلسة صالحة — فلا يستطيع حساب موثّق إنشاء حسابات أخرى من هذا المسار.
 *
 * **بلا `RETURNING` عمدًا.** صف `app_users` محمي بسياسة قراءة تشترط هوية
 * (`current_app_user_id` أو جلسة صالحة أو نطاق منصة)، وهذه اللحظة تسبق وجود أي
 * منها. و`INSERT ... RETURNING` يحتاج قراءة الصف العائد، فتفشل العملية كلها برسالة
 * مضلّلة عن RLS رغم أن الإضافة نفسها مسموحة. لذلك يُولَّد المعرّف في التطبيق
 * ويُعاد مباشرة — بلا توسيع أي سياسة ولا كشف أي صف.
 */
export async function registerPostgresUser(
  sql: TransactionalSqlExecutor,
  email: string,
  password: string,
): Promise<AuthUserRow> {
  const passwordDigest = await hashPassword(password);
  const userId = randomUUID();
  return sql.withoutSession(async (transaction) => {
    await transaction.query(`insert into public.app_users (id, email) values ($1, $2)`, [userId, email]);
    await transaction.query(
      `insert into public.auth_password_credentials (user_id, password_digest)
       values ($1, $2)`,
      [userId, passwordDigest],
    );
    return { id: userId, email };
  });
}

/**
 * إتمام الدخول.
 *
 * يمر عبر `private.login_lookup` المحدودة (`security definer`) لأن هذه اللحظة
 * تسبق وجود أي هوية، ولا يمكن لسياسة عادية أن تسمح بمطابقة بريد بكلمة مرور.
 * الدالة تُرجع صفًا مطابقًا واحدًا كحد أقصى، ولا تكشف غيره.
 */
export async function authenticatePostgresUser(
  sql: TransactionalSqlExecutor,
  email: string,
  password: string,
): Promise<AuthUserRow | null> {
  return sql.withoutSession(async (scoped) => {
    const result = await scoped.query<LoginLookupRow>(
      `select user_id, email::text as email, password_digest from private.login_lookup($1::citext)`,
      [email],
    );
    const row = result.rows[0];
    if (!row || !(await verifyPassword(password, row.password_digest))) return null;
    return { id: row.user_id, email: row.email };
  });
}

/**
 * ملخص صلاحيات الحساب — يُقرأ داخل سياق يحمل الهوية.
 *
 * الاستعلامات متسلسلة لا متوازية: كلها على اتصال واحد داخل نفس المعاملة، وهذا
 * ما يجعلها خاضعة للسياسات وتقرأ من لحظة واحدة.
 */
export async function getPostgresAccountAccess(
  sql: AccessScopedSqlExecutor,
  userId: string,
): Promise<PostgresAccountAccess> {
  const admin = await sql.query(`select 1 from public.platform_admins where user_id = $1 limit 1`, [userId]);
  const membership = await sql.query(
    `select 1 from public.memberships where user_id = $1 and active = true limit 1`,
    [userId],
  );
  const request = await sql.query<{ status: string }>(
    `select status::text as status from public.workspace_requests where user_id = $1 limit 1`,
    [userId],
  );
  return {
    isPlatformAdmin: admin.rows.length > 0,
    hasMembership: membership.rows.length > 0,
    requestStatus: request.rows[0]?.status ?? null,
  };
}
