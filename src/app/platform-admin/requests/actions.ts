"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePostgresPlatformAdmin } from "@/lib/auth/postgres-platform-admin";
import { approvePostgresWorkspaceRequest, rejectPostgresWorkspaceRequest } from "@/lib/auth/postgres-workspace-requests";
import { firstValidationMessage, rejectionReasonSchema } from "@/lib/auth/validation";

function reviewError(message: string): never {
  redirect(`/platform-admin/requests?error=${encodeURIComponent(message)}`);
}

export async function approveWorkspaceRequest(requestId: string) {
  const { sql, user } = await requirePostgresPlatformAdmin();
  try {
    await approvePostgresWorkspaceRequest(sql, requestId, user.id);
  } catch {
    reviewError("تعذر قبول الطلب؛ ربما تمت مراجعته بالفعل أو أصبح الرابط مستخدمًا");
  }
  revalidatePath("/platform-admin/requests");
}

export async function rejectWorkspaceRequest(requestId: string, formData: FormData) {
  const parsedReason = rejectionReasonSchema.safeParse(formData.get("reason"));
  if (!parsedReason.success) reviewError(firstValidationMessage(parsedReason.error));
  const { sql, user } = await requirePostgresPlatformAdmin();
  try {
    await rejectPostgresWorkspaceRequest(sql, requestId, user.id, parsedReason.data);
  } catch {
    reviewError("تعذر رفض الطلب؛ ربما تمت مراجعته بالفعل");
  }
  revalidatePath("/platform-admin/requests");
}
