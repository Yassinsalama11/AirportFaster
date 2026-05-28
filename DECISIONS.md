# AirportFaster — Architecture Decision Log

> Every architectural or significant product decision is recorded here with rationale.
> Format: ID · date · decision · rationale · status. Newest at top.
>
> **Version:** 1.1 · **Last updated:** 2026-05-28

---

### D-017 — Supplier price imports are source-tracked and idempotent
**Date:** 2026-05-28 · **Status:** Accepted
GM Travel Solution pricing is imported through direct WordPress/WooCommerce JSON endpoints where available, with rendered page parsing used only to locate embedded WooCommerce product IDs that are not exposed as a structured airport-price API. Imported pricing rules store `sourceName`, `sourceExternalId`, and `sourceSyncedAt`, with a unique source key so future syncs update existing rows instead of duplicating them. **Rationale:** supplier pricing must support repeatable bulk syncs, operational review of failed mappings, and future scheduled jobs without breaking booking price snapshots. **Impact:** `import_logs` records each run, `failed_imports` records unmapped airports/products/services, and GM Travel Solution is stored as the supplier source on imported pricing rules.

### D-016 — Supplier commission is included in customer booking quotes
**Date:** 2026-05-26 · **Status:** Accepted
When a selected pricing rule is tied to a supplier, the supplier `commissionPercent` is added to the customer-facing quote and included in the booking price snapshot margin. **Rationale:** supplier commission is part of the sell price, not only an admin-side reporting value; the review page and backend quote must show the same total before Stripe payment. **Impact:** public pricing payloads include the supplier commission percent for supplier-backed rules, the client review calculation matches the backend pricing engine, and supplier commission is folded into `markupMinor`/`marginMinor` at booking time.

### D-015 — Admin roles become configurable with invite-based password setup
**Date:** 2026-05-26 · **Status:** Accepted
Roles & Permissions now manages real admin users, role-to-permission assignments, and team invitations. Invited users receive a set-password email using the existing signed password-reset token flow. **Rationale:** admin access control must be operationally editable without developer intervention and without fake/demo user data. **Impact:** role changes and user invitations require `roles.write`, are audit logged, and use production email configuration.

### D-014 — Remediation work order: Arabic + RTL → Design system → Admin stub completion
**Date:** 2026-05-16 · **Status:** Accepted (founder decision)
Post-audit remediation runs in a fixed order: (1) i18n foundation + EN/AR translation (T-080..T-082), (2) design system + premium visual layer (T-083..T-085), (3) seven stubbed admin modules (T-086..T-092), with audit sweep (T-093) closing the block. **Rationale:** every UI change made before RTL is in place will need to be redone for RTL; every component built before the design system exists will become legacy; admin stubs depend on both. Doing them in this order minimises rework. **Impact:** see TASKS.md "Remediation Block — Post-Audit Gap Closure (2026-05-16)".

### D-013 — Premium UI stack: shadcn/ui + Radix + Lucide + framer-motion, CVA variants, Tailwind tokens
**Date:** 2026-05-16 · **Status:** Accepted
The AirportFaster premium design system is built on shadcn/ui (component recipes copied into the repo, not a black-box dep), Radix primitives (a11y + behaviour), Lucide React (iconography — no emoji in production), framer-motion (motion), tailwindcss-animate (utility motion), and class-variance-authority + tailwind-merge for variant ergonomics. Typography, spacing, animation durations/easings, shadow ramp, and brand colour scales live in `tailwind.config.ts` and `globals.css` as tokens, not ad-hoc utility classes. **Rationale:** matches AGENTS.md §2 premium positioning; gives us a design system we own (shadcn copies code, no version lock-in); maximises accessibility via Radix; RTL-first because Tailwind logical properties + Radix RTL handling cover it without per-component work. **Impact:** see T-083.

### D-012 — i18n stack: next-intl with [locale] route segment, en + ar MVP, RTL via html dir
**Date:** 2026-05-16 · **Status:** Accepted (founder decision: Arabic first)
The AirportFaster web app uses `next-intl` for i18n on Next.js 15 App Router. All routes live under `app/[locale]/...`. Locale is negotiated from URL → cookie → `Accept-Language` via `next-intl/middleware`. `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` is set per request — no hardcoded `lang="en"`. UI strings live in `apps/web/messages/{en,ar}.json` with namespaced keys; admin and public share the file with separate namespaces. Staff users have a `preferredLocale` on their profile for admin UI language independent of URL. Content data (airport descriptions, service explainers, etc.) continues to use the per-locale content-snapshot model in DB Architecture §10/§16 — separate concern from UI strings. **Rationale:** `next-intl` is the de-facto App Router i18n library, supports SSG/SSR/ISR, has first-class TS, and `[locale]`-segment routing is required for SEO (hreflang, locale-specific URLs). **Impact:** see T-080..T-082.

