import "server-only";

import { SupabaseCurrentUserProvider } from "@/lib/auth/supabase-current-user-provider";
import { databaseConfig } from "@/lib/database/config";
import type { PlatformAdminRepository } from "@/lib/repositories/platform-admin-repository";
import { createPlatformAdminRepository } from "@/lib/repositories/platform-admin-repository-factory";

function resolvePlatformAdminRepository(): PlatformAdminRepository {
  return createPlatformAdminRepository({
    config: databaseConfig(),
    currentUserProvider: new SupabaseCurrentUserProvider(),
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
