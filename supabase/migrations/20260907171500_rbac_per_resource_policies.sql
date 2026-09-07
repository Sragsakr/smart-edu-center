BEGIN;

-- IAM-005-02: replace the broad member-wide CRUD policies with the
-- resource/action contract documented in docs/RBAC_MATRIX.md.

CREATE OR REPLACE FUNCTION private.teacher_has_cohort(
  target_tenant uuid,
  target_cohort uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cohorts c
    JOIN public.memberships m
      ON m.tenant_id = c.tenant_id
     AND m.user_id = (SELECT auth.uid())
     AND m.active
     AND m.role = 'teacher'::public.member_role
    WHERE c.id = target_cohort
      AND c.tenant_id = target_tenant
      AND c.teacher_user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.teacher_has_student(
  target_tenant uuid,
  target_student uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.cohorts c
      ON c.id = e.cohort_id
     AND c.tenant_id = e.tenant_id
    JOIN public.memberships m
      ON m.tenant_id = e.tenant_id
     AND m.user_id = (SELECT auth.uid())
     AND m.active
     AND m.role = 'teacher'::public.member_role
    WHERE e.tenant_id = target_tenant
      AND e.student_id = target_student
      AND e.active
      AND c.teacher_user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.teacher_has_guardian(
  target_tenant uuid,
  target_guardian uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_guardians sg
    WHERE sg.tenant_id = target_tenant
      AND sg.guardian_id = target_guardian
      AND private.teacher_has_student(target_tenant, sg.student_id)
  );
$$;

CREATE OR REPLACE FUNCTION private.teacher_has_session(
  target_tenant uuid,
  target_session uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_sessions s
    WHERE s.id = target_session
      AND s.tenant_id = target_tenant
      AND private.teacher_has_cohort(target_tenant, s.cohort_id)
  );
$$;

CREATE OR REPLACE FUNCTION private.teacher_has_invoice(
  target_tenant uuid,
  target_invoice uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = target_invoice
      AND i.tenant_id = target_tenant
      AND private.teacher_has_student(target_tenant, i.student_id)
  );
$$;

REVOKE ALL ON FUNCTION private.teacher_has_cohort(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.teacher_has_student(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.teacher_has_guardian(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.teacher_has_session(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.teacher_has_invoice(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.teacher_has_cohort(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_has_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_has_guardian(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_has_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_has_invoice(uuid, uuid) TO authenticated;

-- Remove the generic policies created by the initial migration. Portal-specific
-- student/guardian SELECT policies intentionally remain in place.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'branches',
    'students',
    'guardians',
    'student_guardians',
    'cohorts',
    'enrollments',
    'class_sessions',
    'attendance',
    'invoices',
    'payments'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete', tbl);
  END LOOP;
END
$$;

-- Branches: management writes, all active staff may read.
CREATE POLICY branches_staff_select ON public.branches
  FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));
CREATE POLICY branches_management_insert ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY branches_management_update ON public.branches
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]))
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY branches_management_delete ON public.branches
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

-- Students.
CREATE POLICY students_staff_select ON public.students
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_student(tenant_id, id)
  );
CREATE POLICY students_ops_insert ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY students_ops_update ON public.students
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]))
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY students_management_delete ON public.students
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

-- Guardians.
CREATE POLICY guardians_staff_select ON public.guardians
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_guardian(tenant_id, id)
  );
CREATE POLICY guardians_ops_insert ON public.guardians
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY guardians_ops_update ON public.guardians
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]))
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY guardians_management_delete ON public.guardians
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

-- Student/guardian links.
CREATE POLICY student_guardians_staff_select ON public.student_guardians
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_student(tenant_id, student_id)
  );
CREATE POLICY student_guardians_ops_insert ON public.student_guardians
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY student_guardians_ops_update ON public.student_guardians
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]))
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY student_guardians_ops_delete ON public.student_guardians
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));

-- Cohorts/groups.
CREATE POLICY cohorts_staff_select ON public.cohorts
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_cohort(tenant_id, id)
  );
CREATE POLICY cohorts_ops_insert ON public.cohorts
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY cohorts_ops_update ON public.cohorts
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]))
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY cohorts_management_delete ON public.cohorts
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

-- Enrollments.
CREATE POLICY enrollments_staff_select ON public.enrollments
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_cohort(tenant_id, cohort_id)
  );
CREATE POLICY enrollments_ops_insert ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY enrollments_ops_update ON public.enrollments
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]))
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[]));
CREATE POLICY enrollments_management_delete ON public.enrollments
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

