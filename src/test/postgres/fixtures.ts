import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import type { TransactionalSqlExecutor } from "@/lib/database/sql-executor";
import type { MemberRole } from "@/lib/authorization/policy";
import { defaultEntitlementsForLevel } from "@/lib/entitlements/default-entitlements";
import type { ProductLevel } from "@/lib/tenant/product-level";
import type { TenantType } from "@/lib/tenant/tenant-type";

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
  overrides: { name?: string; slug?: string; tenantType?: TenantType; productLevel?: ProductLevel } = {},
): Promise<{ id: string; name: string; slug: string }> {
  const name = overrides.name ?? `Test Tenant ${randomUUID().slice(0, 6)}`;
  const slug = overrides.slug ?? uniqueSlug("tenant");
  const result = await sql.query<{ id: string; name: string; slug: string }>(
    `insert into public.tenants (name, slug, tenant_type, product_level, status, created_by)
     values ($1, $2, $3, $4, 'active', $5)
     returning id, name, slug::text as slug`,
    [name, slug, overrides.tenantType ?? "center", overrides.productLevel ?? "operations", ownerId],
  );
  const tenant = result.rows[0];
  if (!tenant) throw new Error("fixture: tenant creation failed");
  return tenant;
}

/**
 * يمنح قدرات مستوى منتج لمساحة اختبار.
 *
 * يستخدم `defaultEntitlementsForLevel` نفسه المستخدم في التطبيق، فلا تُكرَّر قائمة
 * القدرات في الاختبارات وتنحرف عن مصدر الحقيقة.
 */
export async function grantEntitlements(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  productLevel: ProductLevel,
): Promise<string[]> {
  const capabilityKeys = defaultEntitlementsForLevel(productLevel);
  await sql.query(
    `insert into public.tenant_entitlements (tenant_id, capability_key, state, source, source_ref)
     select $1, catalog.key, 'active', 'plan', null
     from unnest($2::text[]) as catalog(key)
     on conflict (tenant_id, capability_key) do nothing`,
    [tenantId, capabilityKeys],
  );
  return capabilityKeys;
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
  overrides: { tenantName?: string; slug?: string; tenantType?: TenantType; productLevel?: ProductLevel } = {},
): Promise<TenantFixture> {
  const owner = await createUser(sql);
  const tenant = await createTenant(sql, owner.id, {
    name: overrides.tenantName,
    slug: overrides.slug,
    tenantType: overrides.tenantType,
    productLevel: overrides.productLevel,
  });
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

export async function createRoom(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  branchId: string | null,
  name = "Room 1",
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.rooms (tenant_id, branch_id, name) values ($1, $2, $3) returning id`,
    [tenantId, branchId, name],
  );
  const room = result.rows[0];
  if (!room) throw new Error("fixture: room creation failed");
  return room;
}

export async function createStage(sql: TransactionalSqlExecutor, tenantId: string, name = "Secondary") {
  const result = await sql.query<{ id: string }>(
    `insert into public.stages (tenant_id, name) values ($1, $2) returning id`,
    [tenantId, name],
  );
  const stage = result.rows[0];
  if (!stage) throw new Error("fixture: stage creation failed");
  return stage;
}

export async function createGrade(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  stageId: string,
  name = "Grade 10",
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.grades (tenant_id, stage_id, name) values ($1, $2, $3) returning id`,
    [tenantId, stageId, name],
  );
  const grade = result.rows[0];
  if (!grade) throw new Error("fixture: grade creation failed");
  return grade;
}

export async function createSubject(sql: TransactionalSqlExecutor, tenantId: string, name = "Mathematics") {
  const result = await sql.query<{ id: string }>(
    `insert into public.subjects (tenant_id, name) values ($1, $2) returning id`,
    [tenantId, name],
  );
  const subject = result.rows[0];
  if (!subject) throw new Error("fixture: subject creation failed");
  return subject;
}

