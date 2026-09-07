"use server";

import { redirect } from "next/navigation";
import { signUpErrorMessage } from "@/lib/auth/auth-error-message";
import { authSubmissionSchema, firstValidationMessage } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

function loginError(message: string): never { redirect(`/login?error=${encodeURIComponent(message)}`); }
function signupError(message: string): never { redirect(`/signup?error=${encodeURIComponent(message)}`); }
function platformLoginError(message: string): never { redirect(`/platform-control/login?error=${encodeURIComponent(message)}`); }

async function registerAccount(supabase: ServerSupabaseClient, email: string, password: string) {
  const { data: registration, error } = await supabase.auth.signUp({ email, password });
  if (error) signupError(signUpErrorMessage(error.code));
  if (!registration.session) signupError("إعداد التسجيل ما زال يطلب تأكيد البريد. أوقف Email Confirmation في Supabase ثم حاول مرة أخرى");
  redirect("/onboarding");
}

async function resolveAccess(supabase: ServerSupabaseClient, userId: string) {
  const [admin, membership, student, guardian, request] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id",userId).maybeSingle(),
    supabase.from("memberships").select("tenant_id").eq("user_id",userId).eq("active",true).limit(1).maybeSingle(),
    supabase.from("students").select("id").eq("user_id",userId).eq("active",true).limit(1).maybeSingle(),
    supabase.from("guardians").select("id").eq("user_id",userId).limit(1).maybeSingle(),
    supabase.from("workspace_requests").select("status").eq("user_id",userId).maybeSingle(),
  ]);
  if (admin.error || membership.error || student.error || guardian.error || request.error) throw new Error("تعذر التحقق من حالة الحساب");
  return { isPlatformAdmin:Boolean(admin.data), hasMembership:Boolean(membership.data), hasStudent:Boolean(student.data), hasGuardian:Boolean(guardian.data), requestStatus:request.data?.status };
}

async function signInAccount(supabase: ServerSupabaseClient, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) loginError("بيانات الدخول غير صحيحة");
  const access = await resolveAccess(supabase,data.user.id);
  if (access.isPlatformAdmin && !access.hasMembership && !access.hasStudent && !access.hasGuardian) {
    await supabase.auth.signOut();
    loginError("هذا حساب إدارة المنصة. استخدم رابط دخول إدارة الـSaaS المخصص");
  }
  const portalCount = Number(access.hasMembership)+Number(access.hasStudent)+Number(access.hasGuardian);
  if (portalCount > 1) redirect("/choose-context");
  if (access.hasMembership) redirect("/");
  if (access.hasStudent) redirect("/student");
  if (access.hasGuardian) redirect("/parent");
  if (access.requestStatus === "pending_approval") {
    await supabase.auth.signOut();
    loginError("طلب اشتراكك قيد المراجعة. ستتواصل معك إدارة المنصة، ويمكنك الدخول بعد التفعيل");
  }
  redirect("/onboarding");
}

export async function authenticate(formData: FormData) {
  const parsed = authSubmissionSchema.safeParse({ email:formData.get("email"), password:formData.get("password"), intent:"sign-in" });
  if (!parsed.success) loginError(firstValidationMessage(parsed.error));
  const supabase = await createClient();
  await signInAccount(supabase,parsed.data.email,parsed.data.password);
}

export async function createAccount(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");
  if (password !== confirmation) signupError("كلمتا المرور غير متطابقتين");
  const parsed = authSubmissionSchema.safeParse({ email:formData.get("email"), password, intent:"sign-up" });
  if (!parsed.success) signupError(firstValidationMessage(parsed.error));
  const supabase = await createClient();
  await registerAccount(supabase,parsed.data.email,parsed.data.password);
}

export async function authenticatePlatformAdmin(formData: FormData) {
  const email=String(formData.get("email")??"").trim().toLowerCase();
  const password=String(formData.get("password")??"");
  if (!email || password.length<8) platformLoginError("أدخل بيانات الدخول الصحيحة");
  const supabase=await createClient();
  const { data,error }=await supabase.auth.signInWithPassword({email,password});
  if (error || !data.user) platformLoginError("بيانات الدخول غير صحيحة");
  const { data:admin,error:adminError }=await supabase.from("platform_admins").select("user_id").eq("user_id",data.user.id).maybeSingle();
  if (adminError || !admin) { await supabase.auth.signOut(); platformLoginError("هذا الحساب غير مصرح له بإدارة المنصة"); }
  redirect("/platform-admin");
}

export async function signOut() { const supabase=await createClient(); await supabase.auth.signOut(); redirect("/login"); }
