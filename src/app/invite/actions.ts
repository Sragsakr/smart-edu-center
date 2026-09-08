"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { acceptPostgresInvitation, registerAndAcceptPostgresInvitation } from "@/lib/auth/postgres-team";
import { authenticatePostgresUser, clearPostgresSession, createPostgresSession, getPostgresCurrentUser } from "@/lib/auth/postgres-auth";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import { getAuthAccountState, getInvitationPreview } from "@/lib/invitations";

function postgresSql() {
  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) throw new Error("Invitation management requires the PostgreSQL application backend");
  return postgresSqlExecutor(config.databaseUrl);
}

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
  if (invitation.accountExists || (await getAuthAccountState(invitation.email)) === "registered") {
    inviteError(token, "هذا البريد لديه حساب بالفعل؛ استخدم تسجيل الدخول لإكمال الدعوة");
  }

  const sql = postgresSql();
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

  const sql = postgresSql();
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
  const sql = postgresSql();
  const user = await getPostgresCurrentUser(sql);
  if (!user) inviteError(token, "انتهت جلسة الدخول. أدخل كلمة المرور لإكمال الدعوة");
  try {
    await acceptPostgresInvitation(sql, token, user.id, user.email);
  } catch (error) {
    inviteError(token, error instanceof Error ? error.message : "تعذر قبول الدعوة");
  }
  revalidatePath("/");
  revalidatePath("/team");
  redirect("/");
}

export async function switchInvitationAccount(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await clearPostgresSession(postgresSql());
  redirect(`/invite?token=${encodeURIComponent(token)}`);
}
