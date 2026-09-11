"use server";

import { redirect } from "next/navigation";

import {
  authenticatePostgresUser,
  clearPostgresSession,
  createPostgresSession,
  getPostgresAccountAccess,
  registerPostgresUser,
} from "@/lib/auth/postgres-auth";
import { withSessionUser } from "@/lib/auth/session-context";
import { authSubmissionSchema, firstValidationMessage } from "@/lib/auth/validation";
import { applicationSql } from "@/lib/database/application-sql";

function loginError(message: string): never { redirect(`/login?error=${encodeURIComponent(message)}`); }
function signupError(message: string): never { redirect(`/signup?error=${encodeURIComponent(message)}`); }
function platformLoginError(message: string): never { redirect(`/platform-control/login?error=${encodeURIComponent(message)}`); }

async function signInPostgresAccount(email: string, password: string) {
  const sql = applicationSql();
  const user = await authenticatePostgresUser(sql, email, password);
  if (!user) loginError("بيانات الدخول غير صحيحة");

  // بعد التحقق من كلمة المرور تُفتح جلسة ثم تُقرأ العلاقات داخل سياق الهوية،
  // لأن جداول العلاقات خاضعة لسياسات RLS ولا تُقرأ بلا سياق.
  await createPostgresSession(sql, user.id);

  const resolved = await withSessionUser(async ({ sql: scoped }) => {
    const [access, portalRelations] = [
      await getPostgresAccountAccess(scoped, user.id),
      await scoped.query<{ has_student: boolean; has_guardian: boolean }>(
        `select
           exists(select 1 from public.students where user_id = $1 and active = true) as has_student,
           exists(select 1 from public.guardians where user_id = $1 and active = true) as has_guardian`,
        [user.id],
      ),
    ];
    return { access, relations: portalRelations.rows[0] };
  });

  const access = resolved?.access;
  if (!access) loginError("تعذر إكمال الدخول. حاول مرة أخرى");
  const hasStudent = Boolean(resolved?.relations?.has_student);
  const hasGuardian = Boolean(resolved?.relations?.has_guardian);
  const portalCount = Number(access.hasMembership) + Number(hasStudent) + Number(hasGuardian);

  if (access.isPlatformAdmin && portalCount === 0) {
    loginError("هذا حساب إدارة المنصة. استخدم رابط دخول إدارة الـSaaS المخصص");
  }
  if (access.requestStatus === "pending_approval") {
    loginError("طلب اشتراكك قيد المراجعة. ستتواصل معك إدارة المنصة، ويمكنك الدخول بعد التفعيل");
  }
  if (portalCount > 1) redirect("/choose-context");
  if (access.hasMembership) redirect("/");
  if (hasStudent) redirect("/student");
  if (hasGuardian) redirect("/parent");
  redirect("/onboarding");
}

export async function authenticate(formData: FormData) {
  const parsed = authSubmissionSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), intent: "sign-in" });
  if (!parsed.success) loginError(firstValidationMessage(parsed.error));
  await signInPostgresAccount(parsed.data.email, parsed.data.password);
}

export async function createAccount(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");
  if (password !== confirmation) signupError("كلمتا المرور غير متطابقتين");
  const parsed = authSubmissionSchema.safeParse({ email: formData.get("email"), password, intent: "sign-up" });
  if (!parsed.success) signupError(firstValidationMessage(parsed.error));

  const sql = applicationSql();
  try {
    const user = await registerPostgresUser(sql, parsed.data.email, parsed.data.password);
    await createPostgresSession(sql, user.id);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") signupError("هذا البريد مسجل بالفعل");
    signupError("تعذر إنشاء الحساب حاليًا");
  }
  redirect("/onboarding");
}

export async function authenticatePlatformAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) platformLoginError("أدخل بيانات الدخول الصحيحة");

  const sql = applicationSql();
  const user = await authenticatePostgresUser(sql, email, password);
  if (!user) platformLoginError("بيانات الدخول غير صحيحة");
  await createPostgresSession(sql, user.id);

  const resolved = await withSessionUser(({ sql: scoped }) => getPostgresAccountAccess(scoped, user.id));
  if (!resolved?.isPlatformAdmin) platformLoginError("هذا الحساب غير مصرح له بإدارة المنصة");
  redirect("/platform-admin");
}

export async function signOut() {
  await clearPostgresSession(applicationSql());
  redirect("/login");
}
