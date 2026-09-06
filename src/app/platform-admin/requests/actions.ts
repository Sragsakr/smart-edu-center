"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { firstValidationMessage, rejectionReasonSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

function reviewError(message: string): never {
  redirect(`/platform-admin/requests?error=${encodeURIComponent(message)}`);
}

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError) throw new Error("تعذر التحقق من صلاحية إدارة المنصة");
  if (!admin) redirect("/");
  return supabase;
}

export async function approveWorkspaceRequest(requestId: string) {
  const supabase = await requirePlatformAdmin();
  const { error } = await supabase.rpc("approve_workspace_request", { request_id: requestId });
  if (error) reviewError("تعذر قبول الطلب؛ ربما تمت مراجعته بالفعل أو أصبح الرابط مستخدمًا");
  revalidatePath("/platform-admin/requests");
}

export async function rejectWorkspaceRequest(requestId: string, formData: FormData) {
  const parsedReason = rejectionReasonSchema.safeParse(formData.get("reason"));
  if (!parsedReason.success) reviewError(firstValidationMessage(parsedReason.error));

  const supabase = await requirePlatformAdmin();
  const { error } = await supabase.rpc("reject_workspace_request", {
    request_id: requestId,
    reason: parsedReason.data,
  });
  if (error) reviewError("تعذر رفض الطلب؛ ربما تمت مراجعته بالفعل");
  revalidatePath("/platform-admin/requests");
}
