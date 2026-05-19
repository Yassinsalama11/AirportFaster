# AGENTS.md — AirportFaster AI Agent Operating File

> **Purpose:** This is the operating contract for every AI agent (and human) working on AirportFaster.
> Read this file **first**, before reading any other doc, writing any code, or changing any architecture.
> If anything here conflicts with a request, surface the conflict before proceeding.

**Version:** 1.0 · **Last updated:** 2026-05-14 · **Owner:** Founder (Yassin) + Lead Architect agent

---

## 1. Project Mission

AirportFaster is a **global premium airport experience platform** — an airport-services **infrastructure and marketplace** layer that aggregates Fast Track, Meet & Greet, and Lounge Access (and, later, the full airport-services category) into one unified booking and operations platform.

The mission is to become the **default booking and operations infrastructure for premium airport services worldwide**, expanding airport-by-airport, monetising from day one through per-booking commission, and being built — from the first commit — to be **acquisition-ready** for Booking Holdings, Expedia, Amex, Priority Pass, Plaza Premium, Blacklane, airlines, OTAs, or airport-service groups.

## 2. Brand Positioning

AirportFaster **is**: a scalable global travel-tech startup, a premium airport technology platform, a future acquisition-ready infrastructure company.

AirportFaster **is NOT**: a Fast Track website, a travel agency, a local concierge service, an airport transfer company, a tourism office.

Everything — product, UX, code quality, copy, docs — must reinforce: *premium, minimal, fast, international, airline-grade, trustworthy, globally scalable.* Visual direction: matte black, deep navy, white, champagne-gold accents; the feel of Amex Platinum / Emirates Business / Apple / Blacklane.

## 3. Technical Principles

1. **Search-first** — the search → book journey is the core product.
2. **SEO-first** — every public page is server-rendered, structured, and AI-discoverable by design.
3. **Operations-first** — the admin dashboard is the operational heart; bookings, suppliers, incidents, payments must always be visible, trackable, controllable.
4. **Dynamic, admin-controlled** — no hardcoded airports, services, prices, content, or SEO pages. Launching a new airport requires **zero developer intervention**.
5. **AI-assisted, never AI-autonomous** — AI drafts; humans approve and publish.
6. **Real business logic** — no fake/demo systems in production flows. Anything stubbed must be clearly marked `// DEMO` / `// STUB`.
7. **Fast execution, no over-engineering** — modular monolith now, microservices only when scale forces it.
8. **Snapshot financial truth** — pricing, margins, and payment state are snapshotted at booking time, never recomputed from live config.

## 4. Architecture (binding decisions)

- **Style:** Modular monolith with strict domain boundaries; modules isolated so they can later be extracted into services.
- **Stack:** Next.js (frontend) · Node.js + **Fastify** (backend) · **PostgreSQL** · **Prisma** (ORM) · **Redis** (cache/queues/rate limiting) · **Stripe** (payments) · S3-compatible object storage · CDN · Sentry (monitoring) · PostHog (analytics) · OpenAI API (AI SEO + translation drafts).
- **Search:** PostgreSQL full-text search for MVP; Meilisearch/Typesense later.
- **Rendering:** SSG for stable airport/service pages, SSR for search, ISR/cache-invalidation on admin publish.
- **Core backend modules:** Auth & RBAC · Airports · Services · Search · Availability · Pricing · Bookings · Payments · Stripe Webhooks · Suppliers · Operations · Incidents · Refunds · Notifications · Flight Data · CMS/SEO · AI SEO Engine · AI Translation Engine · Analytics · Audit Logs · Settings.

## 5. Repository / Folder Structure (proposed)

```
airportfaster/
├── AGENTS.md                  # this file — read first
├── docs/                      # knowledge base (see 00-DOCS-INDEX.md)
├── apps/
│   ├── web/                   # Next.js public site + booking experience
│   └── admin/                 # admin dashboard (can be a route group in web or its own app)
├── packages/
│   ├── api/                   # Fastify modular monolith
│   │   └── src/modules/<domain>/  # routes, service, validators, repo, events, tests
│   ├── db/                    # Prisma schema, migrations, seed
│   ├── shared/                # shared types, constants, zod schemas
│   └── jobs/                  # background workers (notifications, flight monitor, sitemap…)
├── infra/                     # IaC, env templates, deployment
└── .env.example
```
Each backend domain module folder contains: `routes` · `service` · `validators` · `repository` · `events` · `__tests__`. No business logic in the frontend.

## 6. Coding Standards

- TypeScript everywhere; `strict` mode on.
- Validate **all** external input with zod (or equivalent) at the boundary.
- All DB access through Prisma; never raw string-interpolated SQL.
- One domain owns its tables; cross-domain access goes through that domain's service, not its tables.
- Pure functions for pricing/availability calculation — deterministic, unit-tested.
- Errors are typed and logged; never swallow.
- Money: store in minor units (integer), always with currency; never floats.
- Conventional commits; small PRs; every PR updates affected docs (see §11).
- No secrets in code; everything via env. `.env.example` stays current.
- Sprint 0 env contract is documented in `.env.example`; update it in the same change whenever code introduces, renames, or removes an environment variable.

## 7. Documentation Rules

