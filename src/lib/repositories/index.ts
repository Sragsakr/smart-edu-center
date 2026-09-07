import "server-only";

import { SupabaseCurrentUserProvider } from "@/lib/auth/supabase-current-user-provider";
import { databaseConfig } from "@/lib/database/config";
import type { PlatformAdminRepository } from "@/lib/repositories/platform-admin-repository";
import { createPlatformAdminRepository } from "@/lib/repositories/platform-admin-repository-factory";

export const platformAdminRepository: PlatformAdminRepository =
  createPlatformAdminRepository({
    config: databaseConfig(),
    currentUserProvider: new SupabaseCurrentUserProvider(),
  });
