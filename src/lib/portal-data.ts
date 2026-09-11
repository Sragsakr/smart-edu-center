import "server-only";

import { withSessionUser } from "@/lib/auth/session-context";
import { hasActiveEntitlement } from "@/lib/entitlements/entitlement-service";
import { portalEntitlementKey } from "@/lib/entitlements/portal-access";

/**
 * قراءات بوابة الطالب.
 *
 * التسجيل التجاري (`enrollments`) على العرض القابل للبيع، والحضور/الجدول على مجموعة
 * التسليم (`cohort_members` + `class_sessions`). الصف يُقرأ من `grades` وليس نصًا حرًا.
 */
export async function getStudentPortalData() {
  return withSessionUser(async ({ sql, user }) => {
  const student = (
    await sql.query<{
      id: string;
      tenant_id: string;
      code: string;
      full_name: string;
      grade_name: string | null;
      phone: string | null;
      joined_on: string;
    }>(
      `select s.id, s.tenant_id, s.code, s.full_name, g.name as grade_name, s.phone,
              s.joined_on::text as joined_on
       from public.students s
       left join public.grades g on g.tenant_id = s.tenant_id and g.id = s.grade_id
       where s.user_id = $1 and s.active = true
       limit 1`,
      [user.id],
    )
  ).rows[0];
  if (!student) return null;

  const tenantId = student.tenant_id;
  const studentId = student.id;

  // الدخول إلى مساحة الطالب بعد حلّ العلاقة، فتفتح سياسات RLS جداول هذه المساحة.
  await sql.enterTenantScope(tenantId);

  // الفرض التجاري قبل أي قراءة: وجود علاقة الطالب لا يكفي لفتح البوابة.
  const entitled = await hasActiveEntitlement(sql, tenantId, portalEntitlementKey("student"));
  if (!entitled) return { student, entitled: false as const };

  const [enrollments, cohorts, sessions, attendance, invoices, payments] = await Promise.all([
    sql.query<{ course_offering_id: string; enrolled_on: string; active: boolean }>(
      `select course_offering_id, enrolled_on::text as enrolled_on, active
       from public.enrollments
       where tenant_id = $1 and student_id = $2 and active = true`,
      [tenantId, studentId],
    ),
    sql.query<{ id: string; name: string; subject_name: string | null; teacher_name: string | null }>(
      `select c.id, c.name, sub.name as subject_name, t.display_name as teacher_name
       from public.cohort_members cm
       join public.cohorts c on c.tenant_id = cm.tenant_id and c.id = cm.cohort_id
       join public.course_offerings o on o.tenant_id = c.tenant_id and o.id = c.course_offering_id
       join public.courses co on co.tenant_id = o.tenant_id and co.id = o.course_id
       join public.subjects sub on sub.tenant_id = co.tenant_id and sub.id = co.subject_id
       join public.teachers t on t.tenant_id = o.tenant_id and t.id = o.teacher_id
       where cm.tenant_id = $1 and cm.student_id = $2 and cm.active = true`,
      [tenantId, studentId],
    ),
    sql.query<{ id: string; cohort_id: string; starts_at: string; ends_at: string | null; notes: string | null }>(
      `select cs.id, cs.cohort_id, cs.starts_at::text as starts_at, cs.ends_at::text as ends_at, cs.notes
       from public.class_sessions cs
       join public.cohort_members cm
         on cm.tenant_id = cs.tenant_id and cm.cohort_id = cs.cohort_id
       where cm.tenant_id = $1 and cm.student_id = $2 and cm.active = true
       order by cs.starts_at
       limit 12`,
      [tenantId, studentId],
    ),
    sql.query<{ session_id: string; status: string; marked_at: string }>(
      `select session_id, status::text as status, marked_at::text as marked_at
       from public.attendance
       where tenant_id = $1 and student_id = $2
       order by marked_at desc
       limit 12`,
      [tenantId, studentId],
    ),
    sql.query<{ id: string; title: string; amount: string; due_date: string | null; status: string; created_at: string }>(
      `select id, title, amount::text as amount, due_date::text as due_date,
              status::text as status, created_at::text as created_at
       from public.invoices
       where tenant_id = $1 and student_id = $2
       order by created_at desc`,
      [tenantId, studentId],
    ),
    sql.query<{ invoice_id: string; amount: string; method: string; paid_at: string }>(
      `select p.invoice_id, p.amount::text as amount, p.method, p.paid_at::text as paid_at
       from public.payments p
       join public.invoices i on i.tenant_id = p.tenant_id and i.id = p.invoice_id
       where i.tenant_id = $1 and i.student_id = $2
       order by p.paid_at desc`,
      [tenantId, studentId],
    ),
  ]);

  return {
    student,
    entitled: true as const,
    enrollments: enrollments.rows,
    cohorts: cohorts.rows,
    sessions: sessions.rows,
    attendance: attendance.rows,
    invoices: invoices.rows,
    payments: payments.rows,
  };
  });
}

