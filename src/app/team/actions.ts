"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { MemberRole, TenantCapability } from "@/lib/authorization/policy";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
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

async function postgresTeamContext(tenantId: string, capability: TenantCapability) {
  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) {
    throw new Error("Team management requires the PostgreSQL application backend");
  }
  const sql = postgresSqlExecutor(config.databaseUrl);
  const access = await requirePostgresTenantCapability(sql, tenantId, capability);
  return { sql, ...access };
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
    const { sql, userId } = await postgresTeamContext(tenantId, "invitations.create");
    await ensurePostgresInvitableEmail(sql, email);
    ({ rawToken } = await createPostgresInvitation(sql, tenantId, userId, email, role, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
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
    const { sql, userId } = await postgresTeamContext(tenantId, "invitations.resend");
    ({ rawToken } = await updatePostgresInvitation(sql, tenantId, userId, invitationId, "resend"));
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
    const { sql, userId } = await postgresTeamContext(tenantId, "invitations.revoke");
    await updatePostgresInvitation(sql, tenantId, userId, invitationId, "revoke");
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
    const { sql, userId, role } = await postgresTeamContext(tenantId, "team.manage");
    await setPostgresMembershipActive(sql, tenantId, userId, role, targetUserId, false);
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
    const { sql, userId, role } = await postgresTeamContext(tenantId, "team.manage");
    await setPostgresMembershipActive(sql, tenantId, userId, role, targetUserId, true);
  } catch (error) {
    fail(tenantId, errorMessage(error));
  }
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&success=${encodeURIComponent("تمت إعادة تنشيط العضوية")}`);
}
