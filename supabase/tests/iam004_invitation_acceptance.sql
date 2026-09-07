-- IAM-004 database acceptance test.
-- Run only against the canonical development seed. Everything is rolled back.
BEGIN;

INSERT INTO public.invitations (id, tenant_id, invitee_email, role, token_hash, expires_at, created_by)
VALUES
('41111111-1111-4111-8111-111111111101','31111111-1111-4111-8111-111111111101','teacher.demo@example.com','teacher',encode(extensions.digest('iam004-valid-token-abcdefghijklmnopqrstuvwxyz123456','sha256'),'hex'),now()+interval '7 days','11111111-1111-4111-8111-111111111101'),
('41111111-1111-4111-8111-111111111102','31111111-1111-4111-8111-111111111101','someone-else@example.com','accountant',encode(extensions.digest('iam004-wrong-email-abcdefghijklmnopqrstuvwxyz12','sha256'),'hex'),now()+interval '7 days','11111111-1111-4111-8111-111111111101');

INSERT INTO public.invitations (id, tenant_id, invitee_email, role, token_hash, expires_at, created_by, created_at, updated_at, last_sent_at)
VALUES ('41111111-1111-4111-8111-111111111103','31111111-1111-4111-8111-111111111101','expired@example.com','receptionist',encode(extensions.digest('iam004-expired-token-abcdefghijklmnopqrstuvwxyz123','sha256'),'hex'),now()-interval '1 minute','11111111-1111-4111-8111-111111111101',now()-interval '8 days',now()-interval '8 days',now()-interval '8 days');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','11111111-1111-4111-8111-111111111103','email','teacher.demo@example.com','role','authenticated')::text, true);
SELECT * FROM public.accept_membership_invitation('iam004-valid-token-abcdefghijklmnopqrstuvwxyz123456');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE tenant_id='31111111-1111-4111-8111-111111111101'
      AND user_id='11111111-1111-4111-8111-111111111103'
      AND role='teacher' AND active
  ) THEN RAISE EXCEPTION 'accept test failed: membership missing'; END IF;

  BEGIN
    PERFORM public.accept_membership_invitation('iam004-valid-token-abcdefghijklmnopqrstuvwxyz123456');
    RAISE EXCEPTION 'replay unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF position('invitation_not_pending' in sqlerrm)=0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.accept_membership_invitation('iam004-wrong-email-abcdefghijklmnopqrstuvwxyz12');
    RAISE EXCEPTION 'wrong-email acceptance unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF position('invitation_email_mismatch' in sqlerrm)=0 THEN RAISE; END IF;
  END;
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub','11111111-1111-4111-8111-111111111103','email','expired@example.com','role','authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM public.accept_membership_invitation('iam004-expired-token-abcdefghijklmnopqrstuvwxyz123');
    RAISE EXCEPTION 'expired invitation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF position('invitation_expired' in sqlerrm)=0 THEN RAISE; END IF;
  END;
END $$;

RESET ROLE;

-- Cross-tenant negative RLS check: owner of the demo tenant must not see or mutate Tenant B invitations.
INSERT INTO public.tenants (id,name,slug,created_by)
VALUES ('31111111-1111-4111-8111-111111111199','Tenant B IAM Test','iam-test-b','11111111-1111-4111-8111-111111111102');
INSERT INTO public.memberships (tenant_id,user_id,role,active)
VALUES ('31111111-1111-4111-8111-111111111199','11111111-1111-4111-8111-111111111102','owner',true);
INSERT INTO public.invitations (id,tenant_id,invitee_email,role,token_hash,expires_at,created_by)
VALUES ('41111111-1111-4111-8111-111111111199','31111111-1111-4111-8111-111111111199','cross-tenant@example.com','teacher',encode(extensions.digest('cross-tenant-iam004-token-abcdefghijklmnopqrstuvwxyz','sha256'),'hex'),now()+interval '7 days','11111111-1111-4111-8111-111111111102');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','11111111-1111-4111-8111-111111111101','email','center.demo@example.com','role','authenticated')::text, true);
DO $$
DECLARE visible_count integer;
BEGIN
  SELECT count(*) INTO visible_count FROM public.invitations WHERE id='41111111-1111-4111-8111-111111111199';
  IF visible_count <> 0 THEN RAISE EXCEPTION 'cross-tenant select unexpectedly visible'; END IF;
  UPDATE public.invitations SET status='revoked' WHERE id='41111111-1111-4111-8111-111111111199';
  IF FOUND THEN RAISE EXCEPTION 'cross-tenant update unexpectedly succeeded'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
