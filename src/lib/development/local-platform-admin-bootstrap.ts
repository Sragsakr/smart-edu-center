import "server-only";

import type { CurrentUserProvider } from "@/lib/auth/current-user-provider";
import type { DatabaseConfig } from "@/lib/database/config";
import type { TransactionalSqlExecutor } from "@/lib/database/sql-executor";

const LOOPBACK_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const UPSERT_CURRENT_USER_SQL = `
  insert into public.users (id, email)
  values ($1, $2)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now()
`;

const GRANT_PLATFORM_ADMIN_SQL = `
  insert into public.platform_admins (user_id)
  values ($1)
  on conflict (user_id) do nothing
`;

export type LocalBootstrapRuntime = {
  nodeEnv: string | undefined;
  database: DatabaseConfig;
};

export type LocalPlatformAdminBootstrapDependencies = {
  runtime: LocalBootstrapRuntime;
  currentUserProvider: CurrentUserProvider;
  sql: TransactionalSqlExecutor;
};

export function isLocalDevelopmentBootstrapAvailable(
  runtime: LocalBootstrapRuntime,
): boolean {
  if (runtime.nodeEnv !== "development") return false;
  if (runtime.database.backend !== "postgres") return false;
  if (!runtime.database.databaseUrl) return false;

  try {
    return LOOPBACK_DATABASE_HOSTS.has(new URL(runtime.database.databaseUrl).hostname);
  } catch {
    return false;
  }
}

export function assertLocalDevelopmentBootstrapAvailable(
  runtime: LocalBootstrapRuntime,
): void {
  if (!isLocalDevelopmentBootstrapAvailable(runtime)) {
    throw new Error("Local platform-admin bootstrap is unavailable in this environment");
  }
}

export async function bootstrapCurrentLocalPlatformAdmin({
  runtime,
  currentUserProvider,
  sql,
}: LocalPlatformAdminBootstrapDependencies): Promise<void> {
  assertLocalDevelopmentBootstrapAvailable(runtime);

  const user = await currentUserProvider.getCurrentUser();
  if (!user) throw new Error("Authentication is required for local bootstrap");

  const email = user.email.trim();
  if (!email) throw new Error("The authenticated user must have an email address");

  await sql.transaction(async (transaction) => {
    await transaction.query(UPSERT_CURRENT_USER_SQL, [user.id, email]);
    await transaction.query(GRANT_PLATFORM_ADMIN_SQL, [user.id]);
  });
}
