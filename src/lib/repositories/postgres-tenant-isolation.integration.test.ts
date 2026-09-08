import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCookieState } from "@/test/postgres/test-cookies";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { createBranch, createCohort, createGuardian, createStudent, createTenantWithOwner, createUser } from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import { getPostgresTeamWorkspaceData } from "@/lib/auth/postgres-team";
import { getParentPortalData, getStudentPortalData } from "@/lib/portal-data";
import { AuthorizationError, getTenantAuthorizationContext } from "@/lib/authorization/server";

const sql = testSqlExecutor();

beforeEach(() => {
  resetCookieState();
});

afterEach(async () => {
  await truncateAllTenantData();
});

async function loginAs(userId: string) {
  resetCookieState();
  await createPostgresSession(sql, userId);
}

async function seedTenantWithClassroom(name: string) {
  const { tenant, owner } = await createTenantWithOwner(sql, { tenantName: name });
  const branch = await createBranch(sql, tenant.id, `${name} Branch`);
  const teacher = await createUser(sql);
  await sql.query("insert into public.memberships (tenant_id, user_id, role, active) values ($1, $2, 'teacher', true)", [tenant.id, teacher.id]);
  const cohort = await createCohort(sql, tenant.id, branch.id, teacher.id, `${name} Cohort`);
  const student = await createStudent(sql, tenant.id, branch.id, { fullName: `${name} Student` });
  await sql.query("insert into public.enrollments (tenant_id, cohort_id, student_id) values ($1, $2, $3)", [tenant.id, cohort.id, student.id]);
  const guardian = await createGuardian(sql, tenant.id, { fullName: `${name} Guardian` });
  await sql.query("insert into public.student_guardians (tenant_id, student_id, guardian_id) values ($1, $2, $3)", [tenant.id, student.id, guardian.id]);

  const studentUser = await createUser(sql);
  await sql.query("update public.students set user_id = $1 where id = $2", [studentUser.id, student.id]);
  const guardianUser = await createUser(sql);
  await sql.query("update public.guardians set user_id = $1 where id = $2", [guardianUser.id, guardian.id]);

  const session = await sql.query<{ id: string }>(
    "insert into public.class_sessions (tenant_id, cohort_id, starts_at, created_by) values ($1, $2, now(), $3) returning id",
    [tenant.id, cohort.id, owner.id],
  );
  const sessionId = session.rows[0]!.id;
  await sql.query("insert into public.attendance (tenant_id, session_id, student_id, status, marked_by) values ($1, $2, $3, 'present', $4)", [
    tenant.id,
    sessionId,
    student.id,
    owner.id,
  ]);
  const invoice = await sql.query<{ id: string }>(
    "insert into public.invoices (tenant_id, student_id, title, amount) values ($1, $2, 'Tuition', 100) returning id",
    [tenant.id, student.id],
  );
  await sql.query("insert into public.payments (tenant_id, invoice_id, amount, received_by) values ($1, $2, 50, $3)", [
    tenant.id,
    invoice.rows[0]!.id,
    owner.id,
  ]);

  return { tenant, owner, branch, teacher, cohort, student, guardian, studentUser, guardianUser, sessionId };
}

