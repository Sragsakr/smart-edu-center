"use server";

import { redirect } from "next/navigation";
import { signUpErrorMessage } from "@/lib/auth/auth-error-message";
import { authSubmissionSchema, firstValidationMessage } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

function loginError(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

async function registerAccount(supabase: ServerSupabaseClient, email: string, password: string) {
  const { data: registration, error } = await supabase.auth.signUp({ email, password });
  if (error) loginError(signUpErrorMessage(error.code));
  if (!registration.session) {
    loginError("إعداد التسجيل ما زال يطلب تأكيد البريد. أوقف Email Confirmation في Supabase ثم حاول مرة أخرى");
  }
  redirect("/onboarding");
}

async function accountAccessAfterLogin(supabase: ServerSupabaseClient, userId: string) {
  const [adminLookup, membershipLookup, requestLookup] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("memberships")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("active", true)
      .limit(1)
      .maybeSingle(),
    supabase.from("workspace_requests").select("status").eq("user_id", userId).maybeSingle(),
  ]);
  if (adminLookup.error || membershipLookup.error || requestLookup.error) {
    throw new Error("تعذر التحقق من حالة تفعيل الحساب");
  }
  return {
    isPlatformAdmin: Boolean(adminLookup.data),
    hasMembership: Boolean(membershipLookup.data),
    requestStatus: requestLookup.data?.status,
  };
}

async function signInAccount(supabase: ServerSupabaseClient, email: string, password: string) {
  const { data: authentication, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !authentication.user) loginError("بيانات الدخول غير صحيحة");

  const access = await accountAccessAfterLogin(supabase, authentication.user.id);
  if (access.isPlatformAdmin || access.hasMembership) redirect("/");
  if (access.requestStatus === "pending_approval") {
    await supabase.auth.signOut();
    loginError("طلب اشتراكك قيد المراجعة. ستتواصل معك إدارة المنصة، ويمكنك الدخول بعد التفعيل");
  }
  redirect("/onboarding");
}

export async function authenticate(formData: FormData) {
  const parsedSubmission = authSubmissionSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    intent: formData.get("intent"),
  });
  if (!parsedSubmission.success) loginError(firstValidationMessage(parsedSubmission.error));

  const { email, password, intent } = parsedSubmission.data;
  const supabase = await createClient();
  if (intent === "sign-up") await registerAccount(supabase, email, password);
  await signInAccount(supabase, email, password);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
