import "server-only";

import { getPostgresTeamWorkspaceData } from "@/lib/auth/postgres-team";
import type { CapabilityReport } from "@/lib/authorization/access-contract";
import type { MemberRole } from "@/lib/authorization/policy";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type { MemberRole } from "@/lib/authorization/policy";

export type TeamWorkspaceData = {
  currentUserId: string;
  tenant: { id: string; name: string };
  role: MemberRole;
  /**
   * تقرير القدرات المعروض: يشمل الاستحقاق والدور معًا، ويحمل سبب الرفض.
   * للعرض والتعطيل فقط — الخادم يعيد الفحص عند كل إجراء.
   */
  capabilities: CapabilityReport;
  workspaces: Array<{ tenant_id: string; role: MemberRole; tenant_name: string }>;
  members: Array<{ user_id: string; role: MemberRole; active: boolean; created_at: string; email: string }>;
  invitations: Array<{ id: string; invitee_email: string; role: MemberRole; status: InvitationStatus; expires_at: string; last_sent_at: string; created_at: string }>;
};

export async function getTeamWorkspaceData(requestedTenantId?: string): Promise<TeamWorkspaceData | null> {
  return getPostgresTeamWorkspaceData(requestedTenantId);
}
