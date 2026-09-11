begin;

alter table public.tenants
  add column account_type text not null default 'center'
  check (account_type in ('center', 'independent_teacher'));

create index tenants_account_type_idx on public.tenants(account_type);

commit;
