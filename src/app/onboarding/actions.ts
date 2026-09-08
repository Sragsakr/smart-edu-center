"use server";

import { redirect } from "next/navigation";

import { clearPostgresSession, getPostgresCurrentUser } from "@/lib/auth/postgres-auth";
import { firstValidationMessage, workspaceRequestSchema } from "@/lib/auth/validation";
import { applicationSql } from "@/lib/database/application-sql";

type ParsedWorkspaceRequest = ReturnType<typeof workspaceRequestSchema.parse>;

function onboardingError(message: string): never {
  redirect(`/onboarding?error=${encodeURIComponent(message)}`);
}

async function submitPostgresWorkspaceRequest(request: ParsedWorkspaceRequest) {
  const sql = applicationSql();
  const applicant = await getPostgresCurrentUser(sql);
  if (!applicant) redirect("/login");

  const state = await sql.query<{ has_membership: boolean; status: string | null }>(
    `select exists(
       select 1 from public.memberships where user_id = $1 and active = true
     ) as has_membership,
     (select status::text from public.workspace_requests where user_id = $1 limit 1) as status`,
    [applicant.id],
  );
  const currentState = state.rows[0];
  if (currentState?.has_membership || currentState?.status === "approved") redirect("/");
  if (currentState?.status === "pending_approval") redirect("/account-status");

  try {
    await sql.query(
      `insert into public.workspace_requests
         (user_id, email, account_type, workspace_name, slug, mobile_phone, whatsapp_phone)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (user_id) do update set
         email = excluded.email,
         account_type = excluded.account_type,
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
      [applicant.id, applicant.email.toLowerCase(), request.accountType, request.name, request.slug, request.mobilePhone, request.whatsappPhone],
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      onboardingError("الرابط المختصر مستخدم بالفعل، اختر رابطًا آخر");
    }
    onboardingError("تعذر إرسال الطلب حاليًا. حاول مرة أخرى");
  }

  await clearPostgresSession(sql);
  redirect(`/login?message=${encodeURIComponent("تم استلام طلب اشتراكك. ستراجعه إدارة المنصة وتتواصل معك، وبعد التفعيل يمكنك تسجيل الدخول مرة أخرى")}`);
}

export async function submitWorkspaceRequest(formData: FormData) {
  const parsedRequest = workspaceRequestSchema.safeParse({
    accountType: formData.get("account_type"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    mobilePhone: formData.get("mobile_phone"),
    whatsappPhone: formData.get("whatsapp_phone"),
  });
  if (!parsedRequest.success) onboardingError(firstValidationMessage(parsedRequest.error));
  await submitPostgresWorkspaceRequest(parsedRequest.data);
}
