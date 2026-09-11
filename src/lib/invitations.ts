import "server-only";

import { applicationSql } from "@/lib/database/application-sql";
import { getPostgresInvitationPreview, type PostgresInvitationPreview } from "@/lib/auth/postgres-team";

export type InvitationPreview = PostgresInvitationPreview;

export async function getAuthAccountState(email: string): Promise<"missing" | "registered"> {
  const result = await applicationSql().query<{ id: string }>(
    "select id from public.app_users where lower(email) = lower($1) limit 1",
    [email.trim().toLowerCase()],
  );
  return result.rows[0] ? "registered" : "missing";
}

export async function getInvitationPreview(rawToken: string): Promise<InvitationPreview | null> {
  return getPostgresInvitationPreview(applicationSql(), rawToken);
}
