import "server-only";

export type RepositoryPlatformAdminUser = {
  id: string;
  email: string;
};

export type RepositoryOverviewMetrics = {
  centers: number;
  independentTeachers: number;
  totalTenants: number;
  students: number;
  memberships: number;
  pendingWorkspaceRequests: number;
  pendingPasswordResets: number;
  auditLogEntries: number;
};

export type RepositoryTenantRow = {
  id: string;
  name: string;
  slug: string;
  account_type: string;
  created_by: string;
  created_at: string;
  status: "active" | "suspended";
  studentCount: number;
  memberCount: number;
};

export type RepositoryUserRow = {
  id: string;
  email: string;
  created_at: string;
  memberships: { tenant_id: string; role: string; active: boolean }[];
};

export type RepositoryPlatformReport = {
  tenantByType: { label: string; value: number }[];
  requestsByStatus: { label: string; value: number }[];
  membershipsByRole: { label: string; value: number }[];
  activeStudents: number;
  inactiveStudents: number;
};

export type RepositoryAuditTenant = {
  id: string;
  name: string;
  slug: string | null;
  accountType: string | null;
  source: "tenant" | "workspace_request" | "platform";
};

export type RepositoryAuditRow = {
  id: number;
  actor_user_id: string | null;
  actorEmail: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  tenant: RepositoryAuditTenant;
};

export interface PlatformAdminRepository {
  getCurrentPlatformAdmin(): Promise<RepositoryPlatformAdminUser | null>;
  getOverviewMetrics(): Promise<RepositoryOverviewMetrics>;
  listTenants(): Promise<RepositoryTenantRow[]>;
  listUsers(): Promise<RepositoryUserRow[]>;
  getPlatformReport(): Promise<RepositoryPlatformReport>;
  listPlatformAudit(limit?: number): Promise<RepositoryAuditRow[]>;
}
