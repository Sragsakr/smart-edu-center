begin;

alter function public.approve_workspace_request(uuid) set schema private;
alter function public.reject_workspace_request(uuid, text) set schema private;

revoke all on function private.approve_workspace_request(uuid) from public, anon;
revoke all on function private.reject_workspace_request(uuid, text) from public, anon;
grant execute on function private.approve_workspace_request(uuid) to authenticated;
grant execute on function private.reject_workspace_request(uuid, text) to authenticated;

create function public.approve_workspace_request(request_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.approve_workspace_request(request_id);
$$;

create function public.reject_workspace_request(request_id uuid, reason text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.reject_workspace_request(request_id, reason);
$$;

revoke all on function public.approve_workspace_request(uuid) from public, anon;
revoke all on function public.reject_workspace_request(uuid, text) from public, anon;
grant execute on function public.approve_workspace_request(uuid) to authenticated;
grant execute on function public.reject_workspace_request(uuid, text) to authenticated;

drop policy workspace_requests_insert_own on public.workspace_requests;
create policy workspace_requests_insert_own
on public.workspace_requests for insert to authenticated
with check (
  user_id = (select auth.uid())
  and email = ((select auth.jwt()) ->> 'email')
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
  and status = 'pending_approval'
  and reviewed_by is null
  and reviewed_at is null
  and tenant_id is null
  and rejection_reason is null
);

create index workspace_requests_reviewed_by_idx
  on public.workspace_requests(reviewed_by)
  where reviewed_by is not null;
create index platform_audit_actor_idx
  on public.platform_audit_logs(actor_user_id);

commit;
