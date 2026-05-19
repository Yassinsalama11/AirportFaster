# Codex Prompt — Remediation Round 1 (T-094 freeze + T-080 i18n foundation)

> Paste the block below into Codex as the first message in the session.
> It is scoped to a single session: two tickets, then stop.
> Owner: Yassin (Founder + Lead Architect agent) · Date: 2026-05-16

---

You are Codex, lead engineer on **AirportFaster** — a global premium airport-services platform. The repo is at the current working directory. Architecture, docs, and Sprint 0–9 code already exist. A 2026-05-16 audit found three MVP violations and added a remediation block of 15 tickets (T-080..T-094). Your job in this session is to land **the first two tickets only**: T-094 (scope freeze) and T-080 (i18n foundation). Nothing else.

**Step 1 — Read these files at the repo root, in this order, and treat them as binding:**

1. `AGENTS.md` — your operating contract. Follow it exactly. Pay special attention to §3 (dynamic, admin-controlled), §6 (coding standards: TypeScript strict, zod at every boundary, no raw SQL, conventional commits), §10 (SEO/AEO/AGO), §14 (what NOT to build yet — this is the source of the freeze list).
2. `00-DOCS-INDEX.md` — confirm current implementation status.
3. `DECISIONS.md` — read **D-011, D-012, D-013, D-014** in full. They define the freeze, the i18n stack, and the remediation order.
4. `TASKS.md` — read the "How to Use This File" section, then read **T-094 and T-080 in full**. Those tickets are your source of truth for acceptance.
5. `ASSUMPTIONS.md` — A-001..A-010 are still open; don't invent new assumptions without logging.

**Step 2 — Claim your tickets.** In `TASKS.md`, set on both T-094 and T-080: `Owner: codex`, `Status: in-progress`. Commit that change first (`chore(tasks): claim T-094 and T-080 — codex`) before touching code, so a parallel Claude Code agent can see the lock.

**Step 3 — Do T-094 first** (scope freeze — fast and unblocks everything else):

- Add `AIRPORTFASTER_FREEZE_NON_MVP=true` to `apps/web/.env.example` with a comment explaining its purpose (gates non-MVP routes).
- Make these routes return `notFound()` (or 410 via a custom response) at the server level when the flag is on. Implement as small per-route server guards or a `middleware.ts` matcher — your call, but it must be enforced server-side, not just hidden in the UI:
  - `apps/web/app/(public)/account/login/**`
  - `apps/web/app/(public)/account/register/**`
  - `apps/web/app/(public)/developers/**`
  - `apps/web/app/supplier-portal/**`
  - `apps/web/app/admin/(protected)/corporate/**`
- Remove links to those routes from the public nav, public footer, and admin Sidebar.
- Exclude `apps/mobile/` from default builds: update `turbo.json` and root scripts so `pnpm build` and CI do not build `apps/mobile/`. Keep the package in the workspace so it remains lintable on demand (`pnpm --filter @airportfaster/mobile build` should still work explicitly).
- In `TASKS.md`, append a status line to T-070, T-071, T-073, T-074, and T-079 saying `Status: frozen` with a note `Frozen by T-094 on 2026-05-16 per D-011. Code preserved; routes gated by AIRPORTFASTER_FREEZE_NON_MVP.` Do not delete those tickets' completion notes.
- With the flag on, `curl -I /account/login`, `/account/register`, `/developers`, `/supplier-portal`, `/admin/corporate` must return 404. With the flag off, the same routes must still resolve (preservation guarantee). Add an integration test covering at least one frozen route in each state.
- Mark T-094 acceptance-criteria-by-criteria as checked in your PR description.

**Step 4 — Do T-080** (i18n foundation):

- Implement exactly what T-080 specifies. Highlights:
  - Install `next-intl` in `apps/web` (compatible with Next.js 15 / React 19).
  - Move every existing `apps/web/app/**` route under a new `app/[locale]/**` segment. Don't duplicate — `git mv`. Update relative imports as needed.
  - Create `apps/web/i18n/routing.ts` (locales `['en','ar']`, defaultLocale `'en'`, localePrefix `'always'`), `apps/web/i18n/request.ts` (next-intl request config), and wire `next-intl/middleware` in `apps/web/middleware.ts` while preserving the existing freeze guard from T-094 (compose the two — don't replace).
  - Update the root layout: `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={inter.variable}>`. No hardcoded `lang="en"` anywhere.
  - Create empty namespaced `apps/web/messages/en.json` and `apps/web/messages/ar.json` (just `{}` is fine — translation of strings is T-081's job, not yours).
  - Implement a `LocaleSwitcher` component using next-intl's `usePathname` + `useRouter` so locale flips preserve the current path. Mount it in the public header and admin top bar.
  - Update `next.config.mjs` per next-intl docs (plugin).
- After the move: every existing public route AND every existing admin route must still resolve under `/en/...` (manual smoke on at least homepage, an airport page, /admin, /admin/bookings, /admin/airports). Booking flow must complete end-to-end on `/en/...`.
- `<html dir="rtl">` must appear when the URL is `/ar/...`, even though the strings are still English placeholders at this stage — that's T-081.

**Step 5 — Discipline rules (non-negotiable):**

- TypeScript `strict` stays on. Zero `any` introduced. Run `pnpm typecheck` and confirm it passes before opening the PR.
- Run `pnpm lint`, `pnpm build`, and the existing test suite. All green or your PR is not ready.
- Conventional commits, scoped per concern: e.g. `feat(web): freeze non-MVP routes behind AIRPORTFASTER_FREEZE_NON_MVP (T-094)` and `feat(web): install next-intl and add [locale] segment (T-080)`. Don't bundle them.
- No new business logic in the frontend. No raw string-interpolated SQL. No card data anywhere. No AI auto-publish.
- Update affected docs in the same PR: `TASKS.md` (mark T-094 and T-080 done with completion notes including the date and what was verified), `00-DOCS-INDEX.md` (move Implementation Status forward to reflect that the freeze + i18n foundation are live), and any other doc the changes touch. Do NOT add new entries to `DECISIONS.md` — D-011 and D-012 already cover these.
- If you discover a contradiction between the docs and reality, flag it in the PR description; do not silently rewrite a doc.

**Step 6 — Out of scope for this session:**

- Do NOT start T-081 (string translation), T-082 (admin shell translation), T-083 (design system), or any other ticket. Those are separate sessions.
- Do NOT touch the seven stubbed admin pages — that's T-086..T-092.
- Do NOT replace emoji icons in the Sidebar — that's T-084 and depends on T-083.
- Do NOT delete any frozen code — preservation is the whole point of D-011.

**Step 7 — Stop conditions:**

- When both tickets meet every acceptance criterion in `TASKS.md` and the PR is ready, stop and summarise: (a) what changed, (b) which acceptance criteria passed and how you verified, (c) any flag you want the founder to know about. Do not auto-start the next ticket.
- If you hit a genuinely blocking unknown that costs more than 30 minutes to resolve, stop, write the question with 2–4 options + a recommendation per AGENTS.md §15, and wait.

Begin.
