"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePostgresPlatformAdmin } from "@/lib/auth/postgres-platform-admin";
import { approvePostgresPasswordReset, rejectPostgresPasswordReset } from "@/lib/auth/postgres-password-recovery";

function reviewError(message: string): never {
  redirect(`/platform-admin/password-resets?error=${encodeURIComponent(message)}`);
}

export async function approvePasswordReset(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const { sql, user } = await requirePostgresPlatformAdmin();
  let result;
  try {
    result = await approvePostgresPasswordReset(sql, requestId, user.id);
  } catch {
    reviewError("تعذر توليد كود الاستعادة؛ ربما تمت مراجعة الطلب بالفعل");
  }
  revalidatePath("/platform-admin/password-resets");
  redirect(`/platform-admin/password-resets?requestId=${encodeURIComponent(requestId)}&code=${encodeURIComponent(result.recoveryCode)}&phone=${encodeURIComponent(result.whatsappPhone)}`);
}

export async function rejectPasswordReset(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const { sql, user } = await requirePostgresPlatformAdmin();
  try {
    await rejectPostgresPasswordReset(sql, requestId, user.id);
  } catch {
    reviewError("تعذر رفض الطلب؛ ربما تمت مراجعته بالفعل");
  }
  revalidatePath("/platform-admin/password-resets");
  redirect("/platform-admin/password-resets");
}
