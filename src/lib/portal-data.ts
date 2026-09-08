import "server-only";

import { getPostgresCurrentUser } from "@/lib/auth/postgres-auth";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";

function postgresSql() {
  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) {
    throw new Error("Portal data requires the PostgreSQL application backend");
  }
  return postgresSqlExecutor(config.databaseUrl);
}

export async function getStudentPortalData() {
  const sql = postgresSql();
  const user = await getPostgresCurrentUser(sql);
  if (!user) return null;
  const student = (await sql.query<{ id: string; tenant_id: string; code: string; full_name: string; grade: string | null; phone: string | null; joined_on: string }>(
    `select id, tenant_id, code, full_name, grade, phone, joined_on::text as joined_on
     from public.students where user_id = $1 and active = true limit 1`,
    [user.id],
  )).rows[0];
  if (!student) return null;

  const [enrollments, attendance, invoices, cohorts, sessions, payments] = await Promise.all([
    sql.query<{ cohort_id: string; enrolled_on: string; active: boolean }>(
      "select cohort_id, enrolled_on::text as enrolled_on, active from public.enrollments where tenant_id = $1 and student_id = $2 and active = true",
      [student.tenant_id, student.id],
    ),
    sql.query<{ session_id: string; status: string; marked_at: string }>(
      "select session_id, status::text as status, marked_at::text as marked_at from public.attendance where tenant_id = $1 and student_id = $2 order by marked_at desc limit 12",
      [student.tenant_id, student.id],
    ),
    sql.query<{ id: string; title: string; amount: string; due_date: string | null; status: string; created_at: string }>(
      "select id, title, amount::text as amount, due_date::text as due_date, status::text as status, created_at::text as created_at from public.invoices where tenant_id = $1 and student_id = $2 order by created_at desc",
      [student.tenant_id, student.id],
    ),
    sql.query<{ id: string; name: string; subject: string | null }>(
      `select c.id, c.name, c.subject from public.cohorts c
       join public.enrollments e on e.tenant_id = c.tenant_id and e.cohort_id = c.id
       where e.tenant_id = $1 and e.student_id = $2 and e.active = true`,
      [student.tenant_id, student.id],
    ),
    sql.query<{ id: string; cohort_id: string; starts_at: string; ends_at: string | null; notes: string | null }>(
      `select cs.id, cs.cohort_id, cs.starts_at::text as starts_at, cs.ends_at::text as ends_at, cs.notes
       from public.class_sessions cs
       join public.enrollments e on e.tenant_id = cs.tenant_id and e.cohort_id = cs.cohort_id
       where e.tenant_id = $1 and e.student_id = $2 and e.active = true
       order by cs.starts_at limit 12`,
      [student.tenant_id, student.id],
    ),
    sql.query<{ invoice_id: string; amount: string; method: string; paid_at: string }>(
      `select p.invoice_id, p.amount::text as amount, p.method, p.paid_at::text as paid_at
       from public.payments p join public.invoices i on i.tenant_id = p.tenant_id and i.id = p.invoice_id
       where i.tenant_id = $1 and i.student_id = $2 order by p.paid_at desc`,
      [student.tenant_id, student.id],
    ),
  ]);
  return { student, enrollments: enrollments.rows, cohorts: cohorts.rows, sessions: sessions.rows, attendance: attendance.rows, invoices: invoices.rows, payments: payments.rows };
}

export async function getParentPortalData() {
  const sql = postgresSql();
  const user = await getPostgresCurrentUser(sql);
  if (!user) return null;
  const guardian = (await sql.query<{ id: string; tenant_id: string; full_name: string; phone: string; email: string | null }>(
    "select id, tenant_id, full_name, phone, email::text as email from public.guardians where user_id = $1 and active = true limit 1",
    [user.id],
  )).rows[0];
  if (!guardian) return null;

  const [links, children, attendance, invoices, enrollments, sessions] = await Promise.all([
    sql.query<{ student_id: string; relationship: string }>(
      "select student_id, relationship from public.student_guardians where tenant_id = $1 and guardian_id = $2",
      [guardian.tenant_id, guardian.id],
    ),
    sql.query<{ id: string; code: string; full_name: string; grade: string | null; phone: string | null; active: boolean }>(
      `select s.id, s.code, s.full_name, s.grade, s.phone, s.active
       from public.students s join public.student_guardians sg on sg.tenant_id = s.tenant_id and sg.student_id = s.id
       where sg.tenant_id = $1 and sg.guardian_id = $2`,
      [guardian.tenant_id, guardian.id],
    ),
    sql.query<{ student_id: string; session_id: string; status: string; marked_at: string }>(
      `select a.student_id, a.session_id, a.status::text as status, a.marked_at::text as marked_at
       from public.attendance a join public.student_guardians sg on sg.tenant_id = a.tenant_id and sg.student_id = a.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2 order by a.marked_at desc limit 20`,
      [guardian.tenant_id, guardian.id],
    ),
    sql.query<{ id: string; student_id: string; title: string; amount: string; due_date: string | null; status: string }>(
      `select i.id, i.student_id, i.title, i.amount::text as amount, i.due_date::text as due_date, i.status::text as status
       from public.invoices i join public.student_guardians sg on sg.tenant_id = i.tenant_id and sg.student_id = i.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2 order by i.due_date`,
      [guardian.tenant_id, guardian.id],
    ),
    sql.query<{ student_id: string; cohort_id: string; active: boolean }>(
      `select e.student_id, e.cohort_id, e.active
       from public.enrollments e join public.student_guardians sg on sg.tenant_id = e.tenant_id and sg.student_id = e.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2 and e.active = true`,
      [guardian.tenant_id, guardian.id],
    ),
    sql.query<{ id: string; cohort_id: string; starts_at: string; ends_at: string | null; notes: string | null }>(
      `select distinct cs.id, cs.cohort_id, cs.starts_at::text as starts_at, cs.ends_at::text as ends_at, cs.notes
       from public.class_sessions cs
       join public.enrollments e on e.tenant_id = cs.tenant_id and e.cohort_id = cs.cohort_id and e.active = true
       join public.student_guardians sg on sg.tenant_id = e.tenant_id and sg.student_id = e.student_id
       where sg.tenant_id = $1 and sg.guardian_id = $2 order by starts_at limit 20`,
      [guardian.tenant_id, guardian.id],
    ),
  ]);
  return { guardian, children: children.rows, links: links.rows, attendance: attendance.rows, invoices: invoices.rows, enrollments: enrollments.rows, sessions: sessions.rows };
}
