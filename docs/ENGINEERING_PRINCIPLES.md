# Saboraty Engineering Principles

Status: MANDATORY

These rules apply to every infrastructure, backend, frontend, database, authentication, storage, testing, and product task unless an explicit Architecture Decision Record (ADR) documents a justified exception.

## 1. Development-stage database rule

Saboraty is not yet a live production service. During the build phase, do not preserve a weak schema merely to perform a production-style migration.

Default approach:
1. Export/snapshot any existing useful development data before destructive work.
2. Design the correct target domain model and schema first.
3. Recreate the development database cleanly when structural changes justify it.
4. Seed/import only useful existing data into the new model, using explicit transformation/mapping when required.
5. Validate constraints, relationships, tenant ownership, and representative application flows.

Zero-downtime migration, dual-write, legacy-schema compatibility, and production cutover complexity are not requirements until the product has real production users or an explicit release constraint requires them.

Development data is disposable only after a recoverable snapshot/export exists. Production data, once the service launches, is never treated this way.

## 2. Architecture first

Choose structures based on domain boundaries and long-term maintainability, not framework convenience.

- Keep domain/business rules independent from transport, UI, database SDKs, and infrastructure providers.
- Use clear layers/boundaries: presentation/application/domain/infrastructure where the complexity warrants them.
- Depend on abstractions at provider boundaries so PostgreSQL, authentication, storage, messaging, and external integrations can evolve without leaking vendor APIs through the codebase.
- Prefer explicit composition roots/dependency wiring over hidden global coupling.
- Keep tenant ownership explicit in multi-tenant domain/data models.
- Record material architecture decisions in ADRs when the trade-off will matter to future development.

Do not add layers, interfaces, repositories, factories, or patterns solely for ceremony. Architecture must reduce coupling or protect a meaningful boundary.

## 3. Clean Code is the default

- Small, cohesive modules with one clear responsibility.
- Descriptive domain names; avoid vague names and unexplained abbreviations.
- Prefer simple readable control flow over cleverness.
- Remove dead code and obsolete compatibility paths when they are no longer required.
- Avoid duplicated business rules; establish a single source of truth.
- Keep side effects at system boundaries.
- Validate inputs at trust boundaries and model invariants as close to the domain/database as appropriate.
- Errors must be intentional, observable, and safe; never silently swallow important failures.
- Secrets never enter source control, client bundles, logs, fixtures, or documentation examples.

## 4. Design patterns

Use a design pattern only when the problem justifies it. Prefer the simplest pattern that protects the required boundary.

Commonly appropriate patterns include:
- Repository/Adapter for persistence or vendor boundaries.
- Strategy for genuinely interchangeable behavior.
- Factory/composition root for construction and dependency selection.
- Service/use-case layer for application workflows spanning multiple domain operations.
- Domain value objects/types when primitive values would allow invalid states.

Avoid pattern stacking and speculative abstractions.

## 5. Database best practices

- PostgreSQL is the primary target database.
- Design normalized relational structures first; denormalize only for a measured reason.
- Use database constraints, foreign keys, unique constraints, checks, and transactions to protect invariants.
- Add indexes from actual access paths and integrity needs; verify them as usage grows.
- Keep tenant boundaries explicit and test cross-tenant isolation.
- Avoid database-specific application coupling unless it provides clear value and is isolated behind an infrastructure boundary.
- Schema changes must be reproducible from version-controlled definitions/migrations even while development databases may be recreated.
- Seed data must be deterministic, safe, and separated from schema definition.

## 6. Security by design

- Least privilege by default.
- Server-only credentials remain server-only.
- Authentication and authorization are separate concerns.
- Authorization must be centralized and tested; UI hiding is never authorization.
- Public exposure of databases/internal services is denied by default.
- Sensitive operations require auditability where appropriate.
- Apply defense in depth without binding the core domain to a specific vendor.

## 7. Quality gates

Every material change should satisfy the applicable gates before it is considered complete:
- lint/format
- type checking
- automated tests for changed behavior
- build verification
- database/schema validation where applicable
- security/secret checks
- tenant-isolation tests for tenant-sensitive behavior

Fix the root cause rather than weakening a gate to make CI pass.

## 8. Performance and scalability

- Design for efficient queries, bounded reads, pagination, and sensible connection usage from the start.
- Avoid premature distributed-system complexity.
- Measure before introducing caching, queues, replicas, sharding, or denormalization.
- Keep application services stateless where practical so horizontal scaling remains possible.
- Load-test representative flows before production launch and before making capacity guarantees.

## 9. Best-practice selection rule

"Best practice" means the best fit for Saboraty's current requirements, risks, team, and expected scale—not automatically the newest technology or the most complex architecture.

When alternatives exist, prefer in this order:
1. correctness and data integrity
2. security and tenant isolation
3. maintainability and clarity
4. testability and observability
5. portability and operational simplicity
6. measured performance
7. implementation speed

If a faster implementation compromises the first five materially, do not choose it without an explicit documented decision.

## 10. Definition of Done

A task is not done merely because the happy path works. It is done when its architecture boundary is respected, code is understandable, relevant tests pass, failure/security cases are handled, documentation/ADR is updated when needed, and no known temporary shortcut is being silently carried forward.