- The knowledge-base docs are **source of truth**. Treat existing docs as authoritative unless you find a contradiction or outdated assumption — then refine, don't silently delete.
- Every major feature requires: business explanation · UX flow · technical explanation · database impact · API impact.
- When architecture changes: update **all** affected docs in the same change, keep them aligned, and record the decision.
- Maintain `00-DOCS-INDEX.md`, `DECISIONS.md` (decision log), and `ASSUMPTIONS.md` (assumptions log) — all at the project root.
- Do not delete strategic ideas unless clearly wrong; refine and annotate instead.

## 8. AI Agent Behaviour Rules

- Think like a **technical co-founder**, not an order-taker. Challenge weak decisions professionally and propose better approaches with reasoning.
- Be proactive but don't stall: if a business decision is unclear, make a **smart, documented assumption** (log it in `ASSUMPTIONS.md`), continue, and flag it for the founder.
- Only stop to ask when a decision is **genuinely blocking** and expensive to reverse.
- Never build random UI before the relevant architecture is aligned.
- Never ship fake/demo features into production flows unmarked.
- Never hardcode airports, services, prices, SEO pages, or content.
- Verify before claiming done: tests pass, docs updated, diff reviewed.
- Keep `DECISIONS.md` updated for every architectural decision, with rationale.

## 9. Security Rules

HTTPS everywhere · password hashing (argon2/bcrypt) · RBAC enforced server-side on every admin/supplier route · audit logs for all sensitive actions · rate limiting (Redis) · input validation at every boundary · ORM-based SQLi protection · XSS protection · CSRF protection where cookies are used · secure manage-booking tokens (signed, expiring) · supplier documents in private storage with access control · **no direct card data storage — ever** · Stripe webhook signature validation mandatory · never trust frontend payment status.

## 10. SEO / AEO / AGO Rules

SEO is a **strategic pillar, not a feature**. The platform must be discoverable in Google Search, Google AI Overviews, ChatGPT, Gemini, Claude, Perplexity, voice assistants, and future AI answer engines.

Every important page must include: a direct-answer block near the top · structured FAQ blocks · entity-rich, structured content · clear "what is / how it works / who needs it" sections · internal links · AI-readable summary · structured schema (FAQ, breadcrumb, service/local-business where relevant) · canonical URL · hreflang · OG tags.

The system dynamically generates airport pages, airport+service pages, service pages, guide pages, and FAQ pages (programmatic SEO). Sitemap and search index update automatically on publish.

## 11. OpenAI Integration Rules

OpenAI API powers **drafts only**: airport descriptions, SEO metadata, FAQs, schema, AI summaries, airport guides, service explainers, translation drafts, internal-linking suggestions.

**Mandatory workflow:** `AI Draft → Admin Review → Edit → Approve → Publish`. AI-generated content **never auto-publishes**. Every generation is logged (`ai_generation_logs`) with model, prompt version, cost, and reviewer. Translations follow the same flow with versioning and manual override.

## 12. Stripe Integration Rules

Stripe is the primary payment provider. Required: Payment Intents · webhooks with signature validation · multi-currency checkout · refunds and partial refunds · payment status tracking · reconciliation. Booking payment state is driven by **verified webhook events**, never by the frontend. Persist every webhook event (`stripe_webhook_events`) for idempotency and audit. Never store raw card data. Pricing is snapshotted at booking time.

## 13. MVP Priorities (build in this order)

1. Public website 2. Airport search 3. Dynamic airport pages 4. Dynamic airport+service pages 5. Booking flow 6. Stripe checkout 7. Admin dashboard 8. Airport management 9. Supplier management 10. Pricing engine 11. Availability engine 12. Notifications (email + WhatsApp structure) 13. SEO/CMS 14. AI SEO draft system 15. AI translation draft system.

Plus, throughout: Auth & RBAC, audit logs, basic incidents, refund handling.

## 14. What NOT to Build Yet

Native mobile app · full supplier portal · public API marketplace · memberships · corporate accounts · advanced/dynamic-pricing AI · fully automated supplier assignment · full AI auto-operations · white-label APIs.

Architecture must **support** these later — keep domain boundaries and the database ready — but they are not MVP blockers and must not absorb MVP effort.

Frozen non-MVP code may remain in the repository only when it is server-gated by `AIRPORTFASTER_FREEZE_NON_MVP` per D-011/T-094 and excluded from default MVP builds where applicable. Do not delete preserved frozen code unless the founder explicitly decides to remove the future scope.

## 15. How to Ask Questions

Ask only when a decision is **blocking and costly to reverse**. When you ask: state the decision needed, give 2–4 concrete options with trade-offs, give your recommendation. Otherwise: make a smart assumption, log it, continue. Never stall the build waiting for non-blocking answers.

## 16. How to Document Assumptions

Every non-trivial assumption goes in `ASSUMPTIONS.md` with: date · the assumption · why it was made · what would change if it's wrong · status (open/confirmed/rejected). Reference the assumption ID in code comments and PRs where it matters.

## 17. How to Update Docs After Every Major Change

After any architectural or feature change: (1) update the affected docs in `docs/`, (2) add an entry to `DECISIONS.md`, (3) update `00-DOCS-INDEX.md` if docs were added/renamed, (4) confirm code and docs are aligned in the PR description. A change is not "done" until its docs are.

## 18. The Product Filter

Every feature must serve at least one of: **increase bookings · improve operational control · improve SEO/AEO/AGO discoverability · improve scalability · improve profitability.** If it serves none, it is not prioritised.