export async function createTeacher(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  overrides: { displayName?: string; membershipUserId?: string | null } = {},
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.teachers (tenant_id, display_name, membership_user_id) values ($1, $2, $3) returning id`,
    [
      tenantId,
      overrides.displayName ?? `Teacher ${randomUUID().slice(0, 6)}`,
      overrides.membershipUserId ?? null,
    ],
  );
  const teacher = result.rows[0];
  if (!teacher) throw new Error("fixture: teacher creation failed");
  return teacher;
}

export async function createCourse(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  gradeId: string,
  subjectId: string,
  title = "Algebra",
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.courses (tenant_id, grade_id, subject_id, title) values ($1, $2, $3, $4) returning id`,
    [tenantId, gradeId, subjectId, title],
  );
  const course = result.rows[0];
  if (!course) throw new Error("fixture: course creation failed");
  return course;
}

export async function assignCourseTeacher(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  courseId: string,
  teacherId: string,
) {
  await sql.query(
    `insert into public.course_teachers (tenant_id, course_id, teacher_id) values ($1, $2, $3)`,
    [tenantId, courseId, teacherId],
  );
}

export async function createCourseOffering(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  courseId: string,
  teacherId: string,
  overrides: {
    branchId?: string | null;
    roomId?: string | null;
    mode?: "onsite" | "online" | "hybrid";
    capacity?: number | null;
    priceAmount?: string;
  } = {},
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.course_offerings
       (tenant_id, course_id, teacher_id, branch_id, room_id, mode, capacity, price_amount)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id`,
    [
      tenantId,
      courseId,
      teacherId,
      overrides.branchId ?? null,
      overrides.roomId ?? null,
      overrides.mode ?? "onsite",
      overrides.capacity ?? null,
      overrides.priceAmount ?? "0",
    ],
  );
  const offering = result.rows[0];
  if (!offering) throw new Error("fixture: course offering creation failed");
  return offering;
}

/**
 * ينشئ عرضًا كاملًا (مقرر + إسناد مدرس) لمدرس ومادة وصف داخل نفس المساحة.
 */
export async function createOfferingForTeacher(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  teacherId: string,
  overrides: { branchId?: string | null; title?: string } = {},
) {
  const stage = await createStage(sql, tenantId, `Stage ${randomUUID().slice(0, 6)}`);
  const grade = await createGrade(sql, tenantId, stage.id, `Grade ${randomUUID().slice(0, 6)}`);
  const subject = await createSubject(sql, tenantId, `Subject ${randomUUID().slice(0, 6)}`);
  const course = await createCourse(sql, tenantId, grade.id, subject.id, overrides.title ?? "Course");
  await assignCourseTeacher(sql, tenantId, course.id, teacherId);
  return createCourseOffering(sql, tenantId, course.id, teacherId, { branchId: overrides.branchId ?? null });
}

export async function createStudent(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  branchId: string | null,
  overrides: { code?: string; fullName?: string; gradeId?: string | null } = {},
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.students (tenant_id, branch_id, grade_id, code, full_name)
     values ($1, $2, $3, $4, $5) returning id`,
    [
      tenantId,
      branchId,
      overrides.gradeId ?? null,
      overrides.code ?? `S-${randomUUID().slice(0, 8)}`,
      overrides.fullName ?? "Test Student",
    ],
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

/**
 * ينشئ مجموعة تسليم مرتبطة بعرض قابل للبيع — لم يعد للمجموعة مادة أو مدرس مباشرة.
 */
export async function createCohort(
  sql: TransactionalSqlExecutor,
  tenantId: string,
  courseOfferingId: string,
  overrides: { branchId?: string | null; roomId?: string | null; name?: string } = {},
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.cohorts (tenant_id, course_offering_id, branch_id, room_id, name)
     values ($1, $2, $3, $4, $5) returning id`,
    [tenantId, courseOfferingId, overrides.branchId ?? null, overrides.roomId ?? null, overrides.name ?? "Test Cohort"],
  );
  const cohort = result.rows[0];
  if (!cohort) throw new Error("fixture: cohort creation failed");
  return cohort;
}

export async function makePlatformAdmin(sql: TransactionalSqlExecutor, userId: string): Promise<void> {
  await sql.query(`insert into public.platform_admins (user_id) values ($1)`, [userId]);
}

export { TEST_PASSWORD };