-- Class sessions: teachers can mutate only their assigned cohorts.
CREATE POLICY sessions_staff_select ON public.class_sessions
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_cohort(tenant_id, cohort_id)
  );
CREATE POLICY sessions_management_or_teacher_insert ON public.class_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    OR private.teacher_has_cohort(tenant_id, cohort_id)
  );
CREATE POLICY sessions_management_or_teacher_update ON public.class_sessions
  FOR UPDATE TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    OR private.teacher_has_cohort(tenant_id, cohort_id)
  )
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    OR private.teacher_has_cohort(tenant_id, cohort_id)
  );
CREATE POLICY sessions_management_or_teacher_delete ON public.class_sessions
  FOR DELETE TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    OR private.teacher_has_cohort(tenant_id, cohort_id)
  );

-- Attendance: teachers are scoped through the session/cohort; reception may mark/correct.
CREATE POLICY attendance_staff_select ON public.attendance
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_session(tenant_id, session_id)
  );
CREATE POLICY attendance_ops_insert ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[])
    OR private.teacher_has_session(tenant_id, session_id)
  );
CREATE POLICY attendance_ops_update ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[])
    OR private.teacher_has_session(tenant_id, session_id)
  )
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist']::public.member_role[])
    OR private.teacher_has_session(tenant_id, session_id)
  );
CREATE POLICY attendance_management_delete ON public.attendance
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

-- Invoices.
CREATE POLICY invoices_staff_select ON public.invoices
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_student(tenant_id, student_id)
  );
CREATE POLICY invoices_finance_insert ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[]));
CREATE POLICY invoices_finance_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[]))
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[]));
CREATE POLICY invoices_finance_delete ON public.invoices
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','accountant']::public.member_role[]));

-- Payments: reception can record/read, but only finance/management may correct/delete.
CREATE POLICY payments_staff_select ON public.payments
  FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[])
    OR private.teacher_has_invoice(tenant_id, invoice_id)
  );
CREATE POLICY payments_finance_or_reception_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','receptionist','accountant']::public.member_role[]));
CREATE POLICY payments_finance_update ON public.payments
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','accountant']::public.member_role[]))
  WITH CHECK (private.has_tenant_role(tenant_id, ARRAY['owner','admin','accountant']::public.member_role[]));
CREATE POLICY payments_finance_delete ON public.payments
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin','accountant']::public.member_role[]));

-- Memberships: remove the old role-escalation-friendly write policies.
DROP POLICY IF EXISTS memberships_insert ON public.memberships;
DROP POLICY IF EXISTS memberships_update ON public.memberships;
DROP POLICY IF EXISTS memberships_delete ON public.memberships;

CREATE POLICY memberships_manager_insert ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    AND role <> 'owner'::public.member_role
  );
CREATE POLICY memberships_owner_update ON public.memberships
  FOR UPDATE TO authenticated
  USING (
    role <> 'owner'::public.member_role
    AND private.has_tenant_role(tenant_id, ARRAY['owner']::public.member_role[])
  )
  WITH CHECK (
    role <> 'owner'::public.member_role
    AND private.has_tenant_role(tenant_id, ARRAY['owner']::public.member_role[])
  );
CREATE POLICY memberships_admin_update_staff ON public.memberships
  FOR UPDATE TO authenticated
  USING (
    role IN ('teacher','receptionist','accountant')
    AND private.has_tenant_role(tenant_id, ARRAY['admin']::public.member_role[])
  )
  WITH CHECK (
    role IN ('teacher','receptionist','accountant')
    AND private.has_tenant_role(tenant_id, ARRAY['admin']::public.member_role[])
  );
CREATE POLICY memberships_owner_delete ON public.memberships
  FOR DELETE TO authenticated
  USING (
    role <> 'owner'::public.member_role
    AND private.has_tenant_role(tenant_id, ARRAY['owner']::public.member_role[])
  );

-- Invitations are already per-resource, but tighten admin writes so owner remains
-- impossible and every row stays within the actor's active tenant membership.
DROP POLICY IF EXISTS invitations_insert_manager ON public.invitations;
DROP POLICY IF EXISTS invitations_update_manager ON public.invitations;
DROP POLICY IF EXISTS invitations_delete_manager ON public.invitations;

CREATE POLICY invitations_manager_insert ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    AND created_by = (SELECT auth.uid())
    AND role <> 'owner'::public.member_role
    AND status = 'pending'
  );
CREATE POLICY invitations_manager_update ON public.invitations
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]))
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    AND role <> 'owner'::public.member_role
  );
CREATE POLICY invitations_manager_delete ON public.invitations
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

COMMIT;
