<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Smart Edu Center — Agent Guide

## Current task protocol

After reading this file and `README.md`, open `docs/MASTER_DELIVERY_PLAN.md` and `docs/TECHNICAL_EXECUTION_BACKLOG.md`. For engineering work, execute only `CURRENT_TECHNICAL_TASK`. When it satisfies acceptance and quality gates, mark it complete, append the commit/test result to the execution log, and advance both task pointers. Never skip dependencies or leave either plan stale.

## Mission

Build a production-minded, Arabic-first multi-tenant center operating system. Optimize for a fast Egyptian tutoring-center pilot, not a broad generic LMS or marketplace.

## Product boundaries

- MVP: tenants, branches, roles, students, guardians, groups, attendance, invoices/payments, content, assignments, objective quizzes, reports and notifications.
- Not MVP: marketplace, full school SIS/ERP, owned video conferencing, generic AI features.
- Arabic RTL is the default. Keep English/i18n structurally possible.
- Mobile-first for students/guardians; efficient desktop workflows for center staff.

## Required architecture

- Next.js App Router, React Server Components by default.
- Add `"use client"` only at the smallest interactive boundary.
- Reads belong in a server-only Data Access Layer; UI mutations use Server Actions; external webhooks use Route Handlers.
- Supabase provides Auth, PostgreSQL and Storage. Never expose a service-role key.
- Read public environment variables through the typed contract in `src/lib/env.ts`, not directly from `process.env`. Future private variables belong in a `server-only` module and must never be re-exported to client code; `npm run check:client-secrets` enforces the client-bundle boundary.
- Treat the environment matrix and promotion runbook in `README.md` as canonical: Development and Preview use non-production data, `main` targets Production, and migrations reach Preview before Production.
- Every business table must have `tenant_id`, RLS enabled, and deny access unless an active membership exists.
- Never authorize from `user_metadata`; membership and role data must come from protected database tables or trusted app metadata.
- Prefer a modular monolith. Do not add Redis, queues, microservices, payment or messaging vendors until a demonstrated requirement needs them.

## Security invariants

- Tenant isolation is mandatory in both DAL filters and database RLS.
- Validate every mutation server-side. Treat client inputs as hostile.
- Keep privileged environment access inside server-only modules.
- Use signed/private URLs for protected learning files.
- Record sensitive financial, attendance and role changes in audit logs.
- New exposed tables require RLS and both positive/negative tenant-isolation tests.

## Working method

Use Node.js `22.23.2` from `.nvmrc`; CI installs dependencies with `npm ci`.

1. Read `README.md`, this file, and relevant local Next.js docs.
2. Inspect existing changes; never overwrite unrelated user work.
3. Implement the smallest complete vertical slice.
4. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
5. Visually verify changed screens at mobile and desktop sizes.
6. Update README/migrations/tests when behavior or setup changes.

## UI rules

- Preserve RTL direction, Arabic copy, keyboard focus and semantic labels.
- Reuse design tokens in `globals.css`; brand purple is `#6547d9`.
- Avoid oversized text, excessive gradients, dense cards, and desktop-only tables.
- Empty, loading, offline and error states are product behavior, not polish.

## Definition of done

A change is done only when it compiles, is lint-clean, has a safe data path, respects tenant isolation, works responsively, and is documented sufficiently for the next developer or agent.
