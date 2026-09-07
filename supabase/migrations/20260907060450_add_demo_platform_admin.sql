BEGIN;

-- Explicit demo Platform Admin used only to validate the control plane against
-- query-backed seed data. It is unmistakably a demo identity and can be removed
-- with the rest of the controlled demo dataset.
insert into public.platform_admins (user_id)
select '11111111-1111-4111-8111-111111111105'::uuid
where exists (
  select 1 from auth.users where id='11111111-1111-4111-8111-111111111105'::uuid
)
and not exists (
  select 1 from public.platform_admins where user_id='11111111-1111-4111-8111-111111111105'::uuid
);

COMMIT;