"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requestPostgresPasswordReset } from "@/lib/auth/postgres-password-recovery";
import { firstValidationMessage, passwordResetRequestSchema } from "@/lib/auth/validation";
import { applicationSql } from "@/lib/database/application-sql";
import { buildRateLimitRules, clientAddress, consumeRateLimit, describeRetryAfter } from "@/lib/security/rate-limit";

export async function requestPasswordReset(formData: FormData) {
  const parsedRequest = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsedRequest.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(firstValidationMessage(parsedRequest.error))}`);
  }
  // حدّ على الطلبات: بلا حدّ يصبح هذا المسار وسيلة إغراق لطابور مراجعة الإدارة.
  const decision = await consumeRateLimit(applicationSql(), {
    scope: "password_reset_request",
    rules: buildRateLimitRules({
      scope: "password_reset_request",
      account: parsedRequest.data.email,
      address: clientAddress(await headers()),
    }),
  });
  if (!decision.allowed) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(
        `${decision.message} (${describeRetryAfter(decision.retryAfterSeconds)})`,
      )}`,
    );
  }

  await requestPostgresPasswordReset(applicationSql(), parsedRequest.data.email);
  redirect(`/forgot-password?message=${encodeURIComponent("تم استلام الطلب إن كان الحساب مؤهلًا للاستعادة. ستراجعه الإدارة وتتواصل عبر رقم واتساب المسجل")}`);
}
