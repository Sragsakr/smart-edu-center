"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setTenantStatus(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "");
  const nextStatus = formData.get("nextStatus") === "suspended" ? "suspended" : "active";
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) {
    redirect(`/platform-admin/tenants?error=${encodeURIComponent("معرّف المساحة غير صالح")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_tenant_status", {
    target_tenant_id: tenantId,
    next_status: nextStatus,
  });
  if (error) {
    redirect(`/platform-admin/tenants?error=${encodeURIComponent("تعذر تحديث حالة المساحة")}`);
  }
  revalidatePath("/platform-admin");
  revalidatePath("/platform-admin/tenants");
}