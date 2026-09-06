"use server";

import { redirect } from "next/navigation";
import { firstValidationMessage, passwordResetRedemptionSchema } from "@/lib/auth/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  const adminClient = createAdminClient();
  const supabase = await createClient();
  const { data: userId, error: codeError } = await supabase.rpc("consume_password_reset_code", {
    email_input: parsedSubmission.data.email,
    recovery_code: parsedSubmission.data.recoveryCode,
  });
  if (codeError || !userId) resetError("الكود غير صحيح أو انتهت صلاحيته. اطلب كودًا جديدًا");

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: parsedSubmission.data.password,
  });
  if (updateError) resetError("تعذر تغيير كلمة المرور بعد استهلاك الكود. أرسل طلب استعادة جديدًا");

  redirect(`/login?message=${encodeURIComponent("تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن")}`);
}