### D-011 — Non-MVP scope (mobile, customer accounts, corporate, supplier portal, developers) is frozen, not deleted
**Date:** 2026-05-16 · **Status:** Accepted (founder decision)
Audit on 2026-05-16 found that `apps/mobile/`, customer account routes, `admin/corporate`, `supplier-portal`, and `(public)/developers` were built despite AGENTS.md §14 / D-002 placing them post-MVP. Founder decision: keep the code in the repo but freeze it — hide from navigation, return 404 in production behind a `AIRPORTFASTER_FREEZE_NON_MVP=true` flag, exclude `apps/mobile/` from default builds, and mark the originating tasks (T-070, T-071, T-073, T-074, T-079) with status `frozen` pointing to T-094. **Rationale:** preserves any salvageable work for the post-MVP revival under proper specs; eliminates ongoing maintenance and reviewer confusion; redirects effort back to MVP gaps (Arabic, design system, admin stubs); avoids the irreversible cost of deletion. **Impact:** see T-094.

### D-012 — Customer-selected pricing categories drive booking quotes
**Date:** 2026-05-25 · **Status:** Accepted
AirportFaster exposes all active pricing rules for a selected airport service as customer-selectable service categories during booking. The selected pricing rule is sent into draft booking creation and snapshotted through the pricing engine. **Rationale:** supplier price lists are category-based (standard per-passenger, first-passenger plus extra passenger, and private group models), so customers must choose the category before payment instead of the platform silently choosing one rule. **Impact:** public airport detail responses include all active rules, quote selection can be constrained by direction and selected rule, and the booking UI presents categories as premium service options rather than generic tiers.

### D-010 — pnpm workspace with Turborepo for the modular monorepo
**Date:** 2026-05-14 · **Status:** Accepted
AirportFaster uses a pnpm workspace with Turborepo tasks for root-level `build`, `lint`, `typecheck`, `test`, `dev`, and `clean` orchestration across `apps/web`, `packages/api`, `packages/db`, `packages/shared`, and `packages/jobs`. **Rationale:** this matches the modular-monolith architecture, keeps package boundaries explicit, and gives fast local/CI task fan-out without introducing service-level deployment complexity before scale requires it.

### D-009 — Existing docs get version headers + review appendices, not full rewrites
**Date:** 2026-05-14 · **Status:** Accepted
Rather than rewriting the four founding docs, each gets a version header and a "Document Review & Corrections" appendix that records contradictions found and how they were resolved. **Rationale:** preserves strategic intent and traceability while aligning the docs; full rewrites risk losing nuance.

### D-008 — Pricing engine supports both fixed price and cost+markup, configurable per airport/service
**Date:** 2026-05-14 · **Status:** Accepted (founder decision)
The pricing engine supports two modes selectable per airport/service row: (a) fixed AirportFaster price, (b) supplier cost + markup. **Rationale:** founder wants flexibility to match supply reality airport-by-airport. **Impact:** `pricing_rules` carries a `mode` discriminator; supplier cost still always tracked for margin reporting; pricing is snapshotted at booking time regardless of mode.

### D-007 — Charge customer at checkout
**Date:** 2026-05-14 · **Status:** Accepted (founder decision)
Payment is captured immediately at checkout via Stripe Payment Intents. If a supplier cannot fulfil, a refund is issued. **Rationale:** maximises conversion and cash flow. **Impact:** robust refund flow is MVP-critical; booking lifecycle goes Paid → Pending Supplier Assignment without an auth-hold state.

### D-006 — AirportFaster is merchant of record
**Date:** 2026-05-14 · **Status:** Accepted (founder decision)
AirportFaster collects the full customer payment and settles suppliers separately. **Rationale:** owns customer experience, margin, refunds, and cash flow — consistent with infrastructure/marketplace positioning. **Impact:** requires a `settlements` ledger, supplier payout tracking, and tax-handling readiness in the DB and Finance module.

### D-005 — AI content and translations never auto-publish
**Date:** 2026-05-14 · **Status:** Accepted (from project instructions)
OpenAI generates drafts only; workflow is Draft → Review → Edit → Approve → Publish, fully logged. **Rationale:** quality, brand safety, SEO penalty avoidance.

### D-004 — Pricing, margin, and policy snapshotted at booking time
**Date:** 2026-05-14 · **Status:** Accepted
Bookings store immutable snapshots of price, currency, supplier cost, margin, and cancellation policy. **Rationale:** financial truth must not change when live config changes.

### D-003 — Modular monolith, Fastify + Prisma + PostgreSQL + Redis
**Date:** 2026-05-14 · **Status:** Accepted (from project instructions)
Start as a modular monolith with strict domain boundaries; extract services only when scale forces it.

### D-002 — Guest checkout only in MVP; customer accounts later
**Date:** 2026-05-14 · **Status:** Accepted (from PAD)
Customers book as guests and manage bookings via secure signed links. **Impact:** `customers` table exists and is keyed by email/phone for history, but no auth credentials for customers in MVP.

### D-001 — Stripe is the sole payment provider for MVP
**Date:** 2026-05-14 · **Status:** Accepted
Payment Intents, webhooks with signature validation, multi-currency, refunds/partial refunds. No other gateway in MVP.
