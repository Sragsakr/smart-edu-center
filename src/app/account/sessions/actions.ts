"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { revokeAccountSession, revokeOtherAccountSessions } from "@/lib/auth/account-sessions";
import { withSessionUser } from "@/lib/auth/session-context";

/**
 * إجراءات إدارة الأجهزة.
 *
 * كل إجراء يُنفَّذ **داخل** سياق الجلسة: منه تُشتق الهوية، وبه تمر سياسة التحديث
 * على `auth_sessions`. سحب صف بلا سياق يحدّث صفرًا، فيبدو الإجراء ناجحًا والجهاز
 * ما زال مسجّلًا.
 *
 * والنتيجة تقول ما تغيّر فعلًا: الإجراء لا يدّعي نجاحًا لم يقع، ولا يفشل بصمت.
 */

function backToSessions(notice: string): never {
  redirect(`/account/sessions?notice=${encodeURIComponent(notice)}`);
}

export async function revokeSession(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) backToSessions("لم يُحدَّد الجهاز المطلوب");

  const revoked = await withSessionUser(async ({ sql, user }) =>
    revokeAccountSession(sql, { userId: user.id, sessionId }),
  );

  revalidatePath("/account/sessions");
  backToSessions(
    revoked === null
      ? "انتهت الجلسة. سجّل الدخول مرة أخرى"
      : revoked
        ? "تم سحب الجهاز"
        : "الجهاز غير موجود أو مسحوب بالفعل",
  );
}

export async function revokeOtherSessions() {
  const count = await withSessionUser(async ({ sql, user, digest }) =>
    revokeOtherAccountSessions(sql, { userId: user.id, currentDigest: digest }),
  );

  revalidatePath("/account/sessions");
  backToSessions(
    count === null
      ? "انتهت الجلسة. سجّل الدخول مرة أخرى"
      : count === 0
        ? "لا توجد أجهزة أخرى مسجّلة"
        : `تم سحب ${count} جهازًا آخر`,
  );
}
