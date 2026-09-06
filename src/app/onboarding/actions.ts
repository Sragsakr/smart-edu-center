"use server";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { firstValidationMessage, workspaceRequestSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ParsedWorkspaceRequest = ReturnType<typeof workspaceRequestSchema.parse>;

function onboardingError(message: string): never {
  redirect(`/onboarding?error=${encodeURIComponent(message)}`);
}

async function verifiedApplicant(supabase: ServerSupabaseClient): Promise<User & { email: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!user.email || !user.email_confirmed_at) onboardingError("يجب تأكيد البريد الإلكتروني أولًا");
  return user as User & { email: string };
}

async function provisioningState(supabase: ServerSupabaseClient, userId: string) {
  const [membershipLookup, requestLookup] = await Promise.all([
    supabase
      .from("memberships")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("active", true)
      .limit(1)
      .maybeSingle(),
    supabase.from("workspace_requests").select("status").eq("user_id", userId).maybeSingle(),
  ]);
  if (membershipLookup.error || requestLookup.error) onboardingError("تعذر التحقق من حالة الحساب");
  return { hasMembership: Boolean(membershipLookup.data), requestStatus: requestLookup.data?.status };
}

function workspaceRequestFields(user: User & { email: string }, request: ParsedWorkspaceRequest) {
  return {
    user_id: user.id,
    email: user.email.toLowerCase(),
    account_type: request.accountType,
    workspace_name: request.name,
    slug: request.slug,
    mobile_phone: request.mobilePhone,
    whatsapp_phone: request.whatsappPhone,
    status: "pending_approval" as const,
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    tenant_id: null,
    updated_at: new Date().toISOString(),
  };
}

function createWorkspaceRequest(
  supabase: ServerSupabaseClient,
  user: User & { email: string },
  request: ParsedWorkspaceRequest,
) {
  return supabase.from("workspace_requests").insert(workspaceRequestFields(user, request));
}

function resubmitWorkspaceRequest(
  supabase: ServerSupabaseClient,
  user: User & { email: string },
  request: ParsedWorkspaceRequest,
) {
  return supabase
    .from("workspace_requests")
    .update(workspaceRequestFields(user, request))
    .eq("user_id", user.id);
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

  const supabase = await createClient();
  const applicant = await verifiedApplicant(supabase);
  const state = await provisioningState(supabase, applicant.id);
  if (state.hasMembership || state.requestStatus === "approved") redirect("/");
  if (state.requestStatus === "pending_approval") redirect("/account-status");

  const submission =
    state.requestStatus === "rejected"
      ? resubmitWorkspaceRequest(supabase, applicant, parsedRequest.data)
      : createWorkspaceRequest(supabase, applicant, parsedRequest.data);
  const { error } = await submission;
  if (error?.code === "23505") onboardingError("الرابط المختصر مستخدم بالفعل، اختر رابطًا آخر");
  if (error) onboardingError("تعذر إرسال الطلب حاليًا. حاول مرة أخرى");

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) redirect("/account-status");
  redirect(
    `/login?message=${encodeURIComponent("تم استلام طلب اشتراكك. ستراجعه إدارة المنصة وتتواصل معك، وبعد التفعيل يمكنك تسجيل الدخول مرة أخرى")}`,
  );
}
