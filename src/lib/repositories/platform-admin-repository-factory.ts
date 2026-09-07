import "server-only";

import type { CurrentUserProvider } from "@/lib/auth/current-user-provider";
import type { DatabaseConfig } from "@/lib/database/config";
import type { SqlExecutor } from "@/lib/database/sql-executor";
import type { PlatformAdminRepository } from "@/lib/repositories/platform-admin-repository";
import { PostgresPlatformAdminRepository } from "@/lib/repositories/postgres-platform-admin-repository";
import { SupabasePlatformAdminRepository } from "@/lib/repositories/supabase-platform-admin-repository";

export type PlatformAdminRepositoryFactoryDependencies = {
  config: DatabaseConfig;
  currentUserProvider: CurrentUserProvider;
  sqlExecutor?: SqlExecutor;
};

export function createPlatformAdminRepository(
  dependencies: PlatformAdminRepositoryFactoryDependencies,
): PlatformAdminRepository {
  const { config, currentUserProvider, sqlExecutor } = dependencies;

  if (config.backend === "postgres") {
    if (!sqlExecutor) {
      throw new Error(
        "DATA_BACKEND=postgres requires a configured SqlExecutor. PostgreSQL cutover is not complete yet.",
      );
    }

    return new PostgresPlatformAdminRepository(sqlExecutor, currentUserProvider);
  }

  return new SupabasePlatformAdminRepository(currentUserProvider);
}
