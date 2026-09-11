"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { acceptPostgresInvitation, registerAndAcceptPostgresInvitation } from "@/lib/auth/postgres-team";
import { authenticatePostgresUser, clearPostgresSession, createPostgresSession } from "@/lib/auth/postgres-auth";
import { withSessionUser } from "@/lib/auth/session-context";
import { buildRateLimitRules, clientAddress, consumeRateLimit, describeRetryAfter } from "@/lib/security/rate-limit";
import { applicationSql } from "@/lib/database/application-sql";
import { getAuthAccountState, getInvitationPreview } from "@/lib/invitations";

function inviteError(token: string, message: string): never {
  redirect(`/invite?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`);
}

function validatePassword(password: string, confirmPassword?: string): string | null {
  if (password.length < 8 || password.length > 72) return "كلمة المرور يجب أن تكون من 8 إلى 72 حرفًا";
  if (confirmPassword !== undefined && password !== confirmPassword) return "كلمتا المرور غير متطابقتين";
  return null;
}

async function loadPendingInvitation(token: string) {
  const invitation = await getInvitationPreview(token);
  if (!invitation || invitation.status !== "pending") inviteError(token, "الدعوة غير صالحة أو لم تعد متاحة");
  return invitation;
}

export async function acceptNewInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const passwordError = validatePassword(password, confirmPassword);
  if (passwordError) inviteError(token, passwordError);

  const invitation = await loadPendingInvitation(token);

  // حدّ على قبول الدعوات: الرابط حامل للسر، ومحاولاته المتكررة تخمين.
  const decision = await consumeRateLimit(applicationSql(), {
    scope: "invite_accept",
    rules: buildRateLimitRules({
      scope: "invite_accept",
      account: invitation.email,
      address: clientAddress(await headers()),
    }),
  });
  if (!decision.allowed) {
    inviteError(token, `${decision.message} (${describeRetryAfter(decision.retryAfterSeconds)})`);
  }

  if (invitation.accountExists || (await getAuthAccountState(invitation.email)) === "registered") {
    inviteError(token, "هذا البريد لديه حساب بالفعل؛ استخدم تسجيل الدخول لإكمال الدعوة");
  }

  const sql = applicationSql();
  try {
    const user = await registerAndAcceptPostgresInvitation(sql, invitation.email, password, token);
    await createPostgresSession(sql, user.id);
  } catch {
    inviteError(token, "تعذر إكمال قبول الدعوة. حاول مرة أخرى");
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

  const invitation = await loadPendingInvitation(token);
  if (!invitation.accountExists) inviteError(token, "لا يوجد حساب حقيقي بهذا البريد بعد. أنشئ كلمة مرور جديدة لإكمال الدعوة");

  const sql = applicationSql();
  const user = await authenticatePostgresUser(sql, invitation.email, password);
  if (!user) inviteError(token, "كلمة المرور غير صحيحة");
  try {
    await acceptPostgresInvitation(sql, token, user.id, user.email);
    await createPostgresSession(sql, user.id);
  } catch (error) {
    inviteError(token, error instanceof Error ? error.message : "تعذر قبول الدعوة");
  }
  revalidatePath("/");
  revalidatePath("/team");
  redirect("/");
}

export async function acceptExistingInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  // قبول الدعوة يقرأ ويحدّث `invitations` و`memberships`، وكلاهما خاضع للسياسات،
  // فيُفتح سياق الهوية أولًا ثم تُنفَّذ العملية داخل معاملة واحدة.
  const accepted = await withSessionUser(async ({ sql, user }) => {
    await acceptPostgresInvitation(sql, token, user.id, user.email);
    return true;
  });
  if (!accepted) inviteError(token, "انتهت جلسة الدخول. أدخل كلمة المرور لإكمال الدعوة");
  revalidatePath("/");
  revalidatePath("/team");
  redirect("/");
}

export async function switchInvitationAccount(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await clearPostgresSession(applicationSql());
  redirect(`/invite?token=${encodeURIComponent(token)}`);
}
