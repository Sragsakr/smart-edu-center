"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePostgresPlatformAdmin } from "@/lib/auth/postgres-platform-admin";

export async function setTenantStatus(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "");
  const nextStatus = formData.get("nextStatus") === "suspended" ? "suspended" : "active";
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) {
    redirect(`/platform-admin/tenants?error=${encodeURIComponent("معرّف المساحة غير صالح")}`);
  }

  const { sql, user } = await requirePostgresPlatformAdmin();
  try {
    await sql.transaction(async (transaction) => {
      const result = await transaction.query(
        "update public.tenants set status = $1, updated_at = now() where id = $2 and status <> $1",
        [nextStatus, tenantId],
      );
      if (result.rowCount !== 1) throw new Error("tenant status did not change");
      await transaction.query(
        `insert into public.platform_audit_logs (actor_user_id, action, entity_type, entity_id, details)
         values ($1, 'tenant.status_changed', 'tenant', $2, $3::jsonb)`,
        [user.id, tenantId, JSON.stringify({ status: nextStatus })],
      );
    });
  } catch {
    redirect(`/platform-admin/tenants?error=${encodeURIComponent("تعذر تحديث حالة المساحة")}`);
  }
  revalidatePath("/platform-admin");
  revalidatePath("/platform-admin/tenants");
}
