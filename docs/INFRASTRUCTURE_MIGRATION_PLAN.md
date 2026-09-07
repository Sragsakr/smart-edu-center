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
- CI orchestration: GitHub Actions using self-hosted runner(s)
- Build artifact: Docker image
- Runtime management: Coolify on Ubuntu VPS
- Application runtime: Next.js container
- Database: self-managed PostgreSQL
- Reverse proxy / TLS: managed through Coolify stack
- Production release: explicit/manual promotion after staging validation
- Backups: external/off-server database and application backup target
- Monitoring: service health, resource usage, logs, and uptime checks

## Migration order

1. INFRA-001 — Freeze and baseline current system
2. INFRA-002 — Provision and secure VPS
3. INFRA-003 — Install and harden Coolify
4. INFRA-004 — Dockerize Smart Edu Center
5. INFRA-005 — Configure self-hosted CI runner
6. INFRA-006 — Deploy staging while still using Supabase
7. INFRA-007 — Validate application outside Vercel
8. INFRA-008 — Provision PostgreSQL replacement
9. INFRA-009 — Introduce backend/data adapters and remove direct Supabase coupling
10. INFRA-010 — Migrate application database
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
- Production deployment must not be triggered simply because a developer pushed code.
- Database backups must exist outside the primary server before production cutover.
- Every production migration step must have a documented rollback procedure.
- Real owner/platform-admin accounts must not be deleted during migration.

## Exit criteria before product development resumes

- Staging runs fully on the replacement hosting stack.
- Production deployment is manually controlled.
- CI passes on the self-hosted runner.
- PostgreSQL backup and restore have both been tested.
- Authentication flows work for platform admin, management, student, and parent contexts.
- Tenant isolation and centralized authorization tests pass.
- Production rollback procedure has been tested or dry-run successfully.
- Monitoring and uptime checks are active.
- Vercel/Supabase dependency status is explicitly documented.

## Current task

CURRENT_INFRA_TASK: INFRA-001 — Freeze and baseline current system
NEXT_INFRA_TASK: INFRA-002 — Provision and secure VPS
