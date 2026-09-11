begin;

alter table public.workspace_requests
  add column mobile_phone text,
  add column whatsapp_phone text,
  add constraint workspace_requests_mobile_phone_format
    check (mobile_phone is null or mobile_phone ~ '^\+[1-9][0-9]{7,14}$'),
  add constraint workspace_requests_whatsapp_phone_format
    check (whatsapp_phone is null or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$');

drop policy workspace_requests_insert_own on public.workspace_requests;
create policy workspace_requests_insert_own
on public.workspace_requests for insert to authenticated
with check (
  user_id = (select auth.uid())
  and email = ((select auth.jwt()) ->> 'email')
  and mobile_phone is not null
  and whatsapp_phone is not null
  and status = 'pending_approval'
  and reviewed_by is null
  and reviewed_at is null
  and tenant_id is null
  and rejection_reason is null
);

drop policy workspace_requests_resubmit_own on public.workspace_requests;
create policy workspace_requests_resubmit_own
on public.workspace_requests for update to authenticated
using (user_id = (select auth.uid()) and status = 'rejected')
with check (
  user_id = (select auth.uid())
  and email = ((select auth.jwt()) ->> 'email')
  and mobile_phone is not null
  and whatsapp_phone is not null
  and status = 'pending_approval'
  and reviewed_by is null
  and reviewed_at is null
  and tenant_id is null
  and rejection_reason is null
);

commit;
