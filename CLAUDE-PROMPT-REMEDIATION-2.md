# Claude Code Prompt — Remediation Round 2 (Design system + fix unstyled RTL homepage)

> Paste the block below into Claude Code as the first message in the session.
> Scope: fix the broken styling pipeline, then land T-083, T-084, T-085 (full premium design system + admin chrome refresh + public site visual rebuild), plus an explicit RTL bidi punctuation fix. Stop after that.
> Owner: Yassin (Founder + Lead Architect agent) · Date: 2026-05-16

---

You are Claude Code, lead frontend engineer on **AirportFaster** — a global premium airport-services platform. The repo is at the current working directory. Codex completed the i18n foundation (T-080) and scope freeze (T-094) in the prior session. The founder just opened `/ar` in the browser and the page is essentially **unstyled HTML**: nav items mashed together with no spacing ("AirportsServicesHow It WorksFor BusinessHelp"), default browser blue underlined links, no hero layout, RTL punctuation flipped ".Premium Airport Services. Seamlessly Booked", inline text instead of cards. The screenshot is at the founder's discretion — assume the unstyled state is real and reproduce it locally.

This session has one objective: **make AirportFaster look and feel like a premium 2026 product on every page, in both LTR and RTL, with a real design system underneath.** That covers tickets **T-083, T-084, T-085** in `TASKS.md`, plus a pre-step to repair the styling pipeline that the `[locale]` migration broke.

**Step 1 — Read these files at the repo root, in this order, and treat them as binding:**

1. `AGENTS.md` — your operating contract. Special attention to **§2 (brand positioning — matte black, deep navy, white, champagne-gold; Amex Platinum / Emirates / Apple / Blacklane feel), §10 (SEO/AEO), and §6 (TypeScript strict, no business logic in frontend, conventional commits)**.
2. `DECISIONS.md` — read **D-012 (i18n), D-013 (design system stack), D-014 (work order)** in full. D-013 binds you to shadcn/ui + Radix + Lucide + framer-motion + CVA + Tailwind tokens. Honour it.
3. `TASKS.md` — read **T-083, T-084, T-085 in full**. Those are your source of truth for acceptance. Also skim T-080 completion notes so you understand what Codex changed in the route tree.
4. `00-DOCS-INDEX.md` — current status.

**Step 2 — Claim the tickets.** In `TASKS.md`, set on T-083, T-084, T-085: `Owner: claude`, `Status: in-progress`. Commit `chore(tasks): claim T-083/T-084/T-085 — claude` first.

**Step 3 — Pre-step (do FIRST, before design system work): repair the broken styling pipeline.**

The `/ar` render proves Tailwind / `globals.css` isn't being applied. Diagnose and fix. Likely candidates:

- The new `apps/web/app/[locale]/layout.tsx` doesn't `import './globals.css'` (or the path is wrong after the move). Verify the import is in the **right layout** — for App Router with a `[locale]` segment, `globals.css` must be imported in the root layout that wraps everything (often `app/layout.tsx` OR the `[locale]/layout.tsx` if there is no root). Make sure there is exactly one `<html><body>` in the tree.
- Tailwind `content` paths in `apps/web/tailwind.config.ts` weren't updated to include the new `app/[locale]/**/*.{ts,tsx}` route tree, so classes aren't being detected and the JIT compiler is purging them.
- PostCSS / Tailwind plugin order broken by the next-intl install.
- `next-intl` `NextIntlClientProvider` is wrapping the children but the layout that does so isn't the one importing CSS.

Once fixed, `/en` and `/ar` should render with existing Tailwind utilities visibly applied. **Commit this fix on its own:** `fix(web): restore globals.css + tailwind content paths after [locale] migration`. Do NOT bundle it with the design system work — it needs to be a clean, revertable commit.

**Step 4 — Then do T-083 (design system foundation).** Per ticket spec:

