import "server-only";

import { getPostgresAccountAccess, getPostgresCurrentUser } from "./postgres-auth";
import { applicationSql } from "@/lib/database/application-sql";
import type { TransactionalSqlExecutor } from "@/lib/database/sql-executor";

export async function requirePostgresPlatformAdmin(): Promise<{
  sql: TransactionalSqlExecutor;
  user: { id: string; email: string };
}> {
  const sql = applicationSql();
  const user = await getPostgresCurrentUser(sql);
  if (!user) throw new Error("Unauthenticated");
  if (!(await getPostgresAccountAccess(sql, user.id)).isPlatformAdmin) {
    throw new Error("Forbidden");
  }
  return { sql, user };
}
