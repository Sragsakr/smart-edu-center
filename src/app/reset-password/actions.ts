"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { consumePostgresPasswordReset } from "@/lib/auth/postgres-password-recovery";
import { firstValidationMessage, passwordResetRedemptionSchema } from "@/lib/auth/validation";
import { applicationSql } from "@/lib/database/application-sql";
import { buildRateLimitRules, clientAddress, consumeRateLimit, describeRetryAfter } from "@/lib/security/rate-limit";

function resetError(message: string): never {
  redirect(`/reset-password?error=${encodeURIComponent(message)}`);
}

export async function resetPasswordWithCode(formData: FormData) {
  const parsedSubmission = passwordResetRedemptionSchema.safeParse({
    email: formData.get("email"),
    recoveryCode: formData.get("recovery_code"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("password_confirmation"),
  });
  if (!parsedSubmission.success) resetError(firstValidationMessage(parsedSubmission.error));

  // أخطر مسار تخمين: كود الاستعادة قصير. الحدّ هنا قبل أي محاولة مطابقة.
  const decision = await consumeRateLimit(applicationSql(), {
    scope: "password_reset_redeem",
    rules: buildRateLimitRules({
      scope: "password_reset_redeem",
      account: parsedSubmission.data.email,
      address: clientAddress(await headers()),
    }),
  });
  if (!decision.allowed) {
    resetError(`${decision.message} (${describeRetryAfter(decision.retryAfterSeconds)})`);
  }

  const consumed = await consumePostgresPasswordReset(
    applicationSql(),
    parsedSubmission.data.email,
    parsedSubmission.data.recoveryCode,
    parsedSubmission.data.password,
  );
  if (!consumed) resetError("الكود غير صحيح أو انتهت صلاحيته. اطلب كودًا جديدًا");
  redirect(`/login?message=${encodeURIComponent("تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن")}`);
}
