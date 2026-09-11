import "server-only";

import type { AccessScopedSqlExecutor, SqlExecutor } from "@/lib/database/sql-executor";

/**
 * فحص نطاق المدرس على المستوى المورِد.
 *
 * القاعدة ([`RBAC_MATRIX.md`](../../../docs/RBAC_MATRIX.md) §7.2): الوصول الأكاديمي
 * للمدرس يعتمد على إسناد **العرض القابل للبيع** (`course_offerings.teacher_id`)،
 * ثم يتفرع منه الطلاب والمجموعات والحصص والحضور. ولا يُستخدم أي عمود مدرس مباشر
 * على المجموعة، لأن المجموعة وحدة تسليم تشير إلى العرض.
 *
 * كل الدوال تفترض أن المتصل داخل مساحة عمل نشطة (`enterTenantScope`)، فسياسات RLS
 * تُضيّق النتائج أصلًا؛ والفحص هنا يجيب «هل هذا المورد **لهذا المدرس**؟».
 */

/** سجل المدرس المرتبط بحساب العضو الموثّق داخل هذه المساحة. */
export async function teacherRecordIdForUser(
  sql: SqlExecutor,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const result = await sql.query<{ id: string }>(
    `select id
     from public.teachers
     where tenant_id = $1 and membership_user_id = $2 and archived_at is null
     limit 1`,
    [tenantId, userId],
  );
  return result.rows[0]?.id ?? null;
}

/** هل هذا المدرس مسند إلى هذا العرض؟ */
export async function isOfferingInTeacherScope(
  sql: SqlExecutor,
  tenantId: string,
  teacherId: string,
  offeringId: string,
): Promise<boolean> {
  const result = await sql.query<{ in_scope: boolean }>(
    `select exists(
       select 1
       from public.course_offerings o
       where o.tenant_id = $1 and o.id = $2 and o.teacher_id = $3
     ) as in_scope`,
    [tenantId, offeringId, teacherId],
  );
  return result.rows[0]?.in_scope === true;
}

/** هل هذه المجموعة تابعة لعرض مسند إلى هذا المدرس؟ */
export async function isCohortInTeacherScope(
  sql: SqlExecutor,
  tenantId: string,
  teacherId: string,
  cohortId: string,
): Promise<boolean> {
  const result = await sql.query<{ in_scope: boolean }>(
    `select exists(
       select 1
       from public.cohorts c
       join public.course_offerings o on o.tenant_id = c.tenant_id and o.id = c.course_offering_id
       where c.tenant_id = $1 and c.id = $2 and o.teacher_id = $3
     ) as in_scope`,
    [tenantId, cohortId, teacherId],
  );
  return result.rows[0]?.in_scope === true;
}

/** هل هذه الحصة تابعة لمجموعة ضمن عروض هذا المدرس؟ */
export async function isSessionInTeacherScope(
  sql: SqlExecutor,
  tenantId: string,
  teacherId: string,
  sessionId: string,
): Promise<boolean> {
  const result = await sql.query<{ in_scope: boolean }>(
    `select exists(
       select 1
       from public.class_sessions s
       join public.cohorts c on c.tenant_id = s.tenant_id and c.id = s.cohort_id
       join public.course_offerings o on o.tenant_id = c.tenant_id and o.id = c.course_offering_id
       where s.tenant_id = $1 and s.id = $2 and o.teacher_id = $3
     ) as in_scope`,
    [tenantId, sessionId, teacherId],
  );
  return result.rows[0]?.in_scope === true;
}

/**
 * هل هذا الطالب داخل نطاق المدرس؟
 *
 * النطاق يتحقق عبر **التسجيل في عرض مسند إليه**، لا عبر المجموعة وحدها: التسجيل
 * هو العلاقة التجارية التي تُثبت أن الطالب من طلاب هذا المدرس.
 */
export async function isStudentInTeacherScope(
  sql: SqlExecutor,
  tenantId: string,
  teacherId: string,
  studentId: string,
): Promise<boolean> {
  const result = await sql.query<{ in_scope: boolean }>(
    `select exists(
       select 1
       from public.enrollments e
       join public.course_offerings o on o.tenant_id = e.tenant_id and o.id = e.course_offering_id
       where e.tenant_id = $1 and e.student_id = $2 and o.teacher_id = $3 and e.active = true
     ) as in_scope`,
    [tenantId, studentId, teacherId],
  );
  return result.rows[0]?.in_scope === true;
}

/**
 * يبني فاحص نطاق جاهزًا ليمرَّر إلى `requireTenantCapabilityWithScope`.
 *
 * يحل سجل المدرس مرة واحدة، ثم يفحص المورد المطلوب. وإذا لم يكن للعضو سجل مدرس
 * أصلًا فالنطاق فارغ — وهو الرد الصحيح: عضو بدور `teacher` بلا سجل مدرس لا يملك
 * موارد أكاديمية.
 */
export function teacherScopeChecker(
  sql: AccessScopedSqlExecutor,
  tenantId: string,
  userId: string,
  resource:
    | { kind: "offering"; id: string }
    | { kind: "cohort"; id: string }
    | { kind: "session"; id: string }
    | { kind: "student"; id: string },
): () => Promise<boolean> {
  return async () => {
    const teacherId = await teacherRecordIdForUser(sql, tenantId, userId);
    if (!teacherId) return false;
    switch (resource.kind) {
      case "offering":
        return isOfferingInTeacherScope(sql, tenantId, teacherId, resource.id);
      case "cohort":
        return isCohortInTeacherScope(sql, tenantId, teacherId, resource.id);
      case "session":
        return isSessionInTeacherScope(sql, tenantId, teacherId, resource.id);
      case "student":
        return isStudentInTeacherScope(sql, tenantId, teacherId, resource.id);
    }
  };
}
