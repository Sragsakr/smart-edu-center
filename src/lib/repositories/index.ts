import "server-only";

import type { PlatformAdminRepository } from "@/lib/repositories/platform-admin-repository";
import { SupabasePlatformAdminRepository } from "@/lib/repositories/supabase-platform-admin-repository";

export const platformAdminRepository: PlatformAdminRepository =
  new SupabasePlatformAdminRepository();
