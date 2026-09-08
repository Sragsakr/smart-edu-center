import "server-only";

import { PostgresCurrentUserProvider } from "@/lib/auth/postgres-current-user-provider";
import { applicationSql } from "@/lib/database/application-sql";
import type { PlatformAdminRepository } from "@/lib/repositories/platform-admin-repository";
import { PostgresPlatformAdminRepository } from "@/lib/repositories/postgres-platform-admin-repository";

function resolvePlatformAdminRepository(): PlatformAdminRepository {
  const sql = applicationSql();
  return new PostgresPlatformAdminRepository(sql, new PostgresCurrentUserProvider(sql));
}

export const platformAdminRepository: PlatformAdminRepository = {
  getCurrentPlatformAdminAccess: () => resolvePlatformAdminRepository().getCurrentPlatformAdminAccess(),
  getOverviewMetrics: () => resolvePlatformAdminRepository().getOverviewMetrics(),
  listTenants: () => resolvePlatformAdminRepository().listTenants(),
  listUsers: () => resolvePlatformAdminRepository().listUsers(),
  getPlatformReport: () => resolvePlatformAdminRepository().getPlatformReport(),
  listPlatformAudit: (limit) => resolvePlatformAdminRepository().listPlatformAudit(limit),
};
