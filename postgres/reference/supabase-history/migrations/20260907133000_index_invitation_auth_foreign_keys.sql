BEGIN;

CREATE INDEX IF NOT EXISTS invitations_created_by_idx
  ON public.invitations(created_by);

CREATE INDEX IF NOT EXISTS invitations_accepted_by_idx
  ON public.invitations(accepted_by)
  WHERE accepted_by IS NOT NULL;

COMMIT;
