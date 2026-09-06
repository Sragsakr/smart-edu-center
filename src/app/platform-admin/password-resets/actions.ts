"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function reviewError(message: string): never {
  redirect(`/platform-admin/password-resets?error=${encodeURIComponent(message)}`);
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

export async function approvePasswordReset(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const supabase = await requirePlatformAdmin();
  const { data, error } = await supabase.rpc("approve_password_reset", {
    reset_request_id: requestId,
  });
  if (error || !data || data.length === 0) {
    reviewError("تعذر توليد كود الاستعادة؛ ربما تمت مراجعة الطلب بالفعل");
  }
  revalidatePath("/platform-admin/password-resets");
  redirect(
    `/platform-admin/password-resets?requestId=${encodeURIComponent(requestId)}&code=${encodeURIComponent(data[0].recovery_code)}&phone=${encodeURIComponent(data[0].whatsapp_phone)}`,
  );
}

export async function rejectPasswordReset(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const supabase = await requirePlatformAdmin();
  const { error } = await supabase.rpc("reject_password_reset", {
    reset_request_id: requestId,
  });
  if (error) reviewError("تعذر رفض الطلب؛ ربما تمت مراجعته بالفعل");
  revalidatePath("/platform-admin/password-resets");
  redirect("/platform-admin/password-resets");
}