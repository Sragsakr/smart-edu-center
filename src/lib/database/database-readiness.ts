import "server-only";

import type { SqlExecutor } from "@/lib/database/sql-executor";

const REQUIRED_RELATIONS = [
  "public.app_users",
  "public.tenants",
  "public.memberships",
  "public.invitations",
  "public.staff_profiles",
  "public.branches",
  "public.students",
  "public.guardians",
  "public.student_guardians",
  "public.cohorts",
  "public.enrollments",
  "public.class_sessions",
  "public.attendance",
  "public.invoices",
  "public.payments",
  "public.audit_logs",
  "public.platform_admins",
  "public.workspace_requests",
  "public.platform_audit_logs",
  "public.password_reset_requests",
  "public.auth_password_credentials",
  "public.auth_sessions",
] as const;

export async function isDatabaseReady(sql: SqlExecutor): Promise<boolean> {
  const readinessQuery = await sql.query<{ ready: boolean }>(
    `select not exists (
       select 1
       from unnest($1::text[]) as required(relation_name)
       where to_regclass(required.relation_name) is null
     ) as ready`,
    [REQUIRED_RELATIONS],
  );

  return readinessQuery.rows[0]!.ready;
}
