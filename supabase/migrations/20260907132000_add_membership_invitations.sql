BEGIN;

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invitee_email text NOT NULL CHECK (invitee_email = lower(btrim(invitee_email)) AND invitee_email LIKE '%@%'),
  role public.member_role NOT NULL CHECK (role <> 'owner'::public.member_role),
  token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK ((status = 'accepted' AND accepted_by IS NOT NULL AND accepted_at IS NOT NULL) OR status <> 'accepted')
);

CREATE UNIQUE INDEX invitations_one_pending_per_tenant_email_idx
  ON public.invitations (tenant_id, lower(invitee_email))
  WHERE status = 'pending';
CREATE INDEX invitations_tenant_created_idx ON public.invitations (tenant_id, created_at DESC);
CREATE INDEX invitations_email_status_idx ON public.invitations (lower(invitee_email), status);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;

CREATE POLICY invitations_select_manager ON public.invitations
  FOR SELECT TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

CREATE POLICY invitations_insert_manager ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    AND created_by = (SELECT auth.uid())
    AND role <> 'owner'::public.member_role
    AND status = 'pending'
  );

CREATE POLICY invitations_update_manager ON public.invitations
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]))
  WITH CHECK (
    private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[])
    AND role <> 'owner'::public.member_role
  );

CREATE POLICY invitations_delete_manager ON public.invitations
  FOR DELETE TO authenticated
  USING (private.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.member_role[]));

CREATE OR REPLACE FUNCTION public.accept_membership_invitation(raw_token text)
RETURNS TABLE(accepted_tenant_id uuid, accepted_role public.member_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation_row public.invitations%ROWTYPE;
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF current_user_id IS NULL OR current_email = '' THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;
  IF raw_token IS NULL OR char_length(raw_token) < 32 THEN
    RAISE EXCEPTION 'invalid_invitation';
  END IF;

  SELECT * INTO invitation_row
  FROM public.invitations
  WHERE token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invitation';
  END IF;
  IF invitation_row.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_not_pending';
  END IF;
  IF invitation_row.expires_at <= now() THEN
    UPDATE public.invitations
      SET status = 'expired', updated_at = now()
      WHERE id = invitation_row.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;
  IF lower(invitation_row.invitee_email) <> current_email THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;

  INSERT INTO public.memberships (tenant_id, user_id, role, active)
  VALUES (invitation_row.tenant_id, current_user_id, invitation_row.role, true)
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = CASE
      WHEN public.memberships.role = 'owner'::public.member_role THEN public.memberships.role
      ELSE EXCLUDED.role
    END,
    active = true;

  UPDATE public.invitations
    SET status = 'accepted', accepted_by = current_user_id, accepted_at = now(), updated_at = now()
    WHERE id = invitation_row.id;

  INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    invitation_row.tenant_id,
    current_user_id,
    'membership.invitation.accepted',
    'invitation',
    invitation_row.id::text,
    jsonb_build_object('role', invitation_row.role::text, 'email', invitation_row.invitee_email)
  );

  RETURN QUERY SELECT invitation_row.tenant_id, invitation_row.role;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_membership_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_membership_invitation(text) TO authenticated;

COMMIT;
