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
- `IAM-005-03` centralized server-side authorization/DAL is complete for the shared authorization foundation and the existing team/invitation flow.
- `IAM-005-04` UI capability visibility can follow the same capability contract; UI remains non-authoritative.
- `IAM-005-05` tests should focus on server/application authorization now; database-specific authorization tests are deferred with `IAM-005-02`.

## IAM-005-03 implementation

The authorization layer is split so the business policy survives a backend migration:

- `src/lib/authorization/policy.ts` contains backend-agnostic roles, capabilities and allow/scoped/deny decisions.
- `src/lib/authorization/server.ts` resolves the authenticated user and active tenant membership on the server, then enforces capabilities before data access.
- Scoped capabilities require an explicit resource-scope callback rather than silently granting access.
- `src/app/team/actions.ts` now uses centralized capability checks for invitation creation/resend/revoke and membership activation/deactivation.
- `src/lib/team-access.ts` derives manager capability from the centralized policy instead of hardcoded role comparisons.
- `src/lib/authorization/policy.test.ts` verifies the core role/capability contract.

CI run #99 passed Test, Typecheck, Lint, Build/client-secret scan, dependency/secret scan, and migration safety.

## Current pointer

`IAM-005-03` is complete. `IAM-005-02` remains deferred. The next non-database task is `IAM-005-04` — use server-derived capabilities to show/disable UI actions without treating the UI as a security boundary.

## Revisit trigger

Revisit this decision when the replacement backend/database stack is selected. At that time the RBAC matrix must be mapped to the new backend's native authorization and data-isolation mechanisms.
