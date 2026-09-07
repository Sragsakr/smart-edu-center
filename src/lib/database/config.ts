import "server-only";

import { privateEnv } from "@/lib/server-env";

export type DataBackend = "supabase" | "postgres";

export type DatabaseConfig = {
  backend: DataBackend;
  databaseUrl: string | null;
};

export function databaseConfig(): DatabaseConfig {
  const env = privateEnv();
  return {
    backend: env.DATA_BACKEND,
    databaseUrl: env.DATABASE_URL ?? null,
  };
}
