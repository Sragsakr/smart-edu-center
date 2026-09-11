import { Pool } from "pg";
import { assertSafeTestDatabase } from "../../../postgres/scripts/reset-test-database.mjs";
import { PostgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import type { TransactionalSqlExecutor } from "@/lib/database/sql-executor";

const TENANT_SCOPED_TABLES = [
  "public.payments",
  "public.invoices",
  "public.attendance",
  "public.class_sessions",
  "public.enrollments",
  "public.cohorts",
  "public.student_guardians",
  "public.guardians",
  "public.students",
  "public.branches",
  "public.staff_profiles",
  "public.audit_logs",
  "public.invitations",
  "public.tenant_entitlements",
  "public.tenant_branding",
  "public.tenant_domains",
  "public.memberships",
  "public.tenants",
  "public.workspace_requests",
  "public.password_reset_requests",
  "public.platform_audit_logs",
  "public.auth_sessions",
  "public.auth_password_credentials",
  "public.platform_admins",
  "public.app_users",
] as const;

let pool: Pool | null = null;

function testDatabaseUrl(): string {
  // The DATABASE_URL vs TEST_DATABASE_URL cross-check already ran once in
  // src/test/postgres/setup-server-only.ts before it intentionally overrode
  // process.env.DATABASE_URL to match TEST_DATABASE_URL for this process, so
  // re-comparing them here would always (and incorrectly) trip the guard.
  const { url } = assertSafeTestDatabase({
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    checkAgainstDevelopmentUrl: false,
  });
  return url;
}

export function testSqlExecutor(): TransactionalSqlExecutor {
  if (!pool) pool = new Pool({ connectionString: testDatabaseUrl() });
  return new PostgresSqlExecutor(pool);
}

export async function truncateAllTenantData(): Promise<void> {
  const sql = testSqlExecutor();
  await sql.query(`truncate table ${TENANT_SCOPED_TABLES.join(", ")} restart identity cascade`);
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
