-- Smart Edu Center — BUILD MODE ONLY
-- Canonical portal-link/RLS adjustments while schema is still fluid.
-- This is intentionally NOT a migration. Fold into the final baseline before SCHEMA FREEZE.

alter table public.students add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.guardians add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists students_user_tenant_unique
  on public.students(tenant_id,user_id)
  where user_id is not null;
create index if not exists students_user_idx on public.students(user_id) where user_id is not null;
create unique index if not exists guardians_user_tenant_unique
  on public.guardians(tenant_id,user_id)
  where user_id is not null;
create index if not exists guardians_user_idx on public.guardians(user_id) where user_id is not null;

-- Self access.
drop policy if exists students_self_select on public.students;
create policy students_self_select on public.students for select to authenticated
using (user_id=(select auth.uid()));

drop policy if exists guardians_self_select on public.guardians;
create policy guardians_self_select on public.guardians for select to authenticated
using (user_id=(select auth.uid()));

-- Student-linked reads.
drop policy if exists enrollments_student_self_select on public.enrollments;
create policy enrollments_student_self_select on public.enrollments for select to authenticated
using (exists(select 1 from public.students s where s.id=enrollments.student_id and s.user_id=(select auth.uid())));

drop policy if exists cohorts_student_self_select on public.cohorts;
create policy cohorts_student_self_select on public.cohorts for select to authenticated
using (exists(select 1 from public.enrollments e join public.students s on s.id=e.student_id where e.cohort_id=cohorts.id and e.active and s.user_id=(select auth.uid())));

drop policy if exists sessions_student_self_select on public.class_sessions;
create policy sessions_student_self_select on public.class_sessions for select to authenticated
using (exists(select 1 from public.enrollments e join public.students s on s.id=e.student_id where e.cohort_id=class_sessions.cohort_id and e.active and s.user_id=(select auth.uid())));

drop policy if exists attendance_student_self_select on public.attendance;
create policy attendance_student_self_select on public.attendance for select to authenticated
using (exists(select 1 from public.students s where s.id=attendance.student_id and s.user_id=(select auth.uid())));

drop policy if exists invoices_student_self_select on public.invoices;
create policy invoices_student_self_select on public.invoices for select to authenticated
using (exists(select 1 from public.students s where s.id=invoices.student_id and s.user_id=(select auth.uid())));

drop policy if exists payments_student_self_select on public.payments;
create policy payments_student_self_select on public.payments for select to authenticated
using (exists(select 1 from public.invoices i join public.students s on s.id=i.student_id where i.id=payments.invoice_id and s.user_id=(select auth.uid())));

-- Guardian relation + child reads.
drop policy if exists student_guardians_guardian_self_select on public.student_guardians;
create policy student_guardians_guardian_self_select on public.student_guardians for select to authenticated
using (exists(select 1 from public.guardians g where g.id=student_guardians.guardian_id and g.user_id=(select auth.uid())));

drop policy if exists students_guardian_children_select on public.students;
create policy students_guardian_children_select on public.students for select to authenticated
using (exists(select 1 from public.student_guardians sg join public.guardians g on g.id=sg.guardian_id where sg.student_id=students.id and g.user_id=(select auth.uid())));

drop policy if exists enrollments_guardian_children_select on public.enrollments;
create policy enrollments_guardian_children_select on public.enrollments for select to authenticated
using (exists(select 1 from public.student_guardians sg join public.guardians g on g.id=sg.guardian_id where sg.student_id=enrollments.student_id and g.user_id=(select auth.uid())));

drop policy if exists cohorts_guardian_children_select on public.cohorts;
create policy cohorts_guardian_children_select on public.cohorts for select to authenticated
using (exists(select 1 from public.enrollments e join public.student_guardians sg on sg.student_id=e.student_id join public.guardians g on g.id=sg.guardian_id where e.cohort_id=cohorts.id and e.active and g.user_id=(select auth.uid())));

drop policy if exists sessions_guardian_children_select on public.class_sessions;
create policy sessions_guardian_children_select on public.class_sessions for select to authenticated
using (exists(select 1 from public.enrollments e join public.student_guardians sg on sg.student_id=e.student_id join public.guardians g on g.id=sg.guardian_id where e.cohort_id=class_sessions.cohort_id and e.active and g.user_id=(select auth.uid())));

drop policy if exists attendance_guardian_children_select on public.attendance;
create policy attendance_guardian_children_select on public.attendance for select to authenticated
using (exists(select 1 from public.student_guardians sg join public.guardians g on g.id=sg.guardian_id where sg.student_id=attendance.student_id and g.user_id=(select auth.uid())));

drop policy if exists invoices_guardian_children_select on public.invoices;
create policy invoices_guardian_children_select on public.invoices for select to authenticated
using (exists(select 1 from public.student_guardians sg join public.guardians g on g.id=sg.guardian_id where sg.student_id=invoices.student_id and g.user_id=(select auth.uid())));

drop policy if exists payments_guardian_children_select on public.payments;
create policy payments_guardian_children_select on public.payments for select to authenticated
using (exists(select 1 from public.invoices i join public.student_guardians sg on sg.student_id=i.student_id join public.guardians g on g.id=sg.guardian_id where i.id=payments.invoice_id and g.user_id=(select auth.uid())));
