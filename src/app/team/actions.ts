"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/lib/team-access";

const assignableRoles = new Set<MemberRole>(["admin", "teacher", "receptionist", "accountant"]);

function fail(tenantId: string, message: string): never {
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&error=${encodeURIComponent(message)}`);
}

async function requireManager(tenantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("role,active")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (error || !membership || !["owner", "admin"].includes(membership.role)) fail(tenantId, "ليس لديك صلاحية لإدارة الفريق");
  return { supabase, user, role: membership.role as MemberRole };
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function tokenPair() {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

async function requestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://smart-edu-center-jade.vercel.app";
}

async function audit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  actorUserId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
) {
  const { error } = await supabase.from("audit_logs").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    action,
    entity_type: "invitation",
    entity_id: entityId,
    details,
  });
  if (error) throw new Error("تعذر تسجيل العملية في سجل التدقيق");
}

export async function createInvitation(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const email = normalizeEmail(formData.get("email"));
  const role = String(formData.get("role") ?? "") as MemberRole;
  if (!tenantId) redirect("/");
  if (!/^\S+@\S+\.\S+$/.test(email)) fail(tenantId, "أدخل بريدًا إلكترونيًا صحيحًا");
  if (!assignableRoles.has(role)) fail(tenantId, "اختر صلاحية صحيحة");

  const { supabase, user } = await requireManager(tenantId);
  const { data: existingMembership } = await supabase.from("memberships").select("user_id").eq("tenant_id", tenantId).eq("active", true);
  if (existingMembership?.length) {
    const admin = createAdminClient();
    const identities = await Promise.all(existingMembership.map(async (row) => (await admin.auth.admin.getUserById(row.user_id)).data.user));
    if (identities.some((identity) => identity?.email?.toLowerCase() === email)) fail(tenantId, "هذا المستخدم عضو بالفعل في مساحة العمل");
  }

  const { data: pending } = await supabase.from("invitations").select("id").eq("tenant_id", tenantId).eq("invitee_email", email).eq("status", "pending").maybeSingle();
  if (pending) fail(tenantId, "توجد دعوة معلقة بالفعل لهذا البريد؛ استخدم إعادة الإرسال");

  const { raw, hash } = tokenPair();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({ tenant_id: tenantId, invitee_email: email, role, token_hash: hash, expires_at: expiresAt, created_by: user.id })
    .select("id")
    .single();
  if (error || !invitation) fail(tenantId, "تعذر إنشاء الدعوة");

  await audit(supabase, tenantId, user.id, "membership.invitation.created", invitation.id, { email, role, delivery: "share-link" });
  const invitationUrl = `${await requestOrigin()}/invite?token=${encodeURIComponent(raw)}`;
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&invite=${encodeURIComponent(invitationUrl)}&delivery=manual`);
}

export async function resendInvitation(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const invitationId = String(formData.get("invitation_id") ?? "");
  const { supabase, user } = await requireManager(tenantId);
  const { data: invitation, error: lookupError } = await supabase
    .from("invitations")
    .select("id,invitee_email,role,status")
    .eq("id", invitationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (lookupError || !invitation || invitation.status !== "pending") fail(tenantId, "الدعوة غير قابلة لإعادة الإرسال");

  const { raw, hash } = tokenPair();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("invitations")
    .update({ token_hash: hash, expires_at: expiresAt, last_sent_at: now, updated_at: now })
    .eq("id", invitationId)
    .eq("tenant_id", tenantId);
  if (error) fail(tenantId, "تعذر تحديث الدعوة");

  await audit(supabase, tenantId, user.id, "membership.invitation.resent", invitationId, { email: invitation.invitee_email, role: invitation.role, delivery: "share-link" });
  const invitationUrl = `${await requestOrigin()}/invite?token=${encodeURIComponent(raw)}`;
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&invite=${encodeURIComponent(invitationUrl)}&delivery=manual`);
}

export async function revokeInvitation(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const invitationId = String(formData.get("invitation_id") ?? "");
  const { supabase, user } = await requireManager(tenantId);
  const { error } = await supabase.from("invitations").update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", invitationId).eq("tenant_id", tenantId).eq("status", "pending");
  if (error) fail(tenantId, "تعذر إلغاء الدعوة");
  await audit(supabase, tenantId, user.id, "membership.invitation.revoked", invitationId, {});
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&success=${encodeURIComponent("تم إلغاء الدعوة")}`);
}

export async function deactivateMembership(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const targetUserId = String(formData.get("user_id") ?? "");
  const { supabase, user, role: actorRole } = await requireManager(tenantId);
  if (targetUserId === user.id) fail(tenantId, "لا يمكنك تعطيل عضويتك الحالية من هنا");
  const { data: target, error: lookupError } = await supabase.from("memberships").select("role,active").eq("tenant_id", tenantId).eq("user_id", targetUserId).maybeSingle();
  if (lookupError || !target) fail(tenantId, "العضوية غير موجودة");
  if (target.role === "owner") fail(tenantId, "لا يمكن تعطيل المالك من إدارة الفريق");
  if (actorRole === "admin" && target.role === "admin") fail(tenantId, "المشرف لا يستطيع تعطيل مشرف آخر");
  const { error } = await supabase.from("memberships").update({ active: false }).eq("tenant_id", tenantId).eq("user_id", targetUserId);
  if (error) fail(tenantId, "تعذر تعطيل العضوية");
  await audit(supabase, tenantId, user.id, "membership.disabled", targetUserId, { previous_role: target.role });
  revalidatePath("/team");
  redirect(`/team?tenant=${encodeURIComponent(tenantId)}&success=${encodeURIComponent("تم تعطيل العضوية دون حذف الحساب")}`);
}
