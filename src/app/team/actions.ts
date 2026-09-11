"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { MemberRole, TenantCapability } from "@/lib/authorization/policy";
import type { AccessScopedSqlExecutor } from "@/lib/database/sql-executor";
import {
  assertAssignableRole,
  createPostgresInvitation,
  ensurePostgresInvitableEmail,
  requirePostgresTenantCapability,
  setPostgresMembershipActive,
  updatePostgresInvitation,
} from "@/lib/auth/postgres-team";

function fail(tenantId: string, message: string): never {
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&error=${encodeURIComponent(message)}`);
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/**
 * ينفّذ عملية داخل سياق مساحة مصرّح به.
 *
 * الواجهة callback لأن السياق يُصفَّر مع نهاية المعاملة: تمرير العملية يضمن أنها
 * تنفَّذ داخل النطاق، وأن المُنفّذ لا يُستخدم بعده.
 */
function withTeamContext<Result>(
  tenantId: string,
  capability: TenantCapability,
  operation: (context: { sql: AccessScopedSqlExecutor; userId: string; role: MemberRole }) => Promise<Result>,
): Promise<Result> {
  return requirePostgresTenantCapability(tenantId, capability, operation);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "تعذر تنفيذ العملية";
}

export async function createInvitation(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const email = normalizeEmail(formData.get("email"));
  const role = String(formData.get("role") ?? "") as MemberRole;
  if (!tenantId) redirect("/");
  if (!/^\S+@\S+\.\S+$/.test(email)) fail(tenantId, "أدخل بريدًا إلكترونيًا صحيحًا");

  let rawToken: string;
  try {
    assertAssignableRole(role);
    rawToken = await withTeamContext(tenantId, "invitations.create", async ({ sql, userId }) => {
      await ensurePostgresInvitableEmail(sql, email);
      const created = await createPostgresInvitation(sql, tenantId, userId, email, role, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      return created.rawToken;
    });
  } catch (error) {
    fail(tenantId, errorMessage(error));
  }
  if (!rawToken) fail(tenantId, "تعذر إنشاء رابط الدعوة");
  const invitationUrl = `${await requestOrigin()}/invite?token=${encodeURIComponent(rawToken)}`;
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&invite=${encodeURIComponent(invitationUrl)}&delivery=manual`);
}

export async function resendInvitation(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const invitationId = String(formData.get("invitation_id") ?? "");
  let rawToken: string | undefined;
  try {
    rawToken = await withTeamContext(tenantId, "invitations.resend", async ({ sql, userId }) =>
      (await updatePostgresInvitation(sql, tenantId, userId, invitationId, "resend")).rawToken,
    );
  } catch (error) {
    fail(tenantId, errorMessage(error));
  }
  if (!rawToken) fail(tenantId, "تعذر إنشاء رابط الدعوة");
  const invitationUrl = `${await requestOrigin()}/invite?token=${encodeURIComponent(rawToken)}`;
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&invite=${encodeURIComponent(invitationUrl)}&delivery=manual`);
}

export async function revokeInvitation(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const invitationId = String(formData.get("invitation_id") ?? "");
  try {
    await withTeamContext(tenantId, "invitations.revoke", ({ sql, userId }) =>
      updatePostgresInvitation(sql, tenantId, userId, invitationId, "revoke"),
    );
  } catch (error) {
    fail(tenantId, errorMessage(error));
  }
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&success=${encodeURIComponent("تم إلغاء الدعوة")}`);
}

export async function deactivateMembership(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const targetUserId = String(formData.get("user_id") ?? "");
  try {
    await withTeamContext(tenantId, "team.manage", ({ sql, userId, role }) =>
      setPostgresMembershipActive(sql, tenantId, userId, role, targetUserId, false),
    );
  } catch (error) {
    fail(tenantId, errorMessage(error));
  }
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&success=${encodeURIComponent("تم تعطيل العضوية دون حذف الحساب")}`);
}

export async function reactivateMembership(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const targetUserId = String(formData.get("user_id") ?? "");
  try {
    await withTeamContext(tenantId, "team.manage", ({ sql, userId, role }) =>
      setPostgresMembershipActive(sql, tenantId, userId, role, targetUserId, true),
    );
  } catch (error) {
    fail(tenantId, errorMessage(error));
  }
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&success=${encodeURIComponent("تمت إعادة تنشيط العضوية")}`);
}
