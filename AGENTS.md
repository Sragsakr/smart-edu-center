<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Smart Edu Center — Agent Guide

## Current task protocol

After reading this file and `README.md`, open `docs/MASTER_EXECUTION_PLAN.md`, the only authoritative execution plan. For engineering work, execute only its `CURRENT_TASK`. When it satisfies acceptance and quality gates, mark it complete, append the evidence to its execution log, and advance `CURRENT_TASK` and `NEXT_TASK`. Never create a parallel backlog, skip dependencies, or leave the pointer stale. `docs/ENGINEERING_PRINCIPLES.md` and `docs/RBAC_MATRIX.md` are specialist contracts, not competing plans.

## BUILD MODE — database rule (ACTIVE)

The product is still under active construction and there is no customer/production data contract yet. Until the owner explicitly declares **SCHEMA FREEZE / PRODUCTION DATA MODE**:

- Prefer the simplest correct target schema over backward compatibility with demo/dev data.
- For major domain-model changes, it is acceptable and preferred to wipe disposable business/demo data and reseed a small canonical dataset instead of stacking compatibility migrations.
- Do **not** spend time writing migrations whose only purpose is preserving old demo rows or an obsolete development schema.
- Existing migration history may be consolidated/rebuilt before schema freeze; do not assume an early migration is a permanent public contract.
- Keep the current target data model documented in code/docs so a reset is reproducible. Never make an undocumented database-only decision.
- Preserve real owner/platform-admin Auth accounts during development resets unless the owner explicitly asks to delete them. Demo Auth users and all business demo data are disposable.
- Destructive reset operations require the owner's explicit instruction in the current task. The owner has currently authorized reset/reseed while Build Mode remains active.
- After **SCHEMA FREEZE** is declared, this rule ends immediately: all schema changes become forward-only reviewed migrations with rollback/restore planning.

This Build Mode rule overrides older instructions in this repository that say every development schema change must be preserved through a new forward-only migration.

## Access / portal model

There are four user experiences, but only two login surfaces:

1. **SaaS Platform Admin** — separate private entry at `/platform-control/login`, then `/platform-admin`. It is not linked from the public landing page and requires an explicit `platform_admins` row.
2. **Tenant Management** — center owner/admin/teacher/staff via the normal `/login`, then the management dashboard.
3. **Student Portal** — via the same normal `/login`, then `/student` when `students.user_id` matches the authenticated `app_users.id`.
4. **Parent / Guardian Portal** — via the same normal `/login`, then `/parent` when `guardians.user_id` matches the authenticated `app_users.id`.

Do not add role tabs to the login form. Authentication answers “who is this user”; protected database relationships decide which portals the user may enter. If one Auth user has more than one non-platform context, route to `/choose-context` and let the user switch portals without separate credentials.

Student and guardian identities are not tenant staff memberships. A student may be both a center student and, later, an LMS/online student through separate enrollment domains. LMS features must appear conditionally from product entitlement + online enrollment; never infer LMS access from being a center student.

## Mission

Build a production-minded, Arabic-first multi-tenant center operating system that supports both educational centers and independent teachers, with an LMS sold as a separate product/entitlement rather than silently merging online students into center operations.

## Product boundaries

- Management product: tenants, branches, roles, center students, guardians, groups, attendance, invoices/payments, content, assignments, objective quizzes, reports and notifications.
- LMS product: separate commercial module for online courses, activation/access, progress and exams; shared platform or branded/white-label academy will use the same multi-tenant runtime.
- Center Student and Online Student are separate relationships to one identity; do not use one `student_type` flag as the only discriminator.
- Not MVP: marketplace, full school SIS/ERP, owned video conferencing, generic AI features.
- Arabic RTL is the default. Keep English/i18n structurally possible.
- Mobile-first for students/guardians; efficient desktop workflows for center staff.

## Required architecture

- Next.js App Router, React Server Components by default.
- Add `"use client"` only at the smallest interactive boundary.
- Reads belong in a server-only Data Access Layer; UI mutations use Server Actions; external webhooks use Route Handlers.
- Self-managed PostgreSQL provides application data and application-owned Fresh Auth. Keep `DATABASE_URL` server-only; do not add external database/auth SDK fallbacks. Protected file storage must use a separately approved private-storage design when that feature is implemented.
- No public runtime environment variables are currently required. If one is introduced, expose it through a typed public-env module and never expose server secrets; private values remain centralized in `src/lib/server-env.ts`.
- Every tenant business table must carry tenant scope and RLS. Platform-scope tables such as `platform_admins`, `workspace_requests`, and `platform_audit_logs` are deliberate exceptions.
- Never authorize from `user_metadata`; authorization comes from protected database relationships/tables.
- Prefer a modular monolith. Do not add Redis, queues, microservices, payment or messaging vendors until a demonstrated requirement needs them.
- `/platform-admin` is the SaaS control plane only. Platform Admin operational control does not imply permanent unrestricted reads of tenant student data; future support access must be time-bound and audited.
- Tenant staff accounts use memberships/roles. Student and guardian portal identities use verified `user_id` links and RLS; they must not be inserted into `memberships` just to make reads easy.
- Parent access is relationship-scoped: guardian RLS may read only students linked through `student_guardians` and only data belonging to those children.
- LMS enablement must eventually come from an explicit product entitlement, not tenant type or user role.

## Security invariants

- Tenant and relationship isolation are mandatory in both DAL filters and database RLS.
- Validate every mutation server-side. Treat client inputs as hostile.
- Keep privileged environment access inside server-only modules.
- Use signed/private URLs for protected learning files.
- Record sensitive financial, attendance and role changes in audit logs.
- New exposed tables require RLS and positive/negative isolation tests.
- A hidden/private-looking URL is not a security boundary; `/platform-control/login` still requires authenticated authorization checks.

## Working method

Use Node.js `22.23.2` from `.nvmrc`; CI installs dependencies with `npm ci`.

1. Read `README.md`, this file, `docs/MASTER_EXECUTION_PLAN.md`, any specialist contract linked by the current task, and relevant local Next.js docs.
2. Inspect existing changes; never overwrite unrelated user work.
3. Confirm whether Build Mode is still active before choosing reset/reseed vs migration strategy.
4. Implement the smallest complete vertical slice.
5. Run `npm run check` and visually verify changed screens at mobile and desktop sizes when execution access is available.
6. Update README/docs/tests whenever behavior, routing, data model, seed accounts or setup changes.

### Delivery branches

- Feature and infrastructure branches open Pull Requests into `staging`, never directly into `main`.
- A successful push to `staging` deploys only Coolify Staging after the full CI gate.
- Production promotion uses a reviewed `staging` → `main` Pull Request; a successful push to `main` deploys only Coolify Production.
- Staging and Production must use separate private PostgreSQL resources and environment values. Never reuse one environment's `DATABASE_URL` in the other.
- Vercel is not part of the repository integration, runtime, preview, or deployment path.

## UI rules

- Preserve RTL direction, Arabic copy, keyboard focus and semantic labels.
- Reuse design tokens in `globals.css`; brand purple is `#6547d9`.
- Avoid oversized text, excessive gradients, dense cards, and desktop-only tables.
- Empty, loading, offline and error states are product behavior, not polish.
- Management, Student and Parent portals should make the current context obvious in the header/navigation.

## Definition of done

A change is done only when it compiles, is lint-clean, has a safe data path, respects tenant/relationship isolation, works responsively, and is documented sufficiently for the next developer or agent. In Build Mode, “done” also means the canonical demo dataset and routing still represent the current product model rather than legacy assumptions.
