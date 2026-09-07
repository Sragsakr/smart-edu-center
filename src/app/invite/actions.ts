"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthAccountState, getInvitationPreview, removeLegacyInvitePlaceholder } from "@/lib/invitations";

function inviteError(token: string, message: string): never {
  redirect(`/invite?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`);
}

function validatePassword(password: string, confirmPassword?: string) {
  if (password.length < 8 || password.length > 72) return "كلمة المرور يجب أن تكون من 8 إلى 72 حرفًا";
  if (confirmPassword !== undefined && password !== confirmPassword) return "كلمتا المرور غير متطابقتين";
  return null;
}

async function acceptWithCurrentSession(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_membership_invitation", { raw_token: token });
  if (error || !data?.length) {
    const raw = error?.message ?? "";
    const message = raw.includes("expired")
      ? "انتهت صلاحية الدعوة"
      : raw.includes("email_mismatch")
        ? "هذه الدعوة موجهة إلى بريد إلكتروني آخر"
        : raw.includes("not_pending")
          ? "تم استخدام هذه الدعوة أو إلغاؤها من قبل"
          : "رابط الدعوة غير صالح";
    inviteError(token, message);
  }
  revalidatePath("/");
  revalidatePath("/team");
  redirect("/");
}

export async function acceptNewInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const passwordError = validatePassword(password, confirmPassword);
  if (passwordError) inviteError(token, passwordError);

  const invitation = await getInvitationPreview(token);
  if (!invitation || invitation.status !== "pending") inviteError(token, "الدعوة غير صالحة أو لم تعد متاحة");

  const accountState = await getAuthAccountState(invitation.email);
  if (accountState === "registered") inviteError(token, "هذا البريد لديه حساب حقيقي بالفعل، لذلك لا يمكن استخدام دعوة حساب جديد");
  if (accountState === "legacy-placeholder") await removeLegacyInvitePlaceholder(invitation.email);

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) inviteError(token, "تعذر إنشاء الحساب من الدعوة");

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
  if (signInError) {
    await admin.auth.admin.deleteUser(created.user.id);
    inviteError(token, "تم إنشاء الحساب لكن تعذر تسجيل الدخول. حاول مرة أخرى");
  }

  const { data, error } = await supabase.rpc("accept_membership_invitation", { raw_token: token });
  if (error || !data?.length) {
    await supabase.auth.signOut();
    await admin.auth.admin.deleteUser(created.user.id);
    inviteError(token, "تعذر إكمال قبول الدعوة. لم يتم الاحتفاظ بالحساب الجديد");
  }

  revalidatePath("/");
  revalidatePath("/team");
  redirect("/");
}

export async function loginAndAcceptInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) inviteError(token, passwordError);

  const invitation = await getInvitationPreview(token);
  if (!invitation || invitation.status !== "pending") inviteError(token, "الدعوة غير صالحة أو لم تعد متاحة");
  if (!invitation.accountExists) inviteError(token, "لا يوجد حساب حقيقي بهذا البريد بعد. أنشئ كلمة مرور جديدة لإكمال الدعوة");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
  if (error) inviteError(token, "كلمة المرور غير صحيحة");
  await acceptWithCurrentSession(token);
}

export async function acceptExistingInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) inviteError(token, "انتهت جلسة الدخول. أدخل كلمة المرور لإكمال الدعوة");
  await acceptWithCurrentSession(token);
}

export async function switchInvitationAccount(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/invite?token=${encodeURIComponent(token)}`);
}
