import "server-only";

import { privateEnv } from "@/lib/server-env";

export type DatabaseConfig = {
  backend: "postgres";
  databaseUrl: string;
};

export function databaseConfig(): DatabaseConfig {
  const env = privateEnv();
  return { backend: "postgres", databaseUrl: env.DATABASE_URL };
}
