import "server-only";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeOtherAccountSessions } from "@/lib/auth/account-sessions";
import type { AccessScopedSqlExecutor } from "@/lib/database/sql-executor";

/**
 * تغيير كلمة مرور الحساب وهو مسجّل الدخول.
 *
 * **الفراغ الذي يسدّه:** لم يكن في التطبيق أي مسار لتغيير كلمة المرور مع تسجيل
 * الدخول. الموجود: إنشاء عند التسجيل، وتعيين عند قبول دعوة، واستعادة بموافقة إدارة
 * المنصة. فمن أُنشئ حسابه من إدارة المنصة لم يكن له سبيل لتعيين كلمة مروره، ومن
 * شكّ أن كلمته انكشفت لم يكن له سبيل لتغييرها إلا بطلب استعادة ينتظر مراجعة يدوية.
 *
 * **ولماذا يسحب الجلسات الأخرى:** تغيير كلمة المرور يقع عادةً بعد شكّ في انكشافها،
 * فإبقاء جلسات أخرى صالحة يُفرغ التغيير من معناه. ويسحب **البقية** لا الجلسة
 * الحالية، لأن سحبها يخرج المستخدم من الجهاز الذي غيّر فيه، فيبدو الإجراء كفشل.
 *
 * المرجع: `P02-12` في docs/MASTER_EXECUTION_PLAN.md.
 */

export class PasswordChangeError extends Error {
  constructor(
    readonly reason: "wrong_current_password" | "same_as_current",
    message: string,
  ) {
    super(message);
    this.name = "PasswordChangeError";
  }
}

/** بصمة كلمة مرور صاحب الجلسة الحالية، أو `null` إن لم تكن له كلمة مرور مخزّنة. */
async function currentPasswordDigest(sql: AccessScopedSqlExecutor): Promise<string | null> {
  const result = await sql.query<{ password_digest: string | null }>(
    "select private.current_password_digest() as password_digest",
  );
  return result.rows[0]?.password_digest ?? null;
}

/**
 * يغيّر كلمة مرور صاحب الجلسة بعد التحقق من الكلمة الحالية.
 *
 * الترتيب مقصود: التحقق أولًا، ثم الكتابة، ثم سحب الجلسات الأخرى. ولو أُبطلت الجلسات
 * قبل الكتابة لبقي المستخدم بلا جلسة وكلمة مروره القديمة لو فشلت الكتابة.
 */
export async function changePostgresPassword(
  sql: AccessScopedSqlExecutor,
  {
    userId,
    currentDigest,
    currentPassword,
    newPassword,
  }: {
    userId: string;
    currentDigest: string | null;
    currentPassword: string;
    newPassword: string;
  },
): Promise<{ revokedOtherSessions: number }> {
  const stored = await currentPasswordDigest(sql);
  if (!stored || !(await verifyPassword(currentPassword, stored))) {
    throw new PasswordChangeError("wrong_current_password", "كلمة المرور الحالية غير صحيحة");
  }

  // منع «التغيير» إلى الكلمة نفسها: لا يغيّر شيئًا ويوهم المستخدم أنه أصلح شيئًا.
  if (await verifyPassword(newPassword, stored)) {
    throw new PasswordChangeError("same_as_current", "كلمة المرور الجديدة مطابقة للحالية. اختر كلمة أخرى");
  }

  const newPasswordDigest = await hashPassword(newPassword);
  await sql.query(
    `update public.auth_password_credentials
     set password_digest = $1, password_changed_at = now()
     where user_id = $2`,
    [newPasswordDigest, userId],
  );

  // الجلسات الأخرى تسقط: تغيير كلمة المرور بعد شكّ في انكشافها لا معنى له إن بقيت
  // جلسة المسرّب صالحة.
  const revokedOtherSessions = await revokeOtherAccountSessions(sql, { userId, currentDigest });

  return { revokedOtherSessions };
}
