import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCookieState } from "@/test/postgres/test-cookies";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import {
  assignCourseTeacher,
  createBranch,
  createCohort,
  createCourse,
  createCourseOffering,
  createGrade,
  createGuardian,
  createRoom,
  createStage,
  createStudent,
  createSubject,
  createTeacher,
  createTenantWithOwner,
  createUser,
  grantEntitlements,
} from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import type { ProductLevel } from "@/lib/tenant/product-level";
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

async function seedTenantWithClassroom(name: string, productLevel: ProductLevel = "management_platform") {
  const { tenant, owner } = await createTenantWithOwner(sql, { tenantName: name });
  // بوابتا الطالب وولي الأمر مقيّدتان بالاستحقاق، فالبيانات الافتراضية تمنح مستوى الإدارة.
  await grantEntitlements(sql, tenant.id, productLevel);
  const branch = await createBranch(sql, tenant.id, `${name} Branch`);
  const room = await createRoom(sql, tenant.id, branch.id, `${name} Room`);
  const teacherUser = await createUser(sql);
  await sql.query("insert into public.memberships (tenant_id, user_id, role, active) values ($1, $2, 'teacher', true)", [tenant.id, teacherUser.id]);

  // الكتالوج الأكاديمي: مرحلة ← صف ← مادة ← مقرر ← إسناد مدرس ← عرض قابل للبيع ← مجموعة تسليم
  const stage = await createStage(sql, tenant.id, `${name} Stage`);
  const grade = await createGrade(sql, tenant.id, stage.id, `${name} Grade`);
  const subject = await createSubject(sql, tenant.id, `${name} Subject`);
  const teacher = await createTeacher(sql, tenant.id, {
    displayName: `${name} Teacher`,
    membershipUserId: teacherUser.id,
  });
  const course = await createCourse(sql, tenant.id, grade.id, subject.id, `${name} Course`);
  await assignCourseTeacher(sql, tenant.id, course.id, teacher.id);
  const offering = await createCourseOffering(sql, tenant.id, course.id, teacher.id, {
    branchId: branch.id,
    roomId: room.id,
    priceAmount: "500.00",
  });
  const cohort = await createCohort(sql, tenant.id, offering.id, {
    branchId: branch.id,
    roomId: room.id,
    name: `${name} Cohort`,
  });
  const student = await createStudent(sql, tenant.id, branch.id, {
    fullName: `${name} Student`,
    gradeId: grade.id,
  });
  await sql.query("insert into public.enrollments (tenant_id, course_offering_id, student_id) values ($1, $2, $3)", [tenant.id, offering.id, student.id]);
  await sql.query("insert into public.cohort_members (tenant_id, cohort_id, student_id) values ($1, $2, $3)", [tenant.id, cohort.id, student.id]);
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

  return {
    tenant,
    owner,
    branch,
    room,
    stage,
    grade,
    subject,
    teacherUser,
    teacher,
    course,
    offering,
    cohort,
    student,
    guardian,
    studentUser,
    guardianUser,
    sessionId,
  };
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

  it("rejects a cohort assigned to another tenant's branch", async () => {
    const a = await seedTenantWithClassroom("Schema G");
    const b = await seedTenantWithClassroom("Schema H");
    await expect(createCohort(sql, a.tenant.id, a.offering.id, { branchId: b.branch.id })).rejects.toThrow();
  });

  it("rejects a cohort linked to another tenant's course offering", async () => {
    const a = await seedTenantWithClassroom("Schema G2");
    const b = await seedTenantWithClassroom("Schema H2");
    await expect(createCohort(sql, a.tenant.id, b.offering.id)).rejects.toThrow();
  });

  it("rejects an enrollment linking a student and offering from different tenants", async () => {
    const a = await seedTenantWithClassroom("Schema I");
    const b = await seedTenantWithClassroom("Schema J");
    await expect(
      sql.query("insert into public.enrollments (tenant_id, course_offering_id, student_id) values ($1, $2, $3)", [a.tenant.id, a.offering.id, b.student.id]),
    ).rejects.toThrow();
  });

  it("rejects a cohort member linking a student and cohort from different tenants", async () => {
    const a = await seedTenantWithClassroom("Schema I2");
    const b = await seedTenantWithClassroom("Schema J2");
    await expect(
      sql.query("insert into public.cohort_members (tenant_id, cohort_id, student_id) values ($1, $2, $3)", [a.tenant.id, a.cohort.id, b.student.id]),
    ).rejects.toThrow();
  });

  it("rejects a course built from another tenant's subject or grade", async () => {
    const a = await seedTenantWithClassroom("Schema I3");
    const b = await seedTenantWithClassroom("Schema J3");
    await expect(createCourse(sql, a.tenant.id, b.grade.id, a.subject.id)).rejects.toThrow();
    await expect(createCourse(sql, a.tenant.id, a.grade.id, b.subject.id)).rejects.toThrow();
  });

  it("rejects a grade attached to another tenant's stage", async () => {
    const a = await seedTenantWithClassroom("Schema I4");
    const b = await seedTenantWithClassroom("Schema J4");
    await expect(createGrade(sql, a.tenant.id, b.stage.id)).rejects.toThrow();
  });

  it("rejects a room attached to another tenant's branch", async () => {
    const a = await seedTenantWithClassroom("Schema I5");
    const b = await seedTenantWithClassroom("Schema J5");
    await expect(createRoom(sql, a.tenant.id, b.branch.id)).rejects.toThrow();
  });

  it("rejects a student assigned to another tenant's grade", async () => {
    const a = await seedTenantWithClassroom("Schema I6");
    const b = await seedTenantWithClassroom("Schema J6");
    await expect(createStudent(sql, a.tenant.id, a.branch.id, { gradeId: b.grade.id })).rejects.toThrow();
  });

  it("rejects a teacher record linked to another tenant's membership", async () => {
    const a = await seedTenantWithClassroom("Schema I7");
    const b = await seedTenantWithClassroom("Schema J7");
    await expect(
      createTeacher(sql, a.tenant.id, { membershipUserId: b.teacherUser.id }),
    ).rejects.toThrow();
  });

  it("rejects a course-teacher link that crosses tenants", async () => {
    const a = await seedTenantWithClassroom("Schema I8");
    const b = await seedTenantWithClassroom("Schema J8");
    await expect(assignCourseTeacher(sql, a.tenant.id, a.course.id, b.teacher.id)).rejects.toThrow();
  });

  it("rejects an offering whose teacher is not assigned to the course", async () => {
    const a = await seedTenantWithClassroom("Schema I9");
    const otherTeacher = await createTeacher(sql, a.tenant.id, { displayName: "Unassigned Teacher" });
    await expect(
      createCourseOffering(sql, a.tenant.id, a.course.id, otherTeacher.id),
    ).rejects.toThrow();
  });

  it("rejects the same offering twice inside one branch", async () => {
    const a = await seedTenantWithClassroom("Schema I10");
    await expect(
      createCourseOffering(sql, a.tenant.id, a.course.id, a.teacher.id, { branchId: a.branch.id }),
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
    expect(data?.entitled).toBe(true);
  });

  it("guardian portal data never exposes a student outside the guardian's own tenant links", async () => {
    const a = await seedTenantWithClassroom("Portal C");
    const b = await seedTenantWithClassroom("Portal D");
    await loginAs(a.guardianUser.id);
    const data = await getParentPortalData();
    expect(data?.entitled).toBe(true);
    if (!data?.entitled) throw new Error("expected an entitled guardian portal");
    expect(data.children.map((c) => c.id)).toEqual([a.student.id]);
    expect(data.children.map((c) => c.id)).not.toContain(b.student.id);
    expect(data.invoices.every((inv) => inv.student_id === a.student.id)).toBe(true);
    expect(data.attendance.every((att) => att.student_id === a.student.id)).toBe(true);
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
    await sql.query("update public.memberships set active = false where tenant_id = $1 and user_id = $2", [a.tenant.id, a.teacherUser.id]);
    await loginAs(a.teacherUser.id);
    await expect(getTenantAuthorizationContext(a.tenant.id)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("Portal entitlement gating (commercial layer over the relationship)", () => {
  it("closes the student portal for an operations-only workspace without returning any student data", async () => {
    const a = await seedTenantWithClassroom("Gate Ops", "operations");
    await loginAs(a.studentUser.id);
    const data = await getStudentPortalData();
    expect(data?.entitled).toBe(false);
    expect(data).not.toHaveProperty("attendance");
    expect(data).not.toHaveProperty("invoices");
    expect(data).not.toHaveProperty("sessions");
  });

  it("closes the guardian portal for an operations-only workspace without returning any child data", async () => {
    const a = await seedTenantWithClassroom("Gate Ops Guardian", "operations");
    await loginAs(a.guardianUser.id);
    const data = await getParentPortalData();
    expect(data?.entitled).toBe(false);
    expect(data).not.toHaveProperty("children");
    expect(data).not.toHaveProperty("invoices");
  });

  it("opens the student portal at the management level", async () => {
    const a = await seedTenantWithClassroom("Gate Management", "management_platform");
    await loginAs(a.studentUser.id);
    expect((await getStudentPortalData())?.entitled).toBe(true);
  });

  it("re-closes the portal when the entitlement is revoked, keeping the record intact", async () => {
    const a = await seedTenantWithClassroom("Gate Revoked", "management_platform");
    await sql.query(
      "update public.tenant_entitlements set state = 'revoked' where tenant_id = $1 and capability_key = 'platform.portal.student'",
      [a.tenant.id],
    );
    await loginAs(a.studentUser.id);
    expect((await getStudentPortalData())?.entitled).toBe(false);

    const stillThere = await sql.query("select count(*)::int as count from public.students where tenant_id = $1", [a.tenant.id]);
    expect(stillThere.rows[0]?.count).toBe(1);
  });

  it("re-closes the portal when the entitlement window has expired", async () => {
    const a = await seedTenantWithClassroom("Gate Expired", "management_platform");
    await sql.query(
      `update public.tenant_entitlements
       set effective_from = now() - interval '10 days', effective_to = now() - interval '1 day'
       where tenant_id = $1 and capability_key = 'platform.portal.student'`,
      [a.tenant.id],
    );
    await loginAs(a.studentUser.id);
    expect((await getStudentPortalData())?.entitled).toBe(false);
  });

  it("keeps the student portal closed while the entitlement is only pending", async () => {
    const a = await seedTenantWithClassroom("Gate Pending", "management_platform");
    await sql.query(
      "update public.tenant_entitlements set state = 'pending' where tenant_id = $1 and capability_key = 'platform.portal.student'",
      [a.tenant.id],
    );
    await loginAs(a.studentUser.id);
    expect((await getStudentPortalData())?.entitled).toBe(false);
  });

  it("does not let a digital-learning workspace open a portal it never received", async () => {
    const a = await seedTenantWithClassroom("Gate Learning", "learning_platform");
    await sql.query(
      "delete from public.tenant_entitlements where tenant_id = $1 and capability_key = 'platform.portal.guardian'",
      [a.tenant.id],
    );
    await loginAs(a.guardianUser.id);
    expect((await getParentPortalData())?.entitled).toBe(false);
  });

  it("never opens another tenant's portal entitlement for this workspace", async () => {
    const entitled = await seedTenantWithClassroom("Gate Cross A", "management_platform");
    const closed = await seedTenantWithClassroom("Gate Cross B", "operations");
    await loginAs(closed.studentUser.id);
    const data = await getStudentPortalData();
    expect(data?.student.tenant_id).toBe(closed.tenant.id);
    expect(data?.entitled).toBe(false);
    expect(entitled.tenant.id).not.toBe(closed.tenant.id);
  });
});
