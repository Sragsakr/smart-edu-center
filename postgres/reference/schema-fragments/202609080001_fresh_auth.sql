-- INFRA-011: application-owned authentication foundation.
-- Passwords are never stored in public.users. The credential table is deliberately
-- separate so future authentication providers can be added without changing the
-- domain identity model.

create unique index app_users_email_auth_unique_idx
  on public.app_users (lower(email))
  where email is not null;

create table public.auth_password_credentials (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  password_digest text not null,
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_digest text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  user_agent text,
  ip_address inet,
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);

create index auth_sessions_user_active_idx
  on public.auth_sessions(user_id, expires_at)
  where revoked_at is null;

create index auth_sessions_expiry_idx
  on public.auth_sessions(expires_at)
  where revoked_at is null;

revoke all on public.auth_password_credentials from public;
revoke all on public.auth_sessions from public;

comment on table public.auth_password_credentials is
  'Application-owned password credentials; password_digest contains a versioned salted KDF output.';
comment on table public.auth_sessions is
  'Application-owned opaque sessions; only token digests are persisted.';
