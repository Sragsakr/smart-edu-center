"use server";

import { redirect } from "next/navigation";

import { requestPostgresPasswordReset } from "@/lib/auth/postgres-password-recovery";
import { firstValidationMessage, passwordResetRequestSchema } from "@/lib/auth/validation";
import { applicationSql } from "@/lib/database/application-sql";

export async function requestPasswordReset(formData: FormData) {
  const parsedRequest = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsedRequest.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(firstValidationMessage(parsedRequest.error))}`);
  }
  await requestPostgresPasswordReset(applicationSql(), parsedRequest.data.email);
  redirect(`/forgot-password?message=${encodeURIComponent("تم استلام الطلب إن كان الحساب مؤهلًا للاستعادة. ستراجعه الإدارة وتتواصل عبر رقم واتساب المسجل")}`);
}
