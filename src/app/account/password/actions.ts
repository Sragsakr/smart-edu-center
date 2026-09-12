"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { changePostgresPassword, PasswordChangeError } from "@/lib/auth/password-change";
import { withSessionUser } from "@/lib/auth/session-context";
import {
  buildRateLimitRules,
  clearRateLimit,
  clientAddress,
  consumeRateLimit,
  describeRetryAfter,
} from "@/lib/security/rate-limit";
import { logEvent } from "@/lib/observability/server-logger";

/**
 * تغيير كلمة مرور الحساب.
 *
 * يُنفَّذ داخل سياق الجلسة: منه تُحلّ الهوية، وبه تُقرأ بصمة الكلمة الحالية عبر
 * `private.current_password_digest()` التي لا تقبل معرّفًا فلا تسأل إلا عن صاحب
 * الجلسة نفسه.
 */

function passwordError(message: string): never {
  redirect(`/account/password?error=${encodeURIComponent(message)}`);
}

export async function changePassword(formData: FormData) {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmation = String(formData.get("new_password_confirmation") ?? "");

  if (!currentPassword) passwordError("أدخل كلمة المرور الحالية");
  if (newPassword.length < 8 || newPassword.length > 72) {
    passwordError("كلمة المرور الجديدة يجب أن تكون من 8 إلى 72 حرفًا");
  }
  if (newPassword !== confirmation) passwordError("كلمتا المرور الجديدتان غير متطابقتين");

  const address = clientAddress(await headers());
  const outcome = await withSessionUser(async ({ sql, user, digest }) => {
    // الحدّ يُستهلك بعد معرفة الهوية، فيُبنى على الحساب والمصدر معًا. والمسار
    // يتحقق من كلمة المرور الحالية، فهو مسار تخمين أسرار يجب أن يُحدّ.
    const rules = buildRateLimitRules({ scope: "password_change", account: user.email, address });
    const decision = await consumeRateLimit(sql, { scope: "password_change", rules });
    if (!decision.allowed) {
      return {
        ok: false as const,
        message: `${decision.message ?? "محاولات كثيرة"} (${describeRetryAfter(decision.retryAfterSeconds)})`,
      };
    }

    try {
      const result = await changePostgresPassword(sql, {
        userId: user.id,
        currentDigest: digest,
        currentPassword,
        newPassword,
      });
      // النجاح يمحو عدّاده: من غيّر كلمته عن قصد لا يبقى محسوبًا عليه.
      await clearRateLimit(sql, { scope: "password_change", rules });
      return { ok: true as const, result };
    } catch (error) {
      if (error instanceof PasswordChangeError) return { ok: false as const, message: error.message };
      throw error;
    }
  });

  if (!outcome) passwordError("انتهت الجلسة. سجّل الدخول مرة أخرى");
  if (!outcome.ok) passwordError(outcome.message);

  // السجل يذكر العدد لا الكلمة: تدقيق التغيير بلا كشف أي سر.
  logEvent({
    level: "info",
    event: "account.password_changed",
    message: "account password changed",
    context: { revokedOtherSessions: outcome.result.revokedOtherSessions },
  });

  revalidatePath("/account/password");
  revalidatePath("/account/sessions");
  redirect(
    `/account/password?notice=${encodeURIComponent(
      outcome.result.revokedOtherSessions === 0
        ? "تم تغيير كلمة المرور"
        : `تم تغيير كلمة المرور، وسُحبت ${outcome.result.revokedOtherSessions} جلسة أخرى`,
    )}`,
  );
}
