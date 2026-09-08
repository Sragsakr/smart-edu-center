# PostgreSQL migration runbook

Status: PREPARED — waiting for replacement PostgreSQL service and staging `DATABASE_URL`.

## Scope

This runbook migrates the application database away from Supabase PostgreSQL without changing production traffic until validation is complete.

## Safety boundary

- Keep `DATA_BACKEND=supabase` in production until the explicit cutover step.
- Do not delete, pause, or modify the Supabase project as part of preparation.
- Do not expose the replacement PostgreSQL port publicly.
- Store `DATABASE_URL` only in server-side environment/secrets.
- Preserve every existing user UUID when copying `auth.users` identities into `public.app_users`.
- Take an off-server backup before production cutover.

## Prepared repository assets

1. `postgres/baseline/0001_smart_edu_center_clean.sql`
   - Canonical Build Mode baseline for the replacement database.
   - Combines the clean portable domain schema, platform workflows and Fresh Auth tables.
   - Uses `public.app_users`; it does not preserve the legacy Supabase schema as a compatibility contract.

2. `postgres/reference/schema-fragments/`
   - Historical source fragments retained for review only.
   - Do not apply these files; the canonical baseline is self-contained.

3. `postgres/validation/source-row-counts.sql`
   - Source snapshot against Supabase. `auth.users` is reported as `app_users` for comparison.

4. `postgres/validation/row-counts.sql`
   - Source snapshot against Supabase. `auth.users` is reported as `app_users` for comparison.

5. `postgres/validation/row-counts.sql`
   - Replacement PostgreSQL counts, referential-integrity checks and tenant-level comparisons.

## Execution sequence once the PostgreSQL service exists

### Phase A — connection only

1. Create a private PostgreSQL service in Coolify.
2. Add its internal connection string to staging as `DATABASE_URL`.
3. Keep staging `DATA_BACKEND=supabase`.
4. Verify the app still starts normally; this proves adding the secret alone causes no cutover.

### Phase B — empty schema

1. Connect to the replacement database over the private/internal path.
2. Drop/recreate the disposable replacement database, then apply only `postgres/baseline/0001_smart_edu_center_clean.sql`.
3. Verify all expected tables and indexes exist, including `auth_password_credentials` and `auth_sessions`.
4. Run `postgres/validation/row-counts.sql`; all tables should initially be empty and integrity checks zero.

### Phase C — source snapshot and copy

1. Run `postgres/validation/source-row-counts.sql` on Supabase and save the output.
2. Export user identity projection first: UUID, email and created timestamp from `auth.users` into `public.app_users`.
3. Copy application tables in foreign-key-safe order:
   - tenants
   - memberships
   - branches
   - students
   - guardians
   - student_guardians
   - cohorts
   - enrollments
   - class_sessions
   - attendance
   - invoices
   - payments
   - audit_logs
   - platform_admins
   - workspace_requests
   - platform_audit_logs
   - password_reset_requests
4. Preserve primary keys, timestamps and enum values exactly.
5. Reset identity sequences after copying identity-backed audit tables.

### Phase D — validation

1. Run target `row-counts.sql`.
2. Row counts must match source for every mapped table.
3. Every integrity-check result must be zero.
4. Tenant-level memberships/students/branches/cohorts must match the source snapshot.
5. Spot-check at least one center and one independent-teacher tenant.

### Phase E — application adapter

1. Add PostgreSQL implementation(s) behind the repository contracts.
2. Switch **staging only** to `DATA_BACKEND=postgres`.
3. Validate platform-admin, tenant, student and parent flows.
4. Keep production on Supabase during this entire phase.

### Phase F — later cutover

Cutover is not part of the preparation stage. It requires:
- successful staging validation,
- tested backup + restore,
- authorization/tenant-isolation tests,
- production rollback instructions,
- explicit approval before changing production `DATA_BACKEND`.

## Current manual blocker

The next infrastructure action that cannot be done from GitHub alone is creating the private PostgreSQL service in Coolify and obtaining its internal `DATABASE_URL` for staging.
