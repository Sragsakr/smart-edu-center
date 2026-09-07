# Backend Authorization Decision

Date: 2026-09-07
Status: Active decision

## Decision

Smart Edu Center is expected to move away from Supabase as its long-term backend. Until the replacement backend and persistence architecture are selected, we will not invest further in Supabase-specific authorization hardening such as new RLS policy matrices, Supabase-only helper functions, or authorization migrations that would be discarded during the migration.

## Current authorization boundary

For the current development phase, authorization validation is enforced at the application/server layer only:

- Every Server Action, Route Handler, and server-side data access path must validate the authenticated user.
- Tenant identity must be resolved on the server and must never be trusted from UI state alone.
- Role/capability checks must be performed before reads or mutations.
- Resource ownership/scope checks (for example teacher -> assigned cohort) must be performed server-side.
- Sensitive mutations must remain audited.
- UI visibility is convenience only and is never considered an authorization boundary.

Existing Supabase RLS policies remain in place as they are today. We will not add new Supabase-specific authorization policies unless required to fix an immediate production security defect.

## Roadmap effect

- `IAM-005-01` RBAC matrix remains valid and backend-agnostic.
- `IAM-005-02` database/RLS per-resource policy implementation is deferred until the replacement backend is chosen.
- `IAM-005-03` centralized server-side authorization/DAL becomes the active implementation task.
- `IAM-005-04` UI capability visibility can follow the server capabilities.
- `IAM-005-05` tests should focus on server/application authorization now; database-specific authorization tests are deferred with `IAM-005-02`.

## Revisit trigger

Revisit this decision when the replacement backend/database stack is selected. At that time the RBAC matrix must be mapped to the new backend's native authorization and data-isolation mechanisms.