describe("Cross-tenant schema isolation (composite foreign keys)", () => {
  it("rejects a staff profile whose membership belongs to a different tenant", async () => {
    const a = await seedTenantWithClassroom("Schema A");
    const b = await seedTenantWithClassroom("Schema B");
    await expect(
      sql.query("insert into public.staff_profiles (tenant_id, user_id, display_name) values ($1, $2, 'x')", [a.tenant.id, b.teacher.id]),
    ).rejects.toThrow();
  });

  it("rejects a student assigned to another tenant's branch", async () => {
    const a = await seedTenantWithClassroom("Schema C");
    const b = await seedTenantWithClassroom("Schema D");
    await expect(createStudent(sql, a.tenant.id, b.branch.id)).rejects.toThrow();
  });

  it("rejects a guardian link spanning two tenants", async () => {
    const a = await seedTenantWithClassroom("Schema E");
    const b = await seedTenantWithClassroom("Schema F");
    await expect(
      sql.query("insert into public.student_guardians (tenant_id, student_id, guardian_id) values ($1, $2, $3)", [a.tenant.id, a.student.id, b.guardian.id]),
    ).rejects.toThrow();
  });

  it("rejects a cohort assigned to another tenant's branch or teacher", async () => {
    const a = await seedTenantWithClassroom("Schema G");
    const b = await seedTenantWithClassroom("Schema H");
    await expect(createCohort(sql, a.tenant.id, b.branch.id, a.teacher.id)).rejects.toThrow();
    await expect(createCohort(sql, a.tenant.id, a.branch.id, b.teacher.id)).rejects.toThrow();
  });

  it("rejects an enrollment linking a student and cohort from different tenants", async () => {
    const a = await seedTenantWithClassroom("Schema I");
    const b = await seedTenantWithClassroom("Schema J");
    await expect(
      sql.query("insert into public.enrollments (tenant_id, cohort_id, student_id) values ($1, $2, $3)", [a.tenant.id, a.cohort.id, b.student.id]),
    ).rejects.toThrow();
  });

  it("rejects a class session under another tenant's cohort", async () => {
    const a = await seedTenantWithClassroom("Schema K");
    const b = await seedTenantWithClassroom("Schema L");
    await expect(
      sql.query("insert into public.class_sessions (tenant_id, cohort_id, starts_at, created_by) values ($1, $2, now(), $3)", [
        a.tenant.id,
        b.cohort.id,
        a.owner.id,
      ]),
    ).rejects.toThrow();
  });

  it("rejects attendance linking a student from one tenant to a session in another", async () => {
    const a = await seedTenantWithClassroom("Schema M");
    const b = await seedTenantWithClassroom("Schema N");
    await expect(
      sql.query("insert into public.attendance (tenant_id, session_id, student_id, status, marked_by) values ($1, $2, $3, 'present', $4)", [
        a.tenant.id,
        a.sessionId,
        b.student.id,
        a.owner.id,
      ]),
    ).rejects.toThrow();
  });

  it("rejects an invoice for a student belonging to another tenant", async () => {
    const a = await seedTenantWithClassroom("Schema O");
    const b = await seedTenantWithClassroom("Schema P");
    await expect(
      sql.query("insert into public.invoices (tenant_id, student_id, title, amount) values ($1, $2, 'x', 10)", [a.tenant.id, b.student.id]),
    ).rejects.toThrow();
  });

  it("rejects a payment for an invoice belonging to another tenant", async () => {
    const a = await seedTenantWithClassroom("Schema Q");
    const b = await seedTenantWithClassroom("Schema R");
    const bInvoice = await sql.query<{ id: string }>("select id from public.invoices where tenant_id = $1 limit 1", [b.tenant.id]);
    await expect(
      sql.query("insert into public.payments (tenant_id, invoice_id, amount, received_by) values ($1, $2, 10, $3)", [
        a.tenant.id,
        bInvoice.rows[0]!.id,
        a.owner.id,
      ]),
    ).rejects.toThrow();
  });

  it("rejects an audit log actor whose membership belongs to another tenant", async () => {
    const a = await seedTenantWithClassroom("Schema S");
    const b = await seedTenantWithClassroom("Schema T");
    await expect(
      sql.query("insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id) values ($1, $2, 'x', 'x', 'x')", [
        a.tenant.id,
        b.owner.id,
      ]),
    ).rejects.toThrow();
  });
});

describe("Cross-tenant application-path isolation (real repository code)", () => {
  it("team workspace data for one owner never includes another tenant's members or invitations", async () => {
    const a = await seedTenantWithClassroom("App A");
    const b = await seedTenantWithClassroom("App B");
    await loginAs(a.owner.id);
    const data = await getPostgresTeamWorkspaceData(sql);
    expect(data?.tenant.id).toBe(a.tenant.id);
    expect(data?.members.every((m) => m.user_id !== b.owner.id && m.user_id !== b.teacher.id)).toBe(true);
  });

  it("student portal data only ever resolves the logged-in student's own tenant record", async () => {
    const a = await seedTenantWithClassroom("Portal A");
    await seedTenantWithClassroom("Portal B");
    await loginAs(a.studentUser.id);
    const data = await getStudentPortalData();
    expect(data?.student.tenant_id).toBe(a.tenant.id);
    expect(data?.student.id).toBe(a.student.id);
  });

  it("guardian portal data never exposes a student outside the guardian's own tenant links", async () => {
    const a = await seedTenantWithClassroom("Portal C");
    const b = await seedTenantWithClassroom("Portal D");
    await loginAs(a.guardianUser.id);
    const data = await getParentPortalData();
    expect(data?.children.map((c) => c.id)).toEqual([a.student.id]);
    expect(data?.children.map((c) => c.id)).not.toContain(b.student.id);
    expect(data?.invoices.every((inv) => inv.student_id === a.student.id)).toBe(true);
    expect(data?.attendance.every((att) => att.student_id === a.student.id)).toBe(true);
  });

  it("a tenant member cannot obtain an authorization context for another tenant they don't belong to", async () => {
    const a = await seedTenantWithClassroom("App E");
    const b = await seedTenantWithClassroom("App F");
    await loginAs(a.owner.id);
    await expect(getTenantAuthorizationContext(b.tenant.id)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("a suspended tenant denies authorization context even to its own owner", async () => {
    const a = await seedTenantWithClassroom("App G");
    await sql.query("update public.tenants set status = 'suspended' where id = $1", [a.tenant.id]);
    await loginAs(a.owner.id);
    await expect(getTenantAuthorizationContext(a.tenant.id)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("an inactive membership denies authorization context for that tenant", async () => {
    const a = await seedTenantWithClassroom("App H");
    await sql.query("update public.memberships set active = false where tenant_id = $1 and user_id = $2", [a.tenant.id, a.teacher.id]);
    await loginAs(a.teacher.id);
    await expect(getTenantAuthorizationContext(a.tenant.id)).rejects.toBeInstanceOf(AuthorizationError);
  });
});
