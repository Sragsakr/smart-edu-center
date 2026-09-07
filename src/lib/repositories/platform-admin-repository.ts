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

export interface PlatformAdminRepository {
  getCurrentPlatformAdmin(): Promise<RepositoryPlatformAdminUser | null>;
  getOverviewMetrics(): Promise<RepositoryOverviewMetrics>;
  listTenants(): Promise<RepositoryTenantRow[]>;
  listUsers(): Promise<RepositoryUserRow[]>;
}
