"use server";

import { redirect } from "next/navigation";

import { consumePostgresPasswordReset } from "@/lib/auth/postgres-password-recovery";
import { firstValidationMessage, passwordResetRedemptionSchema } from "@/lib/auth/validation";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";

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

  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) resetError("تعذر إعداد الاستعادة");
  const consumed = await consumePostgresPasswordReset(
    postgresSqlExecutor(config.databaseUrl),
    parsedSubmission.data.email,
    parsedSubmission.data.recoveryCode,
    parsedSubmission.data.password,
  );
  if (!consumed) resetError("الكود غير صحيح أو انتهت صلاحيته. اطلب كودًا جديدًا");
  redirect(`/login?message=${encodeURIComponent("تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن")}`);
}
