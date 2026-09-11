<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Smart Edu Center — Agent Guide

## Current task protocol

After reading this file and `README.md`, open `docs/MASTER_EXECUTION_PLAN.md`, the only authoritative execution plan. For engineering work, execute only its `CURRENT_TASK`. When it satisfies acceptance and quality gates, mark it complete, append the evidence to its execution log, and advance `CURRENT_TASK` and `NEXT_TASK`. Never create a parallel backlog, skip dependencies, or leave the pointer stale. `docs/ENGINEERING_PRINCIPLES.md` and `docs/RBAC_MATRIX.md` are specialist contracts, not competing plans.

## BUILD MODE — database rule (ACTIVE)

The product is still under active construction. **There are no real customers and no production customer data to preserve.** Until the owner explicitly declares **SCHEMA FREEZE / PRODUCTION DATA MODE**:

- The clean target domain model and canonical schema take priority over all existing disposable data. Existing demo users, tenants, students, sessions and test data must **not** constrain the target architecture.
- **Clean reset / rebuild / reseed is approved** whenever the canonical target schema changes.
- Do **not** write compatibility migrations whose only purpose is preserving disposable development data, and do **not** preserve obsolete schema structures because current demo data uses them.
- If useful demo data exists, snapshot it before the destructive reset, copy over only what is worth keeping, otherwise recreate canonical demo data from the seed.
- `postgres/migrations/` stays empty until schema freeze. `postgres/baseline/0001_smart_edu_center_clean.sql` is the single applicable schema. Never assume an early migration is a permanent public contract.
- **Auth rules:** never migrate old password hashes or sessions from an obsolete/Supabase auth system; recreate Fresh Auth demo credentials safely after the reset.
- **Mandatory gate before resetting the real local database:** first apply the baseline to a *disposable* PostgreSQL database and pass schema validation, tenant-isolation constraints, and `lint` / `typecheck` / `tests` / `build` / `check`. Without that evidence there is no reset.
- Approved post-reset sequence: apply the baseline only → canonical demo seed → recreate Fresh Auth Platform Admin → seed the `teacher` model demo → seed the `center` model demo → reconciliation counts → application smoke tests.
- Keep the current target data model documented in code/docs so a reset is reproducible. Never make an undocumented database-only decision.
- The development database `saboraty` is never used as a test database; integration tests use a separate loopback `TEST_DATABASE_URL` that must not equal `DATABASE_URL`.
- Staging and Production may also be cleanly rebuilt before launch since there are no customers, but **do not modify Production as part of design or schema work** unless an explicitly approved infrastructure step is being executed.
- After **SCHEMA FREEZE** is declared, this rule ends immediately: all schema changes become forward-only reviewed migrations with rollback/restore planning, and production data is never treated this way.

This Build Mode rule overrides older instructions in this repository that say every development schema change must be preserved through a new forward-only migration. Full decision: [`docs/adr/0005`](docs/adr/0005-canonical-baseline-and-disposable-reset.md).

## Access / portal model

There are four user experiences, but only two login surfaces:

1. **SaaS Platform Admin** — separate private entry at `/platform-control/login`, then `/platform-admin`. It is not linked from the public landing page and requires an explicit `platform_admins` row.
2. **Tenant Management** — center owner/admin/teacher/staff via the normal `/login`, then the management dashboard.
3. **Student Portal** — via the same normal `/login`, then `/student` when `students.user_id` matches the authenticated `app_users.id`.
4. **Parent / Guardian Portal** — via the same normal `/login`, then `/parent` when `guardians.user_id` matches the authenticated `app_users.id`.

Do not add role tabs to the login form. Authentication answers “who is this user”; protected database relationships decide which portals the user may enter. If one Auth user has more than one non-platform context, route to `/choose-context` and let the user switch portals without separate credentials.

Student and guardian identities are not tenant staff memberships. A student may be both a center student and, later, an LMS/online student through separate enrollment domains. LMS features must appear conditionally from product entitlement + online enrollment; never infer LMS access from being a center student.

Portal availability is entitlement-gated, not relationship-gated alone:

- `/student` requires the student relationship **and** a `platform.portal.student` entitlement on the related tenant.
- `/parent` requires the guardian relationship **and** a `platform.portal.guardian` entitlement.
- A `operations`-level tenant therefore keeps student/guardian records without issuing them platform accounts. That is the product design, not a bug.

