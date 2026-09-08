import "server-only";

import { PostgresCurrentUserProvider } from "@/lib/auth/postgres-current-user-provider";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import type { PlatformAdminRepository } from "@/lib/repositories/platform-admin-repository";
import { PostgresPlatformAdminRepository } from "@/lib/repositories/postgres-platform-admin-repository";

function resolvePlatformAdminRepository(): PlatformAdminRepository {
  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) {
    throw new Error("Platform Admin repository requires the PostgreSQL application backend");
  }
  const sql = postgresSqlExecutor(config.databaseUrl);
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
