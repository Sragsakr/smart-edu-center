# Saboraty Engineering Constitution

This document is a permanent engineering rule for the project during the entire build phase and beyond.

## 1. Build-phase database rule

Saboraty is still under active development and is not yet a live production service.

Therefore:

- We do not optimize database work around zero-downtime migration constraints during the build phase.
- Existing development databases may be recreated from scratch when a cleaner final design requires it.
- Before destructive resets, take a complete snapshot/export so useful data is never lost accidentally.
- Existing useful data is treated as seed/reference data and may be transformed before reinsertion.
- The new schema is driven by the correct domain model, not by historical Supabase constraints.
- We do not preserve legacy structures solely for compatibility when a better structure is available.
- We may remap identifiers during reseeding if the final authentication/domain model benefits from it.
- Production-style migration complexity is introduced only when the product has real production data that requires it.

Preferred build flow:

`Design final domain/schema -> recreate database -> seed useful data -> validate -> test -> continue product development`

## 2. Clean Code is mandatory

Every implementation must favor clarity, maintainability, testability and explicit behavior over speed of delivery alone.

Required principles:

- Small, cohesive modules with one clear responsibility.
- Explicit names for domain concepts; avoid generic names such as `data`, `utils`, `manager`, `helper` unless genuinely appropriate.
- Avoid duplicated business rules. One authoritative implementation per invariant.
- Avoid hidden side effects and implicit global state.
- Prefer pure functions for business calculations and transformations.
- Keep framework-specific code at system boundaries where practical.
- No hard-coded secrets, environment-specific credentials or magic configuration values.
- Remove dead code instead of retaining speculative compatibility layers.
- Comments explain why, constraints and non-obvious trade-offs; code should explain what.
- Fail explicitly with actionable errors rather than silently swallowing failures.

## 3. Architecture rule

Architecture must follow the domain and use cases, not the UI framework or database vendor.

Default dependency direction:

`UI / Delivery -> Application / Use Cases -> Domain`

Infrastructure implements contracts owned by the application/domain side:

`Infrastructure -> Repository / Gateway contracts`

Core rules:

- Business/domain logic must not depend directly on Supabase, PostgreSQL, Coolify, Next.js routing or any specific external vendor.
- Data access must be isolated behind repositories or equivalent boundary abstractions when the abstraction has a real architectural purpose.
- Authentication, storage, messaging and external integrations use explicit adapters/gateways.
- Cross-cutting concerns such as authorization, validation, logging and configuration have centralized policies rather than page-by-page duplication.
- Composition/wiring happens in a dedicated composition boundary rather than importing concrete infrastructure throughout the codebase.
- Domain types and invariants are preferred over loose primitives where this materially reduces invalid states.

## 4. Design patterns

Patterns are tools, not goals. Use a pattern only when it reduces coupling, duplication or complexity.

Preferred patterns where appropriate:

- Repository for persistence boundaries.
- Adapter for vendor/external-service integration.
- Strategy for genuinely variable business behavior.
- Factory/composition root for infrastructure creation and dependency wiring.
- Use-case/application-service layer for business workflows spanning multiple repositories or policies.
- Value objects for important validated domain concepts.
- Domain events only when asynchronous decoupling or meaningful business-event modeling justifies them.

Avoid:

- Pattern-for-pattern's-sake abstractions.
- Deep inheritance hierarchies.
- Service locator / implicit dependency resolution.
- Generic repositories that erase meaningful domain semantics.
- Premature microservices.

## 5. Structure and boundaries

Code structure should be feature/domain-oriented as the product grows.

A target shape may include:

- `domain/` — entities, value objects, domain rules, domain services.
- `application/` — use cases, commands/queries, contracts/ports.
- `infrastructure/` — PostgreSQL, auth, storage, external adapters.
- `presentation/` — Next.js routes, pages, components and delivery logic.
- `shared/` — only genuinely cross-domain stable primitives.

The exact folders may evolve, but dependency direction and separation of concerns must remain clear.

## 6. Database best practices

For PostgreSQL:

- Model constraints in the database when they represent real data invariants.
- Use foreign keys deliberately and define delete behavior explicitly.
- Add indexes from real query/access patterns, not indiscriminately.
- Use transactions for multi-step state changes that must be atomic.
- Avoid N+1 query patterns.
- Keep tenant scoping explicit for all tenant-owned entities.
- Every high-risk multi-tenant query must have tests or validation proving tenant isolation.
- Use timestamps consistently and store timezone-aware instants where appropriate.
- Prefer schema changes that preserve semantic clarity over compatibility with old development schemas.
- Seed scripts must be deterministic and safe to rerun when practical.

## 7. Security by design

Security is part of architecture, not a final hardening task.

- Authorization is enforced server-side at trusted boundaries.
- Client-side checks are UX only, never the source of truth.
- Principle of least privilege applies to database users, services and secrets.
- Production databases must not be publicly exposed unless explicitly justified.
- Secrets remain server-only and are validated at startup.
- Sensitive operations require auditability.
- Tenant isolation is a release-blocking invariant.
- Inputs are validated at system boundaries.

## 8. Testing and quality gates

No task is considered complete merely because it works manually.

Relevant changes should include the appropriate combination of:

- Unit tests for domain/business rules.
- Integration tests for repositories, database behavior and external boundaries.
- Authorization/tenant-isolation tests for protected data paths.
- Regression tests for fixed defects.
- Typecheck, lint, tests and production build through CI.

Tests should target behavior and invariants rather than implementation details wherever possible.

## 9. Performance and scalability

Do not prematurely optimize, but do not create obvious scaling traps.

- Measure before major optimization decisions.
- Avoid unnecessary network/database round trips.
- Paginate unbounded collections.
- Treat expensive reporting separately from transactional request paths when needed.
- Add caching/Redis only for demonstrated needs such as hot reads, rate limiting, queues or distributed coordination.
- Design the application so PostgreSQL, storage and compute can later move to separate hosts without rewriting domain logic.

## 10. Change discipline

For every technical task:

1. Understand the domain requirement and existing architecture.
2. Choose the simplest design that maintains the architectural boundaries.
3. Reuse existing patterns when they are sound; improve them when they are not.
4. Do not introduce temporary hacks unless explicitly documented with a removal task.
5. Keep commits focused and meaningful.
6. Update architecture/decision documentation when a change alters a major boundary or long-term rule.
7. Prefer fixing root causes over patching symptoms.

## 11. Definition of Done

A technical task is Done only when:

- behavior meets the task requirement,
- the solution respects this constitution,
- code is clean and appropriately structured,
- security and tenant isolation are considered,
- tests/validation cover the meaningful risk,
- CI is green,
- documentation is updated when architecture or operational behavior changed,
- no known temporary workaround is hidden or undocumented.

## 12. Priority rule

When there is tension between speed and engineering quality during the build phase, choose the design that leaves Saboraty easier to extend, test, operate and scale, unless the extra complexity has no demonstrated value.

The goal is not maximum abstraction. The goal is a simple, explicit, high-quality architecture that can grow without repeated rewrites.