/**
 * قراءات بوابة ولي الأمر — مقيّدة فقط بالأبناء المرتبطين في `student_guardians`.
 */
export async function getParentPortalData() {
  return withSessionUser(async ({ sql, user }) => {
  const guardian = (
    await sql.query<{ id: string; tenant_id: string; full_name: string; phone: string; email: string | null }>(
      `select id, tenant_id, full_name, phone, email::text as email
       from public.guardians
       where user_id = $1 and active = true
       limit 1`,
      [user.id],
    )
  ).rows[0];
  if (!guardian) return null;

  const tenantId = guardian.tenant_id;
  const guardianId = guardian.id;

  await sql.enterTenantScope(tenantId);

  // الفرض التجاري قبل أي قراءة: وجود علاقة ولي الأمر لا يكفي لفتح البوابة.
  const entitled = await hasActiveEntitlement(sql, tenantId, portalEntitlementKey("guardian"));
  if (!entitled) return { guardian, entitled: false as const };

  const [links, children, attendance, invoices, enrollments, cohortMemberships, sessions] = await Promise.all([
    sql.query<{ student_id: string; relationship: string }>(
      `select student_id, relationship
       from public.student_guardians
       where tenant_id = $1 and guardian_id = $2`,
      [tenantId, guardianId],
    ),
    sql.query<{ id: string; code: string; full_name: string; grade_name: string | null; phone: string | null; active: boolean }>(
      `select s.id, s.code, s.full_name, g.name as grade_name, s.phone, s.active
       from public.students s
       join public.student_guardians sg on sg.tenant_id = s.tenant_id and sg.student_id = s.id
       left join public.grades g on g.tenant_id = s.tenant_id and g.id = s.grade_id
       where sg.tenant_id = $1 and sg.guardian_id = $2`,
      [tenantId, guardianId],
    ),
    sql.query<{ student_id: string; session_id: string; status: string; marked_at: string }>(
      `select a.student_id, a.session_id, a.status::text as status, a.marked_at::text as marked_at
       from public.attendance a
       join public.student_guardians sg on sg.tenant_id = a.tenant_id and sg.student_id = a.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2
       order by a.marked_at desc
       limit 20`,
      [tenantId, guardianId],
    ),
    sql.query<{ id: string; student_id: string; title: string; amount: string; due_date: string | null; status: string }>(
      `select i.id, i.student_id, i.title, i.amount::text as amount,
              i.due_date::text as due_date, i.status::text as status
       from public.invoices i
       join public.student_guardians sg on sg.tenant_id = i.tenant_id and sg.student_id = i.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2
       order by i.due_date`,
      [tenantId, guardianId],
    ),
    sql.query<{ student_id: string; course_offering_id: string; active: boolean }>(
      `select e.student_id, e.course_offering_id, e.active
       from public.enrollments e
       join public.student_guardians sg on sg.tenant_id = e.tenant_id and sg.student_id = e.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2 and e.active = true`,
      [tenantId, guardianId],
    ),
    sql.query<{ student_id: string; cohort_id: string; active: boolean }>(
      `select cm.student_id, cm.cohort_id, cm.active
       from public.cohort_members cm
       join public.student_guardians sg on sg.tenant_id = cm.tenant_id and sg.student_id = cm.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2 and cm.active = true`,
      [tenantId, guardianId],
    ),
    sql.query<{ id: string; cohort_id: string; starts_at: string; ends_at: string | null; notes: string | null }>(
      `select distinct cs.id, cs.cohort_id, cs.starts_at::text as starts_at,
              cs.ends_at::text as ends_at, cs.notes
       from public.class_sessions cs
       join public.cohort_members cm
         on cm.tenant_id = cs.tenant_id and cm.cohort_id = cs.cohort_id and cm.active = true
       join public.student_guardians sg
         on sg.tenant_id = cm.tenant_id and sg.student_id = cm.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2
       order by starts_at
       limit 20`,
      [tenantId, guardianId],
    ),
  ]);

  return {
    guardian,
    entitled: true as const,
    children: children.rows,
    links: links.rows,
    attendance: attendance.rows,
    invoices: invoices.rows,
    enrollments: enrollments.rows,
    cohortMemberships: cohortMemberships.rows,
    sessions: sessions.rows,
  };
  });
}
