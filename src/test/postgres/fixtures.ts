import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import type { TransactionalSqlExecutor } from "@/lib/database/sql-executor";
import type { MemberRole } from "@/lib/authorization/policy";

const TEST_PASSWORD = "IntegrationTest.123";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.test`;
}

export function uniqueSlug(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export async function createUser(
  sql: TransactionalSqlExecutor,
  overrides: { email?: string; active?: boolean; password?: string } = {},
): Promise<{ id: string; email: string }> {
  const email = overrides.email ?? uniqueEmail("user");
  const active = overrides.active ?? true;
  const result = await sql.query<{ id: string; email: string }>(
    `insert into public.app_users (id, email, active) values (gen_random_uuid(), $1, $2) returning id, email`,
    [email, active],
  );
  const user = result.rows[0];
  if (!user) throw new Error("fixture: user creation failed");
  const passwordDigest = await hashPassword(overrides.password ?? TEST_PASSWORD);
  await sql.query(
    `insert into public.auth_password_credentials (user_id, password_digest) values ($1, $2)`,
    [user.id, passwordDigest],
  );
  return user;
}

export async function createTenant(
  sql: TransactionalSqlExecutor,
  ownerId: string,
  overrides: { name?: string; slug?: string; accountType?: "center" | "independent_teacher" } = {},
): Promise<{ id: string; name: string; slug: string }> {
  const name = overrides.name ?? `Test Tenant ${randomUUID().slice(0, 6)}`;
  const slug = overrides.slug ?? uniqueSlug("tenant");
  const result = await sql.query<{ id: string; name: string; slug: string }>(
    `insert into public.tenants (name, slug, account_type, status, created_by)
     values ($1, $2, $3, 'active', $4)
     returning id, name, slug::text as slug`,
    [name, slug, overrides.accountType ?? "center", ownerId],
  );
  const tenant = result.rows[0];
  if (!tenant) throw new Error("fixture: tenant creation failed");
  return tenant;
}

export async function addMembership(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  userId: string,
  role: MemberRole,
  active = true,
): Promise<void> {
  await sql.query(
    `insert into public.memberships (tenant_id, user_id, role, active) values ($1, $2, $3, $4)`,
    [tenantId, userId, role, active],
  );
}

export type TenantFixture = {
  tenant: { id: string; name: string; slug: string };
  owner: { id: string; email: string };
};

export async function createTenantWithOwner(
  sql: TransactionalSqlExecutor,
  overrides: { tenantName?: string; slug?: string } = {},
): Promise<TenantFixture> {
  const owner = await createUser(sql);
  const tenant = await createTenant(sql, owner.id, { name: overrides.tenantName, slug: overrides.slug });
  await addMembership(sql, tenant.id, owner.id, "owner");
  return { tenant, owner };
}

export async function createBranch(sql: TransactionalSqlExecutor, tenantId: string, name = "Main Branch") {
  const result = await sql.query<{ id: string }>(
    `insert into public.branches (tenant_id, name) values ($1, $2) returning id`,
    [tenantId, name],
  );
  const branch = result.rows[0];
  if (!branch) throw new Error("fixture: branch creation failed");
  return branch;
}

export async function createStudent(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  branchId: string,
  overrides: { code?: string; fullName?: string } = {},
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.students (tenant_id, branch_id, code, full_name)
     values ($1, $2, $3, $4) returning id`,
    [tenantId, branchId, overrides.code ?? `S-${randomUUID().slice(0, 8)}`, overrides.fullName ?? "Test Student"],
  );
  const student = result.rows[0];
  if (!student) throw new Error("fixture: student creation failed");
  return student;
}

export async function createGuardian(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  overrides: { fullName?: string; phone?: string } = {},
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.guardians (tenant_id, full_name, phone) values ($1, $2, $3) returning id`,
    [tenantId, overrides.fullName ?? "Test Guardian", overrides.phone ?? "+201000000000"],
  );
  const guardian = result.rows[0];
  if (!guardian) throw new Error("fixture: guardian creation failed");
  return guardian;
}

export async function createCohort(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  branchId: string,
  teacherUserId: string,
  name = "Test Cohort",
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.cohorts (tenant_id, branch_id, teacher_user_id, name) values ($1, $2, $3, $4) returning id`,
    [tenantId, branchId, teacherUserId, name],
  );
  const cohort = result.rows[0];
  if (!cohort) throw new Error("fixture: cohort creation failed");
  return cohort;
}

export async function makePlatformAdmin(sql: TransactionalSqlExecutor, userId: string): Promise<void> {
  await sql.query(`insert into public.platform_admins (user_id) values ($1)`, [userId]);
}

export { TEST_PASSWORD };