- Install (in `apps/web`): `lucide-react`, `@radix-ui/react-*` primitives you need, `class-variance-authority`, `tailwind-merge`, `clsx`, `framer-motion`, `tailwindcss-animate`, `sonner` (toasts), `@tailwindcss/typography`.
- Initialise shadcn/ui into `apps/web/components/ui/` (`pnpm dlx shadcn@latest init` — choose CSS variables theme, RSC yes, baseColor neutral, then customise to brand). Generate at minimum: `Button`, `Card`, `Input`, `Label`, `Select`, `Textarea`, `Checkbox`, `RadioGroup`, `Switch`, `Dialog`, `Sheet`, `DropdownMenu`, `Tabs`, `Table`, `Badge`, `Tooltip`, `Skeleton`, `Separator`, `Avatar`, `Toaster`. All must be RTL-correct (use logical Tailwind properties: `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `text-end`).
- Expand `tailwind.config.ts`:
  - Typography scale: `display` (clamp-based for hero), `h1`, `h2`, `h3`, `h4`, `body-lg`, `body`, `body-sm`, `caption`, with appropriate line-height and tracking. Fonts: Inter for UI, a refined serif for display headers (Fraunces or Instrument Serif via `next/font`) — both must include Arabic-supporting fallbacks (Noto Sans Arabic + Noto Serif Arabic via `next/font/google` with `subsets: ['arabic','latin']`).
  - Animation keyframes: `fade-in`, `fade-in-up`, `slide-in-right`, `slide-in-left`, `shimmer`, `glow-pulse`. Tokens for `duration-fast/base/slow` and easings `ease-premium` (custom cubic-bezier).
  - Shadow ramp: `shadow-elevated`, `shadow-floating`, `shadow-soft-gold`.
  - Brand colour ramps: extend `brand-black`, `brand-navy`, `brand-gold` to 50–950 scales so we can do hover states / gradients / focus rings consistently. Add `surface-1..5` neutrals for layered dark backgrounds.
  - `darkMode: 'class'` and default to dark — AirportFaster is dark-first.
  - Plugins: `tailwindcss-animate`, `@tailwindcss/typography`.
- Update `globals.css`: CSS variables for every token (colour, radius, spacing, motion, font), base typography (set `body` font, render-quality), focus ring (gold glow), selection colour, scrollbar refinement, `:root[dir="rtl"]` adjustments where needed.
- Create `apps/web/components/ui/README.md` documenting tokens + import patterns.
- Ship a developer-only route `/[locale]/_design` that renders a kitchen-sink page of every primitive (Button variants, Card examples, form fields, Dialog open, Toast trigger, table, badges) for visual QA. Gate it behind `NODE_ENV !== 'production'`.

**Step 5 — Then do T-084 (admin chrome refresh).** Per ticket:

- Rewrite `apps/web/components/admin/Sidebar.tsx` — **zero emoji**. Use Lucide: `LayoutDashboard, ClipboardList, Activity, AlertTriangle, Undo2, Plane, Sparkles, FileText, Bot, Building2, Users, CreditCard, BarChart3, Bell, Settings, ShieldCheck`. Add a collapsed-mode (icon-only) toggled by a button.
- New `Topbar` with: search (cmd-k style), `LocaleSwitcher` (already from T-080), notification bell with Radix Popover for recent alerts, staff-user `DropdownMenu` (profile, preferred locale, sign out).
- New `Breadcrumb` component fed by route segments.
- New `PageHeader` primitive (title, eyebrow, description, actions slot) — refactor every existing admin page to use it.
- Subtle framer-motion: page transition fade-in-up (250ms ease-premium), nav hover gold underline, sidebar collapse spring. Respect `prefers-reduced-motion`.
- RTL: sidebar mirrors to the right side; chevrons flip; icons stay non-mirrored unless directional.

**Step 6 — Then do T-085 (public site visual rebuild).** Rebuild on top of the new design system:

- **Homepage** (the page in the founder's screenshot): full-bleed cinematic hero, deep-navy → black gradient background, soft gold radial accent. Display-serif headline ("Premium airport services. Seamlessly booked." — pulled from translation keys when T-081 lands; for now placeholder string in code is acceptable but wire it via `useTranslations('home')`). Search composer is the focal point — large, glass-finish card, airport autocomplete input with Lucide search icon, primary CTA in champagne gold with subtle glow on hover. KPI strip below hero (bookings completed / airports / countries / rating) as horizontally-laid stat cards with hairline gold dividers. "How it works" 4-step strip with numbered circles. Three-up service cards (Fast Track / Meet & Greet / Lounge Access) with motion on hover. Featured airports rail (horizontal scroll with snap). Testimonials carousel. Press strip. Final CTA band. Footer with sitemap + locale switcher + legal links.
- **Airport landing page** (`/[locale]/airports/[slug]`): hero with airport hero image + airport name + IATA + country + map button. Direct-answer block (AEO — 2–3 sentence summary near top). Services available cards. FAQ accordion with schema.org `FAQPage`. Breadcrumb. "Other airports in this country / nearby" rail.
- **Airport+service page** (`/[locale]/airports/[airport]/[service]`): deep service explainer, what's included / what's not, process timeline (4–5 steps), pricing card on the right (left in RTL — use logical positioning) showing the dual-mode price from the pricing engine, reviews section, FAQ, schema markup (`Service` + `FAQPage`).
- **Search results** (`/[locale]/search`): split layout — filters on side, results in middle. Cards with elegant micro-interactions. Empty state with helpful CTA. RTL-mirrored.
- **Booking flow** (details → review → checkout → confirmation): consistent stepper at top, sticky summary card on right (mirrors in RTL), trust signals at checkout (Stripe badge, refund policy, support 24/7), premium confirmation success state with confetti-free elegance (subtle gold-tick animation).
- Every page wired to `useTranslations` namespaces — even if strings are still English placeholders, the keys must exist so T-081 can fill them.

**Step 7 — Explicit RTL bidi punctuation fix.**

The screenshot shows ".Premium Airport Services. Seamlessly Booked" — the trailing period is rendering at the start because an LTR English sentence is in an RTL container. Fix the strategy globally:

- For any text component that may render mixed-direction content, wrap with `<bdi>` or set `dir="auto"` on the element so the browser uses the Unicode Bidirectional Algorithm correctly.
- For headings that are intentionally LTR English while the page is RTL (during this transition period before T-081 translates them), wrap them in `<span dir="ltr">...</span>` so punctuation stays correct.
- Add a `<Text>` utility in `components/ui/text.tsx` that takes an optional `dir` prop and renders accordingly — use it across the rebuilt pages so this isn't a per-component fight.
- Verify on `/ar` after the rebuild: no leading dots, no number/+ flipped placement on stat strips, no broken alignment in cards.

**Step 8 — Discipline rules (non-negotiable):**

- TypeScript `strict` stays on. Zero `any` introduced. Run `pnpm typecheck` green.
- `pnpm lint`, `pnpm build`, existing test suite — all green or the PR isn't ready.
- Conventional commits, granular: e.g. `fix(web): restore globals.css after [locale] migration`, `feat(web): design system foundation — tokens, primitives, shadcn install (T-083)`, `feat(web): premium admin chrome with Lucide icons (T-084)`, `feat(web): rebuild homepage + airport pages + booking flow visuals (T-085)`. Don't bundle.
- No new business logic in the frontend. No raw SQL. No card data. No AI auto-publish. Backend modules already exist — you are rebuilding the visual layer only.
- All new components RTL-correct via logical Tailwind properties from the start. Verify each new page in `/en/...` AND `/ar/...` before marking the relevant ticket done.
- Mobile-first responsive: 320 / 375 / 414 / 768 / 1024 / 1280 / 1536 — test homepage, an airport page, and the booking flow at each breakpoint.
- Update docs in the same PR: `TASKS.md` (mark T-083/084/085 done with date + verification notes), `00-DOCS-INDEX.md` (Implementation Status moves forward; promote the "UI Design System" doc from 🔜 Proposed to 🚧 In Progress with a stub at `docs/UI-Design-System.md` listing tokens). Do NOT add new entries to `DECISIONS.md` — D-013 already covers the stack.
- If you find a real contradiction between docs and code, flag in the PR description — don't silently rewrite docs.

**Step 9 — Out of scope for this session:**

- Do NOT translate strings (T-081 / T-082) — placeholder English in translation keys is fine.
- Do NOT implement the seven stubbed admin pages (T-086..T-092) — those come next session.
- Do NOT touch frozen routes from T-094 (mobile, customer accounts, corporate, supplier portal, developers).
- Do NOT introduce a new state library, new data-fetching library, or change the Next.js version.

**Step 10 — Stop conditions:**

- When the styling pipeline is fixed AND T-083, T-084, T-085 all meet every acceptance criterion in `TASKS.md`, stop and summarise: (a) what changed, (b) screenshots-worthy pages to spot-check (`/en`, `/ar`, `/en/admin`, `/ar/admin`, `/en/airports/[any-published-slug]`, `/en/_design`), (c) any flag for the founder. Do not auto-start T-086 or T-081.
- If a blocking unknown costs more than 45 minutes, stop, write the question with 2–4 options + recommendation per AGENTS.md §15, and wait.

Begin with Step 3 — fix the styling pipeline. The design system work has no meaning until Tailwind is actually applying.
