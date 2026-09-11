import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetCookieState } from "@/test/postgres/test-cookies";
import { testSqlExecutor, truncateAllTenantData } from "@/test/postgres/test-database";
import {
  addMembership,
  assignCourseTeacher,
  createBranch,
  createCohort,
  createCourse,
  createCourseOffering,
  createGrade,
  createStage,
  createStudent,
  createSubject,
  createTeacher,
  createTenantWithOwner,
  createUser,
  grantEntitlements,
} from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import {
  AuthorizationError,
  withTenantContext,
  requireTenantCapability,
  requireTenantCapabilityWithScope,
} from "@/lib/authorization/server";
import {
  isCohortInTeacherScope,
  isOfferingInTeacherScope,
  isStudentInTeacherScope,
  teacherRecordIdForUser,
} from "@/lib/authorization/resource-scope";

/**
 * مصفوفة Role × Resource × Action على قاعدة حقيقية، موجبة وسالبة.
 *
 * تُنفَّذ بدور التطبيق (عبر مُنفّذ قاعدة الاختبار)، فلا تفترض عزلاً غير مفروض.
 */

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

/**
 * مساحة فيها مدرسان مستقلان: كل واحد له عرض ومقرر وطالب.
 * هذا الشكل هو ما يُميّز اختبارات النطاق: الدور واحد والموارد مختلفة.
 */
async function seedTwoTeachersWithSeparateScopes(name: string) {
  const { tenant, owner } = await createTenantWithOwner(sql, { tenantName: name });
  await grantEntitlements(sql, tenant.id, "management_platform");

  const branch = await createBranch(sql, tenant.id, `${name} Branch`);
  const stage = await createStage(sql, tenant.id, `${name} Stage`);
  const grade = await createGrade(sql, tenant.id, stage.id, `${name} Grade`);

  async function teacherWithScope(label: string) {
    const user = await createUser(sql);
    await addMembership(sql, tenant.id, user.id, "teacher");
    const teacher = await createTeacher(sql, tenant.id, {
      displayName: `${label} Teacher`,
      membershipUserId: user.id,
    });
    const subject = await createSubject(sql, tenant.id, `${label} Subject`);
    const course = await createCourse(sql, tenant.id, grade.id, subject.id, `${label} Course`);
    await assignCourseTeacher(sql, tenant.id, course.id, teacher.id);
    const offering = await createCourseOffering(sql, tenant.id, course.id, teacher.id, { branchId: branch.id });
    const cohort = await createCohort(sql, tenant.id, offering.id, { branchId: branch.id, name: `${label} Cohort` });
    const student = await createStudent(sql, tenant.id, branch.id, { fullName: `${label} Student`, gradeId: grade.id });
    await sql.query(
      "insert into public.enrollments (tenant_id, course_offering_id, student_id) values ($1, $2, $3)",
      [tenant.id, offering.id, student.id],
    );
    await sql.query("insert into public.cohort_members (tenant_id, cohort_id, student_id) values ($1, $2, $3)", [
      tenant.id,
      cohort.id,
      student.id,
    ]);
    const session = await sql.query<{ id: string }>(
      "insert into public.class_sessions (tenant_id, cohort_id, starts_at, created_by) values ($1, $2, now(), $3) returning id",
      [tenant.id, cohort.id, owner.id],
    );
    return { user, teacher, course, offering, cohort, student, sessionId: session.rows[0]!.id };
  }

  const alpha = await teacherWithScope("Alpha");
  const beta = await teacherWithScope("Beta");
  return { tenant, owner, branch, grade, alpha, beta };
}

