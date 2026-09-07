# Infrastructure Migration Plan

Status: ACTIVE

## Engineering baseline

All work in this plan and all subsequent product work must follow `docs/ENGINEERING_PRINCIPLES.md`.

Clean Code, appropriate architecture, explicit domain/infrastructure boundaries, database integrity, security, testability, and maintainability are mandatory defaults. Patterns and abstractions are used when they protect a real boundary or solve a real problem, not as ceremony.

## Product development freeze

Effective immediately, product feature development is paused while the project migrates away from Vercel and Supabase.

No new product features should be started until the new infrastructure baseline is stable and the migration exit criteria below are met.

Current product-development checkpoint:
- IAM-005-04 implementation in progress / validation pending.
- IAM-005-02 remains deferred because database-specific authorization will be revisited on the replacement backend.
- Existing Vercel + Supabase environment remains a recovery/reference baseline during infrastructure replacement.

## Development-stage rebuild rule

Saboraty has not launched to production users yet. Therefore the infrastructure replacement must optimize for the clean final architecture rather than production-style migration compatibility.

During the build phase:
- Snapshot/export existing development data before destructive changes.
- The new domain model and PostgreSQL schema are designed cleanly first; the Supabase schema is not a compatibility contract.
- Development databases may be dropped/recreated when that produces a materially better structure.
- Useful existing data is transformed and re-seeded/imported into the new model after recreation.
- Stable legacy IDs are preserved only when they provide real value; otherwise explicit mappings may be used.
- Zero-downtime migration, dual-write, incremental cutover, and 1:1 schema parity are not requirements before launch.
- Once real production users/data exist, destructive-development rules stop applying and production-safe migration/rollback rules become mandatory.

## Migration objective

Move Saboraty to infrastructure controlled by the project owner with explicit release control, portable deployment, database ownership, backup/restore procedures, clean provider boundaries, and a scalable production-ready architecture before public launch.

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
4. INFRA-004 — Containerize Saboraty — COMPLETE via Coolify/Railpack baseline; explicit Docker image remains optional hardening
5. INFRA-005 — Configure CI/CD — COMPLETE for hosted GitHub Actions + Coolify; self-hosted runner deferred
6. INFRA-006 — Deploy staging while still using Supabase — COMPLETE
7. INFRA-007 — Validate application outside Vercel — COMPLETE
8. INFRA-008 — Provision PostgreSQL replacement — NEXT PHYSICAL INFRA STEP
9. INFRA-009 — Introduce backend/data adapters and remove direct Supabase coupling — COMPLETE for platform-admin data layer; expand clean provider boundaries as the replacement backend is built
10. INFRA-010 — Build clean PostgreSQL application database — IN PROGRESS; design/recreate/seed strategy replaces production-style parity migration
11. INFRA-011 — Replace authentication with the target architecture
12. INFRA-012 — Replace storage, if used
13. INFRA-013 — Full staging validation, tenant-isolation/security tests, and load tests
14. INFRA-014 — Production launch readiness and final clean deployment
15. INFRA-015 — Decommission Vercel/Supabase only after the replacement stack is verified and useful development data is safely retained

## Safety rules

- Do not delete or disable the current Vercel deployment during preparation.
- Do not delete or disable the current Supabase project until a recoverable export exists and the replacement stack/data have been verified.
- Development data may be rebuilt only after a recoverable snapshot/export exists.
- Do not expose PostgreSQL directly to the public internet unless a specific secured operational need is documented.
- Do not store production secrets in the repository.
- PostgreSQL application mode must not be enabled until the target schema is valid and required seed/import data is ready.
- Database backups must exist outside the primary server before public production launch.
- Tenant isolation and authorization must be tested independently of UI behavior.

## Exit criteria before product development resumes

- Staging runs fully on the replacement hosting stack.
- CI/CD deployment path is stable and controlled.
- Clean PostgreSQL schema can be recreated deterministically from version control.
- Useful legacy development data can be seeded/imported into the new schema.
- PostgreSQL backup and restore have both been tested.
- Authentication flows work for platform admin, management, student, and parent contexts.
- Tenant isolation and centralized authorization tests pass.
- Monitoring and uptime checks are active.
- Vercel/Supabase dependency status is explicitly documented.
- Engineering principles and architecture boundaries are enforced by review/tests where practical.

## Current task

CURRENT_INFRA_TASK: INFRA-010 — Build the clean self-managed PostgreSQL application database and deterministic seed/import path
NEXT_MANUAL_STEP: Provision a private PostgreSQL service in Coolify. Keep the current Supabase environment only as a temporary data/reference source while the clean target database is built.
NEXT_INFRA_TASK: INFRA-011 — Replace authentication after the clean database/domain baseline is established.
