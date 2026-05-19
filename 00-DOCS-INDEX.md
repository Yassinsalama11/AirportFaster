# AirportFaster — Documentation Index

> Master index of the AirportFaster knowledge base. This is the **source of truth** map.
> Read `AGENTS.md` first, then docs in the order below.
>
> **Version:** 1.2 · **Last updated:** 2026-05-16

## Reading Order

| # | Document | Status | Purpose |
|---|----------|--------|---------|
| 0 | `AGENTS.md` | ✅ Current (v1.0) | Operating contract for all AI/human contributors. Read first. |
| 1 | `Product Architecture Definition (PAD)` | ✅ Current (v1.1) | Brand, vision, positioning, business model, scope, strategy. |
| 2 | `Business Requirements Document (BRD)` | ✅ Current (v1.1) | Business objectives and functional requirements. |
| 3 | `UX Architecture & Product Flows` | ✅ Current (v1.1) | Sitemap, page templates, customer + admin flows, booking lifecycle. |
| 4 | `System Architecture Document` | ✅ Current (v1.1) | Tech stack, backend modules, engines, rendering, security, infra. |
| 5 | `Database Architecture & Entity Relationship Design` | ✅ Current (v1.0) | Domains, tables, relationships, indexes, snapshots, migrations. |
| 6 | `Development Sprint Plan` | ✅ Current (v1.0) | Sprint-by-sprint MVP delivery sequence. |

## Logs (living documents)

| Document | Status | Purpose |
|----------|--------|---------|
| `DECISIONS.md` | ✅ Current (v1.0) | Architectural decision log — decision · rationale · date. |
| `ASSUMPTIONS.md` | ✅ Current (v1.0) | Logged assumptions awaiting founder confirmation. |

## Implementation Status

The Sprint 0 monorepo scaffold is created: `apps/web`, `packages/api`, `packages/db`, `packages/shared`, `packages/jobs`, root pnpm workspace config, Turborepo task orchestration, shared TypeScript config, ESLint, Prettier, and baseline package scripts are in place. See `TASKS.md` T-001 and `DECISIONS.md` D-010.

Sprints 0–9 were executed (T-001..T-079 marked done), but a **2026-05-16 audit** found three MVP violations: (1) seven admin pages (`cms`, `notifications`, `operations`, `refunds`, `roles`, `services`, `settings`) shipped as 17-line "Coming in Sprint 1+" stubs; (2) `next-intl` is not installed, `<html lang="en">` is hardcoded, and Arabic + full RTL — an MVP requirement per AGENTS.md §10 — is entirely absent; (3) the visual layer lacks a design system (emoji icons in the admin Sidebar; no Lucide / Radix / shadcn / framer-motion; minimal Tailwind tokens) — contradicting AGENTS.md §2 premium positioning. Concurrently, post-MVP scope was built in violation of AGENTS.md §14 and D-002: native mobile (`apps/mobile/`), customer accounts, corporate, supplier portal, and developers/API page.

**Remediation in progress** under TASKS.md "Remediation Block — Post-Audit Gap Closure (2026-05-16)", tickets **T-080..T-094**, governed by DECISIONS.md D-011..D-014. T-094 is complete: non-MVP scope is frozen (not deleted) behind `AIRPORTFASTER_FREEZE_NON_MVP`, frozen routes return 404 when enabled, and default builds exclude `@airportfaster/mobile` while explicit mobile builds remain available. T-080 is complete: the web app uses `next-intl`, all public/admin routes live under `app/[locale]`, `/en` and `/ar` resolve, and `<html lang dir>` switches between `en/ltr` and `ar/rtl`. Remaining order: string translation → design system → admin stub completion.

## Proposed Next Docs (not yet created)

| Document | Status | Purpose |
|----------|--------|---------|
| `API Specification` | 🔜 Proposed | Public / admin / supplier API contracts. |
| `AI SEO & Translation Engine Spec` | 🔜 Proposed | Prompt design, draft→approve→publish workflow, logging, cost control. |
| `Pricing & Availability Engine Spec` | 🔜 Proposed | Rule precedence, snapshot logic, edge cases. |
| `Notifications & Templates Spec` | 🔜 Proposed | Channels, templates, queue/retry, delivery logging. |
| `Security & Compliance Spec` | 🔜 Proposed | Threat model, RBAC matrix, GDPR/data retention, PCI scope. |
| `UI Design System` | 🚧 In Progress | Tokens, components, RTL rules, premium visual language. See `docs/UI-Design-System.md`. |
| `QA Test Plan` | 🔜 Proposed | Test strategy across booking, payments, SEO, admin. |

## Housekeeping Recommendation

The six knowledge-base docs are stored at the project root with **no file extension**. Recommended (pending approval): move them into `docs/`, rename with `.md` extensions and numeric prefixes (e.g. `docs/01-product-architecture-definition.md`) for correct rendering and a stable reading order. `AGENTS.md`, `00-DOCS-INDEX.md`, `DECISIONS.md`, and `ASSUMPTIONS.md` stay at the project root.

## Document Conventions

Every doc carries a header with **Version** and **Last updated**. When a doc changes: bump the version, update the date, log the change in `DECISIONS.md`, and update this index if the doc set changed.
