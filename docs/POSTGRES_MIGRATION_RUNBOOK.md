# PostgreSQL Migration Runbook

Status: PREPARED — execution waits for the private Coolify PostgreSQL service.

## Safety position

- Supabase remains the source of truth until staging parity is proven.
- Production stays on `DATA_BACKEND=supabase` during preparation.
- PostgreSQL must stay private/internal; do not publish port 5432 to the internet.
- Keep user UUIDs stable by importing Supabase `auth.users.id` values into `public.app_users.id`.
- Do not switch reads or writes to PostgreSQL until schema, row counts, tenant counts, and critical flows are validated.

## Prepared portable schema

Apply in order:

1. `postgres/migrations/202609070001_portable_core.sql`
2. `postgres/migrations/202609070002_portable_platform.sql`

The portable schema intentionally excludes Supabase-specific `auth.uid()`, `auth.jwt()`, `anon`/`authenticated` grants, and Supabase RLS policies. Their authorization behavior must be provided by the application authorization layer before cutover.

## Data-copy order

Foreign-key-safe copy order:

1. `auth.users` -> `public.app_users` (`id`, `email`, `created_at` only for the database phase)
2. `tenants`
3. `platform_admins`
4. `memberships`
5. `branches`
6. `students`
7. `guardians`
8. `student_guardians`
9. `cohorts`
10. `enrollments`
11. `class_sessions`
12. `attendance`
13. `invoices`
14. `payments`
15. `audit_logs`
16. `workspace_requests`
17. `platform_audit_logs`
18. `password_reset_requests`

Authentication secrets/password hashes are not part of INFRA-010; authentication migration is INFRA-011.

## Validation gates

Before any backend switch:

- Run `postgres/validation/supabase_source_counts.sql` against Supabase.
- Run `postgres/validation/parity_counts.sql` against the replacement PostgreSQL database.
- Global counts must match for migrated entities.
- Per-tenant counts must match for tenant-owned entities.
- Every `tenants.created_by`, `memberships.user_id`, platform admin, reviewer, teacher, session creator, attendance marker, payment receiver, and audit actor UUID must resolve to `app_users` where required.
- No tenant can contain rows copied from another tenant.
- Staging smoke tests must pass while production remains on Supabase.

## Manual steps when Serag is back at the computer

1. Coolify -> project -> staging environment -> create PostgreSQL service.
2. Keep it private/internal only; no public port.
3. Save the internal connection URL as staging `DATABASE_URL`.
4. Keep `DATA_BACKEND=supabase`.
5. Apply the portable migrations to the empty PostgreSQL database.
6. Run schema validation and source counts.
7. Export/copy data in the documented order.
8. Run parity validation.
9. Only after parity and staging flow validation consider enabling PostgreSQL reads in staging.

## Rollback

Until production cutover, rollback is simply keeping or restoring `DATA_BACKEND=supabase`; the current Supabase project and Vercel rollback deployment remain untouched.
