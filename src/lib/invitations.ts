import "server-only";

import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import { getPostgresInvitationPreview, type PostgresInvitationPreview } from "@/lib/auth/postgres-team";

export type InvitationPreview = PostgresInvitationPreview;

function postgresSql() {
  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) {
    throw new Error("Invitation management requires the PostgreSQL application backend");
  }
  return postgresSqlExecutor(config.databaseUrl);
}

export async function getAuthAccountState(email: string): Promise<"missing" | "registered"> {
  const result = await postgresSql().query<{ id: string }>(
    "select id from public.app_users where lower(email) = lower($1) limit 1",
    [email.trim().toLowerCase()],
  );
  return result.rows[0] ? "registered" : "missing";
}

export async function getInvitationPreview(rawToken: string): Promise<InvitationPreview | null> {
  return getPostgresInvitationPreview(postgresSql(), rawToken);
}
