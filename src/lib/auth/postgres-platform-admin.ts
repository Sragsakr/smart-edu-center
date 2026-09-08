import "server-only";

import { getPostgresAccountAccess, getPostgresCurrentUser } from "./postgres-auth";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import type { TransactionalSqlExecutor } from "@/lib/database/sql-executor";

export async function requirePostgresPlatformAdmin(): Promise<{
  sql: TransactionalSqlExecutor;
  user: { id: string; email: string };
}> {
  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) {
    throw new Error("Platform administration requires the PostgreSQL application backend");
  }
  const sql = postgresSqlExecutor(config.databaseUrl);
  const user = await getPostgresCurrentUser(sql);
  if (!user) throw new Error("Unauthenticated");
  if (!(await getPostgresAccountAccess(sql, user.id)).isPlatformAdmin) {
    throw new Error("Forbidden");
  }
  return { sql, user };
}