describe("teacher resource scope (positive and negative)", () => {
  it("resolves the teacher record of the signed-in member", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Resolve");
    await loginAs(fixture.alpha.user.id);
    // السياق يُفتح بلا فحص قدرة بعينها: المطلوب هنا معرفة الهوية والمساحة،
    // ثم يقرر فاحص النطاق أي مورد يخص هذا المدرس.
    const record = await withTenantContext(fixture.tenant.id, (context) =>
      teacherRecordIdForUser(context.sql, fixture.tenant.id, fixture.alpha.user.id),
    );
    expect(record).toBe(fixture.alpha.teacher.id);
    expect(record).not.toBe(fixture.beta.teacher.id);
  });

  it("scopes an offering to the teacher assigned to it", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Offering");
    await loginAs(fixture.alpha.user.id);
    const scoped = await withTenantContext(fixture.tenant.id, async (context) => ({
      own: await isOfferingInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.alpha.offering.id),
      other: await isOfferingInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.beta.offering.id),
    }));

    expect(scoped.own).toBe(true);
    expect(scoped.other).toBe(false);
  });

  it("scopes a cohort through its offering, not through a column on the cohort", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Cohort");
    await loginAs(fixture.alpha.user.id);
    const scoped = await withTenantContext(fixture.tenant.id, async (context) => ({
      own: await isCohortInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.alpha.cohort.id),
      other: await isCohortInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.beta.cohort.id),
    }));

    expect(scoped.own).toBe(true);
    expect(scoped.other).toBe(false);
  });

  it("scopes a student through an active enrolment on the teacher's offering", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Student");
    await loginAs(fixture.alpha.user.id);
    const scoped = await withTenantContext(fixture.tenant.id, async (context) => ({
      own: await isStudentInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.alpha.student.id),
      other: await isStudentInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.beta.student.id),
    }));

    expect(scoped.own).toBe(true);
    expect(scoped.other).toBe(false);
  });

  it("drops the student from scope once the enrolment is deactivated", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Inactive");
    await loginAs(fixture.alpha.user.id);
    const stillScoped = await withTenantContext(fixture.tenant.id, async (context) => {
      await context.sql.query("update public.enrollments set active = false where student_id = $1", [
        fixture.alpha.student.id,
      ]);
      return isStudentInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.alpha.student.id);
    });
    expect(stillScoped).toBe(false);
  });

  it("lets the teacher mark attendance for their own session and blocks another teacher's session", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Attendance");
    await loginAs(fixture.alpha.user.id);

    const own = await requireTenantCapabilityWithScope(
      fixture.tenant.id,
      "attendance.mark",
      (context) => isStudentInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.alpha.student.id),
      (context) => Promise.resolve(context.role),
    );
    expect(own).toBe("teacher");

    // ونفس القدرة تُرفض على طالب مدرس آخر، فالفحص على المورد لا على الدور.
    await expect(
      requireTenantCapabilityWithScope(
        fixture.tenant.id,
        "attendance.mark",
        (context) => isStudentInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.beta.student.id),
        () => Promise.resolve(null),
      ),
    ).rejects.toThrow("خارج نطاق صلاحيتك");

    await expect(
      requireTenantCapabilityWithScope(fixture.tenant.id, "attendance.mark", async () => false, () => Promise.resolve(null)),
    ).rejects.toThrow("خارج نطاق صلاحيتك");
  });

  it("refuses every scoped action for a member with the teacher role but no teacher record", async () => {
    const { tenant } = await createTenantWithOwner(sql, { tenantName: "No Record" });
    await grantEntitlements(sql, tenant.id, "management_platform");
    const user = await createUser(sql);
    await addMembership(sql, tenant.id, user.id, "teacher");
    await loginAs(user.id);

    const record = await withTenantContext(tenant.id, (context) =>
      teacherRecordIdForUser(context.sql, tenant.id, user.id),
    );
    expect(record).toBeNull();

    await expect(
      requireTenantCapabilityWithScope(
        tenant.id,
        "attendance.mark",
        async (context) => (await teacherRecordIdForUser(context.sql, tenant.id, user.id)) !== null,
        async () => null,
      ),
    ).rejects.toThrow("خارج نطاق صلاحيتك");
  });

  it("never lets a teacher reach an owner-level action even with a valid resource", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Escalation");
    await loginAs(fixture.alpha.user.id);

    await expect(requireTenantCapability(fixture.tenant.id, "team.manage", async () => null)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireTenantCapability(fixture.tenant.id, "payments.record", async () => null)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireTenantCapability(fixture.tenant.id, "students.create", async () => null)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("keeps the catalogue readable for a teacher without any resource scope", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Catalogue");
    await loginAs(fixture.alpha.user.id);

    // الكتالوج التنظيمي غير مقيّد بالنطاق: المدرس يحتاج معرفة الصفوف والمواد للتنقل.
    await expect(requireTenantCapability(fixture.tenant.id, "branches.read", async () => true)).resolves.toBe(true);
    await expect(requireTenantCapability(fixture.tenant.id, "catalog.read", async () => true)).resolves.toBe(true);
    // لكن إدارته ممنوعة.
    await expect(requireTenantCapability(fixture.tenant.id, "catalog.manage", async () => null)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireTenantCapability(fixture.tenant.id, "offerings.manage", async () => null)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("finance scope (positive and negative)", () => {
  it("lets the accountant create and void invoices but not touch academic records", async () => {
    const { tenant } = await createTenantWithOwner(sql, { tenantName: "Finance" });
    await grantEntitlements(sql, tenant.id, "management_platform");
    const accountant = await createUser(sql);
    await addMembership(sql, tenant.id, accountant.id, "accountant");
    await loginAs(accountant.id);

    await expect(requireTenantCapability(tenant.id, "invoices.create", async () => true)).resolves.toBe(true);
    await expect(requireTenantCapability(tenant.id, "invoices.update", async () => true)).resolves.toBe(true);
    await expect(requireTenantCapability(tenant.id, "payments.correct", async () => true)).resolves.toBe(true);
    await expect(requireTenantCapability(tenant.id, "payments.record", async () => true)).resolves.toBe(true);

    await expect(requireTenantCapability(tenant.id, "attendance.mark", async () => null)).rejects.toThrow("صلاحية");
    await expect(requireTenantCapability(tenant.id, "students.create", async () => null)).rejects.toThrow("صلاحية");
    await expect(requireTenantCapability(tenant.id, "catalog.manage", async () => null)).rejects.toThrow("صلاحية");
  });

  it("lets the receptionist record a payment but never correct or void it", async () => {
    const { tenant } = await createTenantWithOwner(sql, { tenantName: "Reception" });
    await grantEntitlements(sql, tenant.id, "management_platform");
    const receptionist = await createUser(sql);
    await addMembership(sql, tenant.id, receptionist.id, "receptionist");
    await loginAs(receptionist.id);

    await expect(requireTenantCapability(tenant.id, "payments.record", async () => true)).resolves.toBe(true);
    await expect(requireTenantCapability(tenant.id, "invoices.create", async () => true)).resolves.toBe(true);
    await expect(requireTenantCapability(tenant.id, "payments.correct", async () => null)).rejects.toThrow("صلاحية");
  });

  it("keeps the teacher away from recording payments but able to read billing", async () => {
    const fixture = await seedTwoTeachersWithSeparateScopes("Teacher Finance");
    await loginAs(fixture.alpha.user.id);

    // `invoices.read` مقيّدة بالنطاق للمدرس، فالفحص يمر عبر مسار النطاق لا مسار القدرة.
    const billingRole = await requireTenantCapabilityWithScope(
      fixture.tenant.id,
      "invoices.read",
      (context) => isStudentInTeacherScope(context.sql, fixture.tenant.id, fixture.alpha.teacher.id, fixture.alpha.student.id),
      (context) => Promise.resolve(context.role),
    );
    expect(billingRole).toBe("teacher");

    // أما الكتابة المالية فممنوعة على الدور نفسه.
    await expect(requireTenantCapability(fixture.tenant.id, "payments.record", async () => null)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireTenantCapability(fixture.tenant.id, "invoices.create", async () => null)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses every finance write when the workspace has no entitlement, with an upgrade reason", async () => {
    // مساحة بلا استحقاقات: الرفض تجاري لا صلاحي، والدور يسمح بالعملية أصلًا.
    const { tenant } = await createTenantWithOwner(sql, { tenantName: "No Entitlement" });
    const accountant = await createUser(sql);
    await addMembership(sql, tenant.id, accountant.id, "accountant");
    await loginAs(accountant.id);

    const error = await requireTenantCapability(tenant.id, "payments.record", async () => null).catch((thrown) => thrown);
    expect((error as Error).name).toBe("EntitlementError");
    expect((error as Error).message).toContain("غير مفعّلة");
  });

  it("gives management full access to both finance and academic actions", async () => {
    const { tenant } = await createTenantWithOwner(sql, { tenantName: "Management" });
    await grantEntitlements(sql, tenant.id, "management_platform");
    const admin = await createUser(sql);
    await addMembership(sql, tenant.id, admin.id, "admin");
    await loginAs(admin.id);

    for (const capability of ["invoices.create", "payments.correct", "attendance.mark", "students.create", "catalog.manage", "team.manage", "audit.read"] as const) {
      await expect(requireTenantCapability(tenant.id, capability, async () => true)).resolves.toBe(true);
    }
  });
});
