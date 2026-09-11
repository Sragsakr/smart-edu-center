"use server";

import { redirect } from "next/navigation";

import { clearPostgresSession } from "@/lib/auth/postgres-auth";
import { withSessionUser } from "@/lib/auth/session-context";
import { firstValidationMessage, workspaceRequestSchema } from "@/lib/auth/validation";
import { applicationSql } from "@/lib/database/application-sql";

type ParsedWorkspaceRequest = ReturnType<typeof workspaceRequestSchema.parse>;

function onboardingError(message: string): never {
  redirect(`/onboarding?error=${encodeURIComponent(message)}`);
}

async function submitPostgresWorkspaceRequest(request: ParsedWorkspaceRequest) {
  // كل العمل داخل سياق الهوية: الجلسة تحدد صاحب الطلب، وسياسة `workspace_requests`
  // تسمح لمقدّم الطلب بقراءة وكتابة طلبه وحده.
  const outcome = await withSessionUser(async ({ sql, user }) => {
    const state = await sql.query<{ has_membership: boolean; status: string | null }>(
      `select exists(
         select 1 from public.memberships where user_id = $1 and active = true
       ) as has_membership,
       (select status::text from public.workspace_requests where user_id = $1 limit 1) as status`,
      [user.id],
    );
    const currentState = state.rows[0];
    if (currentState?.has_membership || currentState?.status === "approved") return "redirect-home" as const;
    if (currentState?.status === "pending_approval") return "redirect-status" as const;

    try {
      await sql.query(
        `insert into public.workspace_requests
           (user_id, email, tenant_type, requested_product_level, workspace_name, slug, mobile_phone, whatsapp_phone)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (user_id) do update set
           email = excluded.email,
           tenant_type = excluded.tenant_type,
           requested_product_level = excluded.requested_product_level,
           workspace_name = excluded.workspace_name,
           slug = excluded.slug,
           mobile_phone = excluded.mobile_phone,
           whatsapp_phone = excluded.whatsapp_phone,
           status = 'pending_approval',
           rejection_reason = null,
           reviewed_by = null,
           reviewed_at = null,
           tenant_id = null,
           updated_at = now()`,
        [
          user.id,
          user.email.toLowerCase(),
          request.tenantType,
          request.requestedProductLevel,
          request.name,
          request.slug,
          request.mobilePhone,
          request.whatsappPhone,
        ],
      );
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "23505") return "duplicate-slug" as const;
      return "failed" as const;
    }

    return "created" as const;
  });

  if (!outcome) redirect("/login");
  if (outcome === "redirect-home") redirect("/");
  if (outcome === "redirect-status") redirect("/account-status");
  if (outcome === "duplicate-slug") onboardingError("الرابط المختصر مستخدم بالفعل، اختر رابطًا آخر");
  if (outcome === "failed") onboardingError("تعذر إرسال الطلب حاليًا. حاول مرة أخرى");

  await clearPostgresSession(applicationSql());
  redirect(`/login?message=${encodeURIComponent("تم استلام طلب اشتراكك. ستراجعه إدارة المنصة وتتواصل معك، وبعد التفعيل يمكنك تسجيل الدخول مرة أخرى")}`);
}

export async function submitWorkspaceRequest(formData: FormData) {
  const parsedRequest = workspaceRequestSchema.safeParse({
    tenantType: formData.get("tenant_type"),
    requestedProductLevel: formData.get("requested_product_level"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    mobilePhone: formData.get("mobile_phone"),
    whatsappPhone: formData.get("whatsapp_phone"),
  });
  if (!parsedRequest.success) onboardingError(firstValidationMessage(parsedRequest.error));
  await submitPostgresWorkspaceRequest(parsedRequest.data);
}
