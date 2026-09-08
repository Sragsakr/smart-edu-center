import "server-only";

import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import { getPostgresTeamWorkspaceData } from "@/lib/auth/postgres-team";
import type { CapabilityMap, MemberRole } from "@/lib/authorization/policy";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type { MemberRole } from "@/lib/authorization/policy";

export type TeamWorkspaceData = {
  currentUserId: string;
  tenant: { id: string; name: string };
  role: MemberRole;
  capabilities: CapabilityMap;
  workspaces: Array<{ tenant_id: string; role: MemberRole; tenant_name: string }>;
  members: Array<{ user_id: string; role: MemberRole; active: boolean; created_at: string; email: string }>;
  invitations: Array<{ id: string; invitee_email: string; role: MemberRole; status: InvitationStatus; expires_at: string; last_sent_at: string; created_at: string }>;
};

export async function getTeamWorkspaceData(requestedTenantId?: string): Promise<TeamWorkspaceData | null> {
  const config = databaseConfig();
  if (config.backend !== "postgres") {
    throw new Error("Team management requires the PostgreSQL application backend");
  }
  if (!config.databaseUrl) throw new Error("PostgreSQL database URL is required");
  return getPostgresTeamWorkspaceData(postgresSqlExecutor(config.databaseUrl), requestedTenantId);
}
