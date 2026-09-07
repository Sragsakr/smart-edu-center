# Infrastructure Migration Plan

Status: ACTIVE

## Product development freeze

Effective immediately, product feature development is paused while the project migrates away from Vercel and Supabase.

No new product features should be started until the new infrastructure baseline is stable and the migration exit criteria below are met.

Current product-development checkpoint:
- IAM-005-04 implementation in progress / validation pending.
- IAM-005-02 remains deferred because database-specific authorization will be revisited on the replacement backend.
- Existing Vercel + Supabase environment remains the rollback baseline during migration.

## Migration objective

Move Smart Edu Center to infrastructure controlled by the project owner with explicit release control, portable deployment, database ownership, backup/restore procedures, and a clear rollback path.

## Target direction

- Source control: GitHub
- CI orchestration: GitHub Actions with reduced hosted-runner usage; self-hosted runner remains a later hardening step
- Runtime management: Coolify on Ubuntu VPS
- Application runtime: Next.js container
- Database: self-managed PostgreSQL
- Reverse proxy / TLS: managed through Coolify stack
- Production release: CI-gated Coolify deployment
- Backups: external/off-server database and application backup target
- Monitoring: service health, resource usage, logs, and uptime checks

## Migration order

1. INFRA-001 — Freeze and baseline current system — COMPLETE
2. INFRA-002 — Provision and secure VPS — COMPLETE
3. INFRA-003 — Install and harden Coolify — COMPLETE (operational hardening remains)
4. INFRA-004 — Containerize Smart Edu Center — COMPLETE via Coolify/Railpack baseline; explicit Docker image remains optional hardening
5. INFRA-005 — Configure CI/CD — COMPLETE for hosted GitHub Actions + Coolify; self-hosted runner deferred
6. INFRA-006 — Deploy staging while still using Supabase — COMPLETE
7. INFRA-007 — Validate application outside Vercel — COMPLETE
8. INFRA-008 — Provision PostgreSQL replacement — NEXT PHYSICAL INFRA STEP
9. INFRA-009 — Introduce backend/data adapters and remove direct Supabase coupling — COMPLETE for platform-admin data layer; expand adapters during migration as needed
10. INFRA-010 — Migrate application database — IN PROGRESS (application configuration prepared for dual backend)
11. INFRA-011 — Migrate authentication
12. INFRA-012 — Migrate storage, if used
13. INFRA-013 — Full staging validation and tenant-isolation/security tests
14. INFRA-014 — Production cutover with rollback window
15. INFRA-015 — Decommission Vercel/Supabase only after stability window

## Safety rules

- Do not delete or disable the current Vercel deployment during preparation.
- Do not delete or disable the current Supabase project during preparation.
- Do not expose PostgreSQL directly to the public internet unless a specific secured operational need is documented.
- Do not store production secrets in the repository.
- PostgreSQL mode must not be enabled until DATABASE_URL exists and the replacement schema/data are validated.
- Database backups must exist outside the primary server before production cutover.
- Every production migration step must have a documented rollback procedure.
- Real owner/platform-admin accounts must not be deleted during migration.

## Exit criteria before product development resumes

- Staging runs fully on the replacement hosting stack.
- CI/CD deployment path is stable and controlled.
- PostgreSQL backup and restore have both been tested.
- Authentication flows work for platform admin, management, student, and parent contexts.
- Tenant isolation and centralized authorization tests pass.
- Production rollback procedure has been tested or dry-run successfully.
- Monitoring and uptime checks are active.
- Vercel/Supabase dependency status is explicitly documented.

## Current task

CURRENT_INFRA_TASK: INFRA-010 — Prepare and migrate application database to self-managed PostgreSQL
NEXT_MANUAL_STEP: Provision a private PostgreSQL service in Coolify, then add DATABASE_URL to staging without switching DATA_BACKEND from supabase yet.
NEXT_INFRA_TASK: INFRA-011 — Migrate authentication after database parity is proven.
