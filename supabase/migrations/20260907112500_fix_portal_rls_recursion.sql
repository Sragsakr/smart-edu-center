create or replace function private.is_student_self(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.students s where s.id = target_student and s.user_id = (select auth.uid()));
$$;

create or replace function private.is_guardian_of_student(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_guardians sg
    join public.guardians g on g.id = sg.guardian_id
    where sg.student_id = target_student and g.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_access_cohort(target_cohort uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    where e.cohort_id = target_cohort and e.active
      and (private.is_student_self(e.student_id) or private.is_guardian_of_student(e.student_id))
  );
$$;

create or replace function private.can_access_invoice(target_invoice uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.invoices i
    where i.id = target_invoice
      and (private.is_student_self(i.student_id) or private.is_guardian_of_student(i.student_id))
  );
$$;

drop policy if exists students_guardian_children_select on public.students;
create policy students_guardian_children_select on public.students for select to authenticated using (private.is_guardian_of_student(id));

drop policy if exists student_guardians_student_self_select on public.student_guardians;
create policy student_guardians_student_self_select on public.student_guardians for select to authenticated using (private.is_student_self(student_id));
drop policy if exists student_guardians_guardian_self_select on public.student_guardians;
create policy student_guardians_guardian_self_select on public.student_guardians for select to authenticated using (private.is_guardian_of_student(student_id));

drop policy if exists enrollments_student_self_select on public.enrollments;
create policy enrollments_student_self_select on public.enrollments for select to authenticated using (private.is_student_self(student_id));
drop policy if exists enrollments_guardian_children_select on public.enrollments;
create policy enrollments_guardian_children_select on public.enrollments for select to authenticated using (private.is_guardian_of_student(student_id));

drop policy if exists attendance_student_self_select on public.attendance;
create policy attendance_student_self_select on public.attendance for select to authenticated using (private.is_student_self(student_id));
drop policy if exists attendance_guardian_children_select on public.attendance;
create policy attendance_guardian_children_select on public.attendance for select to authenticated using (private.is_guardian_of_student(student_id));

drop policy if exists invoices_student_self_select on public.invoices;
create policy invoices_student_self_select on public.invoices for select to authenticated using (private.is_student_self(student_id));
drop policy if exists invoices_guardian_children_select on public.invoices;
create policy invoices_guardian_children_select on public.invoices for select to authenticated using (private.is_guardian_of_student(student_id));

drop policy if exists payments_student_self_select on public.payments;
create policy payments_student_self_select on public.payments for select to authenticated using (private.can_access_invoice(invoice_id));
drop policy if exists payments_guardian_children_select on public.payments;
create policy payments_guardian_children_select on public.payments for select to authenticated using (private.can_access_invoice(invoice_id));

drop policy if exists cohorts_student_self_select on public.cohorts;
drop policy if exists cohorts_guardian_children_select on public.cohorts;
create policy cohorts_portal_select on public.cohorts for select to authenticated using (private.can_access_cohort(id));

drop policy if exists sessions_student_self_select on public.class_sessions;
drop policy if exists sessions_guardian_children_select on public.class_sessions;
create policy sessions_portal_select on public.class_sessions for select to authenticated using (private.can_access_cohort(cohort_id));
