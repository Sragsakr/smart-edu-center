"use server";

import { redirect } from "next/navigation";

import { requestPostgresPasswordReset } from "@/lib/auth/postgres-password-recovery";
import { firstValidationMessage, passwordResetRequestSchema } from "@/lib/auth/validation";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";

export async function requestPasswordReset(formData: FormData) {
  const parsedRequest = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsedRequest.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(firstValidationMessage(parsedRequest.error))}`);
  }
  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) redirect("/forgot-password?error=تعذر إعداد الاستعادة");
  await requestPostgresPasswordReset(postgresSqlExecutor(config.databaseUrl), parsedRequest.data.email);
  redirect(`/forgot-password?message=${encodeURIComponent("تم استلام الطلب إن كان الحساب مؤهلًا للاستعادة. ستراجعه الإدارة وتتواصل عبر رقم واتساب المسجل")}`);
}