The customer-type distinction (`teacher` vs `center`) is irrelevant to whether a portal opens — only the entitlement and the protected relationship decide.

The same applies to staff: internal centre staff (owner/admin/receptionist/accountant, and the teacher role as a membership) exist at the `operations` level, while the richer staff/teacher **portal** experience requires `management_platform`.

## Mission

Build a production-minded, Arabic-first multi-tenant center operating system that supports both educational centers and independent teachers, with an LMS sold as a separate product/entitlement rather than silently merging online students into center operations.

## Product contract — read before any product change

[`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md) is the mandatory reference for the commercial and domain model, and [`docs/adr/`](docs/adr/README.md) records the architecture decisions behind it. Summary of the non-negotiables:

### Two independent dimensions

| Dimension | Field | Values | Determines |
|---|---|---|---|
| Customer Type | `tenants.tenant_type` | `teacher` \| `center` | Catalog shape, navigation, organisation — **never** entitlements |
| Product Level | `tenants.product_level` | `operations` \| `management_platform` \| `learning_platform` | What is purchased — **never** catalog shape |

Never mix them. A `teacher` tenant may buy the full `learning_platform`; a `center` may stay on `operations`. **Never encode a commercial decision as `tenant.type === "center"`** — use the entitlement layer. `tenant_type` is only legitimate for shaping navigation, labels and defaults.

### Three decision layers

```text
Effective Access = Entitlement(tenant, capability) AND RBAC(role, action) AND Scope(resource)
```

- **Entitlement** — commercial; source of truth is `tenants.product_level` + `tenant_entitlements`, derived from a single `capability_catalog` (TypeScript module). Keys look like `ops.core`, `platform.exams`, `learning.video`.
- **RBAC** — role × action; `docs/RBAC_MATRIX.md` and `src/lib/authorization/policy.ts`. Keys look like `students.read`, `attendance.mark`.
- **Scope** — resource-level; database relationships.

Do not let one layer substitute for another, and do not mix the two key namespaces. An unentitled feature must be closed on the server with a clear `no_entitlement` state — hiding UI is not a boundary.

Entitlement source of truth lives in code, not in the dashboard: `src/lib/entitlements/capability-catalog.json` holds the definitions, `capability-catalog-rules.mjs` holds the shared validation used by both the app and the seed script, `capability-catalog.ts` is the typed surface, and `default-entitlements.ts` owns `defaultEntitlementsForLevel()` — the single derivation of level capabilities. `public.capability_catalog` is a reference copy for reporting and integrity, never a second source of truth. Sync it with `npm run seed:capability-catalog`.

### Academic catalog — separate concepts

`Subject` ≠ `Teacher` ≠ `Course` ≠ `Course Offering`. There must be no hard link between one Subject and one Teacher; use `course_teachers` (N:N). `course_offerings` is the sellable/enrollable unit (course + teacher + branch + room + mode + capacity + price). `cohorts` is the delivery/scheduling unit and must reference a `course_offering` — never carry `subject` or a teacher column directly. Enrolment is on the offering; attendance is on the cohort session.

Required navigation/filter paths: `Stage → Grade → Subject → Teacher → Course`, `Stage → Grade → Teacher → Courses`, and a global course catalog filterable by Stage/Grade/Subject/Teacher/Price. **"Global catalog" means the whole catalog of one tenant — it is not a cross-tenant marketplace.**

### Upgrade without loss

Upgrading `operations → management_platform → learning_platform → white-label` must never create another tenant, migrate data, or change codebase. Only entitlements expand. Downgrading must never delete customer data.

### Hosting

One codebase, multi-tenant, multi-brand, multi-domain. Saboraty Hosted (`name.saboraty.online`) and white-label/custom domain (`academy.com`) run the **same** application and runtime. Branding and domains are tenant data, never a fork or a separate deployment.

### Honest feature state

Anything that presents the product to a user (landing page, pricing) must label each feature **Available / Coming Soon / Planned**. Never present a planned feature as available.

## Product boundaries

- Operations product: students, guardians/contact data, groups, schedules, rooms/branches, attendance, fees, installments, payments, outstanding balances, expenses, notifications, operational/financial reports, staff/teachers for centers.
- Management Platform product: everything in Operations plus student/guardian/staff portals, homework, assignments/submissions, exams, results, files/materials, student progress, educational follow-up.
- Full Learning Platform product: everything above plus courses, lessons, video, learning materials, content access/entitlements, progress tracking, course enrolment, future live learning.
- Students/guardians do not necessarily need platform accounts — that is the entry-level SaaS level.
- Center Student and Online Student are separate relationships to one identity; do not use one `student_type` flag as the only discriminator.
- Not MVP: cross-tenant marketplace, full school SIS/ERP, owned video conferencing/streaming infrastructure, generic AI features.
- Arabic RTL is the default. Keep English/i18n structurally possible.
- Mobile-first for students/guardians; efficient desktop workflows for center staff.

## Required architecture

- Next.js App Router, React Server Components by default.
- Add `"use client"` only at the smallest interactive boundary.
- Reads belong in a server-only Data Access Layer; UI mutations use Server Actions; external webhooks use Route Handlers.
- Self-managed PostgreSQL provides application data and application-owned Fresh Auth. Keep `DATABASE_URL` server-only; do not add external database/auth SDK fallbacks. Protected file storage must use a separately approved private-storage design when that feature is implemented.
- No public runtime environment variables are currently required. If one is introduced, expose it through a typed public-env module and never expose server secrets; private values remain centralized in `src/lib/server-env.ts`.
- Every tenant business table must carry tenant scope **and enforced row-level security**. The SQL runtime must connect as the dedicated application role (`saboraty_app`, `NOSUPERUSER NOBYPASSRLS`); superusers and `BYPASSRLS` roles bypass every policy, so connecting as the owner silently disables isolation. See [`docs/adr/0007`](docs/adr/0007-tenant-isolation-row-level-security.md).
- Every DAL operation runs inside one transaction carrying an access context (`app.app_user_id`, `app.current_tenant_id`, `app.platform_scope`) set with `LOCAL` so it can never leak across pooled requests. Never query a protected table outside such a context, and never set a context without `LOCAL`.
- Platform scope is granted only from the verified `/platform-admin` path. `capability_catalog` is readable by any identity because it holds no business data; its writes are platform-scoped.
- Never authorize from `user_metadata`; authorization comes from protected database relationships/tables.
- Commercial capability must be centralized in the entitlement layer. Never scatter `product_level` comparisons through UI or domain code — call the entitlement helper.
- A student/guardian `user_id` link is scoped per tenant (`unique(tenant_id, user_id)`), so one person can be a student or guardian in more than one tenant through separate relationships on one identity.
- Branding and custom domains are tenant configuration rows (`tenant_branding`, `tenant_domains`). The Host header is untrusted input: resolve the tenant from a verified domain record, never by guessing. Branding never means a separate deployment or codebase.
- Prefer a modular monolith. Do not add Redis, queues, microservices, payment or messaging vendors until a demonstrated requirement needs them.
- `/platform-admin` is the SaaS control plane only. Platform Admin operational control does not imply permanent unrestricted reads of tenant student data; future support access must be time-bound and audited.
- Tenant staff accounts use memberships/roles. Student and guardian portal identities use verified `user_id` links and RLS; they must not be inserted into `memberships` just to make reads easy.
- `students.user_id` and `guardians.user_id` are written **only** through the trusted portal-claim flow (`portal_invitations`): token possession **and** a verified-email match **and** an unclaimed record, all three together. Never write that column from a generic CRUD path — it decides who can enter a portal under that person's name.
- `SELECT ... FOR UPDATE` applies the **UPDATE** policy, not just SELECT. Any locking read must therefore run inside a tenant context; a token-only path cannot lock a row.
- Access context lives exactly as long as its transaction. `set_config(..., true)` is `LOCAL`, so it is cleared at `COMMIT`/`ROLLBACK`. Every authorization helper in `src/lib/authorization/server.ts` therefore takes an **operation callback** and runs it inside the same transaction; the scoped executor throws `access context expired` if used after the transaction ends, instead of silently returning zero rows.
- An unauthenticated insert into an RLS-protected identity table must not use `INSERT ... RETURNING` unless its SELECT policy also permits that exact row at that moment. `app_users` self-signup intentionally permits INSERT before an identity exists but denies SELECT; generate the UUID in application code, insert without RETURNING, and use that known UUID. Do not weaken SELECT RLS to make RETURNING work.
- A visitor-facing token route cannot directly read a tenant-scoped table before the tenant is known. Resolve only the exact token through a narrow `security definer` function, then enter the returned tenant scope before locking or mutating the row. Staff invitations use `private.invitation_by_token`; portal invitations use `private.portal_invitation_by_token`.
- A workspace must always keep at least one active owner. Enforced in the database by the deferred constraint trigger `memberships_require_active_owner` (a row-level `CHECK` cannot express this invariant, and a unique index would forbid duplicates rather than absence), and made legible by `src/lib/auth/tenant-ownership.ts`. Deactivation of an owner is allowed only while another active owner remains.
- Parent access is relationship-scoped: guardian RLS may read only students linked through `student_guardians` and only data belonging to those children.
- LMS enablement must eventually come from an explicit product entitlement, not tenant type or user role.

## Security invariants

- Tenant and relationship isolation are mandatory in both DAL filters and database RLS.
- Validate every mutation server-side. Treat client inputs as hostile.
- Keep privileged environment access inside server-only modules.
- Use signed/private URLs for protected learning files.
- Record sensitive financial, attendance and role changes in audit logs.
- Authentication paths are rate limited in PostgreSQL (`private.auth_attempts`), never in an added cache or Redis. Keep two limits: a tight per-account limit and a wider per-source limit, so one shared network cannot lock out everyone. The success path must clear its own counters, and no raw identifier may be stored — only a sha256 bucket key. `x-forwarded-for` is untrusted input and must never be the only bucket.
- New exposed tables require RLS and positive/negative isolation tests.
- The academic catalog keeps five separate concepts: `stages` → `grades`, `subjects`, `teachers` (a tenant record that can exist without a login), `courses`, `course_teachers` (N:N assignment), `course_offerings` (the sellable unit), `cohorts` (delivery, referencing an offering), `enrollments` (commercial, on the offering) and `cohort_members` (delivery, on the cohort). A cohort must never carry a subject or a teacher column.
- `students.user_id` and `guardians.user_id` are unique per tenant (`unique(tenant_id, user_id)`), so one identity can hold student or guardian relationships in more than one tenant.
- A hidden/private-looking URL is not a security boundary; `/platform-control/login` still requires authenticated authorization checks.

## Working method

Use Node.js `22.23.2` from `.nvmrc`; CI installs dependencies with `npm ci`. PostgreSQL 18 is the target for every environment; the local machine runs it on port `5433` alongside the older 16 instance. `DATABASE_URL` is the application role, `MIGRATION_DATABASE_URL` is the owner used only for the baseline, seeding and test-database recreation.

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
- Before promotion, rehearse against a fresh, approved Production-data snapshot restored into Staging when Production data exists. Scrub or exclude secrets, session/recovery/invitation tokens, password hashes, and unnecessary PII; never point Staging at the live Production database. For an empty initial Production database, record the rehearsal as `N/A — empty source`.
- After successful Production verification, delete the task branch locally and remotely. End delivery with only the permanent `main` and `staging` branches and verify their repository trees represent the same delivered code.
- Staging and Production must use separate private PostgreSQL resources and environment values. Never reuse one environment's `DATABASE_URL` in the other.
- Vercel is not part of the repository integration, runtime, preview, or deployment path.

## UI rules

- Preserve RTL direction, Arabic copy, keyboard focus and semantic labels.
- Reuse design tokens in `globals.css`; brand purple is `#6547d9`.
- Avoid oversized text, excessive gradients, dense cards, and desktop-only tables.
- Empty, loading, offline and error states are product behavior, not polish.
- Management, Student and Parent portals should make the current context obvious in the header/navigation.
- Any screen that presents the product to a prospective customer (landing page, pricing) must label each capability **Available / Coming Soon / Planned** and must not imply that a planned capability already works. The landing page always shows the complete product vision with honest status.
- The landing page must keep the two dimensions visibly separate: customer type (teacher/center) is not the same axis as product level (Operations / Management Platform / Full Learning Platform).
- No-entitlement is a first-class UI state, not an error page: explain what the level adds and how to upgrade.

## Definition of done

A change is done only when it compiles, is lint-clean, has a safe data path, respects tenant/relationship isolation and the three decision layers (Entitlement → RBAC → Scope), works responsively, and is documented sufficiently for the next developer or agent. In Build Mode, “done” also means the canonical demo dataset and routing still represent the current product model rather than legacy assumptions.
