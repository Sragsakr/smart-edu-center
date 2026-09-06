"use server";

import { redirect } from "next/navigation";
import { firstValidationMessage, passwordResetRequestSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const parsedRequest = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsedRequest.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(firstValidationMessage(parsedRequest.error))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_password_reset", {
    email_input: parsedRequest.data.email,
  });
  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent("تعذر إرسال الطلب حاليًا. حاول لاحقًا")}`);
  }

  redirect(
    `/forgot-password?message=${encodeURIComponent("تم استلام الطلب إن كان الحساب مؤهلًا للاستعادة. ستراجعه الإدارة وتتواصل عبر رقم واتساب المسجل")}`,
  );
}
