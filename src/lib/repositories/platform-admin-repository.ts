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

export interface PlatformAdminRepository {
  getCurrentPlatformAdmin(): Promise<RepositoryPlatformAdminUser | null>;
  getOverviewMetrics(): Promise<RepositoryOverviewMetrics>;
}
