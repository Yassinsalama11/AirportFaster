# AirportFaster — Assumptions Log

> Smart assumptions made to keep execution moving. Each must be confirmed or rejected by the founder.
> Format: ID · date · assumption · why · what changes if wrong · status.
>
> **Version:** 1.0 · **Last updated:** 2026-05-14

---

| ID | Assumption | Why made | If wrong | Status |
|----|-----------|----------|----------|--------|
| A-001 | Base/settlement currency is **USD**; AED also primary given GCC focus. | Need a base currency for margin math and FX. | FX rate tables and margin reporting re-base; minor. | 🟡 Open |
| A-002 | WhatsApp notifications use the **WhatsApp Business API via a BSP** (e.g. Twilio/360dialog), with pre-approved templates — not a personal WhatsApp. | Required for transactional messaging at scale and compliance. | Notifications module integration target changes. | 🟡 Open |
| A-003 | Flight data provider is a paid API (e.g. AeroDataBox / FlightAware / Cirium); exact vendor TBD. | Flight tracking is a core operational requirement. | Flight Data module adapter swaps; isolated behind an interface. | 🟡 Open |
| A-004 | Suppliers for the 5 launch airports are **not yet contracted**; Phase-1 ops are manual via WhatsApp/email. | PAD states manual ops; no supplier list provided. | Sprint plan supplier-onboarding timing shifts. | 🟡 Open |
| A-005 | One supplier can serve multiple airports and multiple services; one airport-service can have multiple eligible suppliers. | Standard marketplace shape; matches `supplier_airports`/`supplier_services`. | Coverage tables simplify or expand. | 🟢 Likely correct |
| A-006 | "Lounge Access" in MVP is booked as an assisted service (admin/supplier fulfilled), **not** a live lounge-inventory integration (e.g. Priority Pass/LoungeKey). | Keeps MVP scope tight; matches manual-ops model. | A lounge-inventory integration module is added; availability engine extended. | 🟡 Open |
| A-007 | Admin dashboard ships as a route group inside the Next.js app for MVP, not a separate deployable app. | Faster to build; shared auth/session. | Extract to `apps/admin` later; low cost due to clean module boundaries. | 🟢 Likely correct |
| A-008 | Taxes/VAT are **tracked but not auto-calculated** in MVP (estimate field only); full tax engine is post-MVP. | Tax rules vary by jurisdiction; not an MVP blocker. | Finance module gains a tax-calculation component. | 🟡 Open |
| A-009 | Promo codes are platform-level and admin-created in MVP; no supplier-funded promos yet. | Simpler pricing snapshot logic. | `promo_codes` gains funding-source + supplier link. | 🟢 Likely correct |
| A-010 | Reviews are collected post-completion via the review-request notification and are admin-moderated before display. | Trust/quality control consistent with premium positioning. | Review moderation workflow changes. | 🟡 Open |

**Action for founder:** please confirm or correct A-001, A-002, A-003, A-004, A-006, A-008, A-010.
