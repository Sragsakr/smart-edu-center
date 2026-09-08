import "server-only";

import type { DatabaseConfig } from "@/lib/database/config";
import { hashPassword } from "../auth/password";
import type { TransactionalSqlExecutor } from "@/lib/database/sql-executor";

const LOOPBACK_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export type LocalBootstrapRuntime = {
  nodeEnv: string | undefined;
  database: DatabaseConfig;
};

export type LocalPlatformAdminBootstrapDependencies = {
  runtime: LocalBootstrapRuntime;
  sql: TransactionalSqlExecutor;
  email: string;
  password: string;
};

export function isLocalDevelopmentBootstrapAvailable(runtime: LocalBootstrapRuntime): boolean {
  if (runtime.nodeEnv !== "development") return false;
  if (runtime.database.backend !== "postgres" || !runtime.database.databaseUrl) return false;

  try {
    return LOOPBACK_DATABASE_HOSTS.has(new URL(runtime.database.databaseUrl).hostname);
  } catch {
    return false;
  }
}

export function assertLocalDevelopmentBootstrapAvailable(runtime: LocalBootstrapRuntime): void {
  if (!isLocalDevelopmentBootstrapAvailable(runtime)) {
    throw new Error("Local platform-admin bootstrap is unavailable in this environment");
  }
}

export async function bootstrapLocalPlatformAdmin({
  runtime,
  sql,
  email,
  password,
}: LocalPlatformAdminBootstrapDependencies): Promise<{ userId: string; email: string }> {
  assertLocalDevelopmentBootstrapAvailable(runtime);
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email is required");
  const passwordDigest = await hashPassword(password);

  return sql.transaction(async (transaction) => {
    const userResult = await transaction.query<{ id: string; email: string }>(
      `insert into public.app_users (id, email, active)
       values (gen_random_uuid(), $1, true)
       on conflict (email) do update
         set active = true,
             updated_at = now()
       returning id, email`,
      [normalizedEmail],
    );
    const user = userResult.rows[0];
    if (!user) throw new Error("Local Platform Admin user creation failed");

    await transaction.query(
      `insert into public.auth_password_credentials (user_id, password_digest)
       values ($1, $2)
       on conflict (user_id) do update
         set password_digest = excluded.password_digest,
             password_changed_at = now()`,
      [user.id, passwordDigest],
    );
    await transaction.query(
      `insert into public.platform_admins (user_id)
       values ($1)
       on conflict (user_id) do nothing`,
      [user.id],
    );
    return { userId: user.id, email: user.email };
  });
}
