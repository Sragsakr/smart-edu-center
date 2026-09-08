import "server-only";

import type { CurrentUserProvider } from "@/lib/auth/current-user-provider";
import { getPostgresCurrentUser } from "@/lib/auth/postgres-auth";
import type { SqlExecutor } from "@/lib/database/sql-executor";

export class PostgresCurrentUserProvider implements CurrentUserProvider {
  constructor(private readonly sql: SqlExecutor) {}

  getCurrentUser() {
    return getPostgresCurrentUser(this.sql);
  }
}
