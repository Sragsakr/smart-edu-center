begin;

create index attendance_tenant_idx on public.attendance(tenant_id);
create index attendance_student_idx on public.attendance(student_id);
create index attendance_marked_by_idx on public.attendance(marked_by);
create index audit_actor_user_idx on public.audit_logs(actor_user_id);
create index branches_tenant_idx on public.branches(tenant_id);
create index class_sessions_tenant_idx on public.class_sessions(tenant_id);
create index class_sessions_created_by_idx on public.class_sessions(created_by);
create index cohorts_tenant_idx on public.cohorts(tenant_id);
create index cohorts_branch_idx on public.cohorts(branch_id);
create index cohorts_teacher_user_idx on public.cohorts(teacher_user_id);
create index enrollments_tenant_idx on public.enrollments(tenant_id);
create index enrollments_student_idx on public.enrollments(student_id);
create index guardians_tenant_idx on public.guardians(tenant_id);
create index invoices_tenant_idx on public.invoices(tenant_id);
create index payments_tenant_idx on public.payments(tenant_id);
create index payments_invoice_idx on public.payments(invoice_id);
create index payments_received_by_idx on public.payments(received_by);
create index student_guardians_tenant_idx on public.student_guardians(tenant_id);
create index student_guardians_guardian_idx on public.student_guardians(guardian_id);
create index students_branch_idx on public.students(branch_id);
create index tenants_created_by_idx on public.tenants(created_by);

commit;
