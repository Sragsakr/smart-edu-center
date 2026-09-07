import "server-only";

import { createHash } from "node:crypto";
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

async function authAccountExists(email: string) {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("تعذر التحقق من حساب المستخدم");
    if (data.users.some((user) => user.email?.toLowerCase() === normalized)) return true;
    if (data.users.length < perPage) return false;
  }
  return false;
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
  const accountExists = status === "pending" ? await authAccountExists(data.invitee_email) : false;

  return {
    id: data.id,
    tenantId: data.tenant_id,
    email: data.invitee_email,
    role: data.role,
    status,
    expiresAt: data.expires_at,
    accountExists,
  };
}
