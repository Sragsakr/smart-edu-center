import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, type MemberRole } from "@/lib/authorization/policy";

export type { MemberRole } from "@/lib/authorization/policy";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type TeamWorkspaceData = {
  currentUserId: string;
  tenant: { id: string; name: string };
  manageable: boolean;
  workspaces: Array<{ tenant_id: string; role: MemberRole; tenant_name: string }>;
  members: Array<{ user_id: string; role: MemberRole; active: boolean; created_at: string; email: string }>;
  invitations: Array<{ id: string; invitee_email: string; role: MemberRole; status: InvitationStatus; expires_at: string; last_sent_at: string; created_at: string }>;
};

export async function getTeamWorkspaceData(requestedTenantId?: string): Promise<TeamWorkspaceData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("tenant_id,role,active")
    .eq("user_id", user.id)
    .eq("active", true);
  if (membershipsError) throw new Error("تعذر تحميل مساحات العمل");
  if (!memberships?.length) return null;

  const tenantIds = memberships.map((row) => row.tenant_id);
  const { data: tenants, error: tenantsError } = await supabase.from("tenants").select("id,name").in("id", tenantIds);
  if (tenantsError) throw new Error("تعذر تحميل بيانات مساحات العمل");

  const nameByTenant = new Map((tenants ?? []).map((tenant) => [tenant.id, tenant.name]));
  const workspaces = memberships.map((membership) => ({
    tenant_id: membership.tenant_id,
    role: membership.role as MemberRole,
    tenant_name: nameByTenant.get(membership.tenant_id) ?? "مساحة عمل",
  }));
  const chosen = workspaces.find((workspace) => workspace.tenant_id === requestedTenantId) ?? workspaces[0];
  const manageable = can(chosen.role, "team.manage");

  const { data: memberRows, error: memberError } = await supabase
    .from("memberships")
    .select("user_id,role,active,created_at")
    .eq("tenant_id", chosen.tenant_id)
    .order("created_at", { ascending: true });
  if (memberError) throw new Error("تعذر تحميل أعضاء الفريق");

  const admin = createAdminClient();
  const members = await Promise.all((memberRows ?? []).map(async (row) => {
    const { data } = await admin.auth.admin.getUserById(row.user_id);
    return {
      user_id: row.user_id,
      role: row.role as MemberRole,
      active: row.active,
      created_at: row.created_at,
      email: data.user?.email ?? "بريد غير متاح",
    };
  }));

  let invitations: TeamWorkspaceData["invitations"] = [];
  if (manageable) {
    const now = new Date().toISOString();
    const { error: expiryError } = await supabase
      .from("invitations")
      .update({ status: "expired", updated_at: now })
      .eq("tenant_id", chosen.tenant_id)
      .eq("status", "pending")
      .lt("expires_at", now);
    if (expiryError) throw new Error("تعذر تحديث حالة الدعوات المنتهية");

    const { data, error } = await supabase
      .from("invitations")
      .select("id,invitee_email,role,status,expires_at,last_sent_at,created_at")
      .eq("tenant_id", chosen.tenant_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error("تعذر تحميل الدعوات");
    invitations = (data ?? []).map((row) => ({ ...row, role: row.role as MemberRole, status: row.status as InvitationStatus }));
  }

  return {
    currentUserId: user.id,
    tenant: { id: chosen.tenant_id, name: chosen.tenant_name },
    manageable,
    workspaces,
    members,
    invitations,
  };
}
