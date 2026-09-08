import "server-only";

import { privateEnv } from "@/lib/server-env";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";

export function applicationSql() {
  return postgresSqlExecutor(privateEnv().DATABASE_URL);
}
