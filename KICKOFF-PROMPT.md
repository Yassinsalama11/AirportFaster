# AirportFaster — Claude Code Kickoff Prompt

> Paste the block below into Claude Code as the first message in the project.
> It is written so that work can later be picked up by Codex too — `TASKS.md` becomes the shared, agent-agnostic source of truth for code work.

---

You are the lead engineer on **AirportFaster**, a global premium airport-services platform. This repo currently contains only documentation — no code yet.

**Step 1 — Read the knowledge base before doing anything.**
Read these files at the repo root, in this order, and treat them as binding:
1. `AGENTS.md` — your operating contract. Follow it exactly.
2. `00-DOCS-INDEX.md` — the documentation map.
3. `Product Architecture Definition (PAD)`, `Business Requirements Document (BRD)`, `UX Architecture & Product Flows`, `System Architecture Document`, `Database Architecture & Entity Relationship Design` — the source-of-truth specs.
4. `Development Sprint Plan` — the delivery sequence.
5. `DECISIONS.md` and `ASSUMPTIONS.md` — binding decisions and open assumptions.

**Step 2 — Do NOT write application code yet.** Your only deliverables in this first session are:

A. **`TASKS.md` at the repo root** — the master code task tracker. It must be:
   - Organized by the sprints in `Development Sprint Plan` (Sprint 0 → Sprint 9), plus a "Post-MVP backlog" section.
   - Agent-agnostic: written so either Claude Code or Codex can pick up any unblocked task. Do not assume who does what.
   - Every task has this exact structure:
     ```
     ### T-### · <short title>
     - **Sprint:** <0–9 / backlog>
     - **Status:** todo | in-progress | blocked | done
     - **Owner:** unassigned | claude | codex
     - **Depends on:** <task IDs or "none">
     - **Description:** <what to build, referencing the relevant doc + section>
     - **Files / modules touched:** <expected paths>
     - **Acceptance criteria:** <bullet list — concrete, testable>
     - **Docs to update on completion:** <which docs per AGENTS.md §17>
     ```
   - Task IDs are stable and never reused (T-001, T-002, …).
   - Granularity: each task should be completable in roughly half a day to two days. Break large items down.
   - Start with a short "How to use this file" header explaining the multi-agent workflow: claim a task by setting Owner + Status, respect `Depends on`, update Status to `done` only when acceptance criteria pass and docs are updated.
   - Cover the full MVP through Sprint 9 — don't stop at Sprint 0.

B. **A proposed repo scaffold** — list the folder/file structure you intend to create (per `AGENTS.md` §5), but do not create the files yet. Present it for approval.

C. **A blocking-questions list** — anything in the docs that prevents you from writing `TASKS.md` accurately. Check `ASSUMPTIONS.md` first; only raise what is genuinely unresolved.

**Step 3 — Conventions to bake into `TASKS.md`:**
- Modular monolith; strict domain boundaries; TypeScript strict; Prisma; Fastify; Next.js.
- Nothing hardcoded (airports, services, prices, content, SEO pages).
- AI content is draft-only — never auto-publish.
- Stripe: webhook-driven payment state, signature validation, no card storage.
- Every task that changes architecture must update the relevant doc + `DECISIONS.md`.

When `TASKS.md`, the scaffold proposal, and the questions list are ready, stop and summarize. Do not begin implementation until I approve.
