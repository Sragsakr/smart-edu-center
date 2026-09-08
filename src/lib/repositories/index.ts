import "server-only";

import { SupabaseCurrentUserProvider } from "@/lib/auth/supabase-current-user-provider";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import type { PlatformAdminRepository } from "@/lib/repositories/platform-admin-repository";
import { createPlatformAdminRepository } from "@/lib/repositories/platform-admin-repository-factory";

function resolvePlatformAdminRepository(): PlatformAdminRepository {
  const config = databaseConfig();

  return createPlatformAdminRepository({
    config,
    currentUserProvider: new SupabaseCurrentUserProvider(),
    sqlExecutor:
      config.backend === "postgres" && config.databaseUrl
        ? postgresSqlExecutor(config.databaseUrl)
        : undefined,
  });
}

export const platformAdminRepository: PlatformAdminRepository = {
  getCurrentPlatformAdminAccess: () =>
    resolvePlatformAdminRepository().getCurrentPlatformAdminAccess(),
  getOverviewMetrics: () =>
    resolvePlatformAdminRepository().getOverviewMetrics(),
  listTenants: () =>
    resolvePlatformAdminRepository().listTenants(),
  listUsers: () =>
    resolvePlatformAdminRepository().listUsers(),
  getPlatformReport: () =>
    resolvePlatformAdminRepository().getPlatformReport(),
  listPlatformAudit: (limit) =>
    resolvePlatformAdminRepository().listPlatformAudit(limit),
};
