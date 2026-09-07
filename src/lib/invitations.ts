import "server-only";

import { createHash } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type InvitationPreview = {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  accountExists: boolean;
};

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("تعذر التحقق من حساب المستخدم");
    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
  return null;
}

async function hasAppRelationships(userId: string) {
  const admin = createAdminClient();
  const [membership, student, guardian, platformAdmin, workspaceRequest] = await Promise.all([
    admin.from("memberships").select("user_id").eq("user_id", userId).limit(1),
    admin.from("students").select("user_id").eq("user_id", userId).limit(1),
    admin.from("guardians").select("user_id").eq("user_id", userId).limit(1),
    admin.from("platform_admins").select("user_id").eq("user_id", userId).limit(1),
    admin.from("workspace_requests").select("user_id").eq("user_id", userId).limit(1),
  ]);
  if (membership.error || student.error || guardian.error || platformAdmin.error || workspaceRequest.error) {
    throw new Error("تعذر التحقق من ارتباطات الحساب");
  }
  return Boolean(
    membership.data.length || student.data.length || guardian.data.length || platformAdmin.data.length || workspaceRequest.data.length,
  );
}

function looksLikeLegacyInvitePlaceholder(user: User) {
  const invitationUrl = typeof user.user_metadata?.invitation_url === "string" ? user.user_metadata.invitation_url : "";
  const invitedTo = typeof user.user_metadata?.invited_to === "string" ? user.user_metadata.invited_to : "";
  return Boolean((invitationUrl || invitedTo) && !user.last_sign_in_at);
}

export async function getAuthAccountState(email: string): Promise<"missing" | "legacy-placeholder" | "registered"> {
  const user = await findAuthUserByEmail(email);
  if (!user) return "missing";
  if (looksLikeLegacyInvitePlaceholder(user) && !(await hasAppRelationships(user.id))) return "legacy-placeholder";
  return "registered";
}

export async function removeLegacyInvitePlaceholder(email: string) {
  const user = await findAuthUserByEmail(email);
  if (!user) return false;
  if (!looksLikeLegacyInvitePlaceholder(user)) return false;
  if (await hasAppRelationships(user.id)) return false;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error("تعذر تنظيف سجل الدعوة القديم");
  return true;
}

export async function getInvitationPreview(rawToken: string): Promise<InvitationPreview | null> {
  if (!rawToken || rawToken.length < 32) return null;
  const admin = createAdminClient();
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const { data, error } = await admin
    .from("invitations")
    .select("id,tenant_id,invitee_email,role,status,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw new Error("تعذر قراءة الدعوة");
  if (!data) return null;

  const expired = data.status === "pending" && new Date(data.expires_at).getTime() <= Date.now();
  const status = expired ? "expired" : data.status as InvitationPreview["status"];
  const accountState = status === "pending" ? await getAuthAccountState(data.invitee_email) : "missing";

  return {
    id: data.id,
    tenantId: data.tenant_id,
    email: data.invitee_email,
    role: data.role,
    status,
    expiresAt: data.expires_at,
    accountExists: accountState === "registered",
  };
}
