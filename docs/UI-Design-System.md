# AirportFaster UI Design System

> **Status:** 🚧 In Progress · **Owner:** Frontend (T-083) · **Last updated:** 2026-05-17

---

## Stack

| Layer | Library | Version |
|-------|---------|---------|
| Component primitives | shadcn/ui (code-in-repo) + Radix UI | latest |
| Icons | lucide-react | latest |
| Motion | framer-motion | latest |
| Variant utilities | class-variance-authority + tailwind-merge + clsx | latest |
| CSS framework | Tailwind CSS 3 | ^3.4 |
| Typography plugin | @tailwindcss/typography | latest |
| Animation utilities | tailwindcss-animate | latest |
| Toasts | sonner | latest |

Decision: D-013 — all choices are binding and owned by the repo (no black-box deps).

---

## Brand Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-black` | `#0A0A0A` | Page background, primary dark surface |
| `brand-navy` | `#0D1B2A` | Cards, nav backgrounds |
| `brand-navy-light` | `#1A2D45` | Input backgrounds, secondary surfaces |
| `brand-navy-dark` | `#091320` | Deep shadow backgrounds |
| `brand-white` | `#FFFFFF` | Pure white (use sparingly) |
| `brand-off-white` | `#F5F5F4` | Body text, card text |
| `brand-gold` | `#C9A84C` | Primary actions, accents, active states |
| `brand-gold-light` | `#E8C97A` | Gold hover states |
| `brand-gold-dark` | `#A8872E` | Pressed/active gold states |
| `brand-muted` | `#6B7280` | Secondary text, placeholders |

### Semantic CSS Variables

All tokens live in `apps/web/app/globals.css` as CSS custom properties and are referenced by Tailwind's `tailwind.config.ts` via `hsl(var(--token))` for shadcn/ui compatibility.

---

## Typography Scale

Defined in `tailwind.config.ts` `theme.extend.fontSize`:

| Class | Size | Line Height | Letter Spacing | Usage |
|-------|------|-------------|----------------|-------|
| `text-display-2xl` | 4.5rem | 1.1 | -0.02em | Hero headlines |
| `text-display-xl` | 3.75rem | 1.1 | -0.02em | Page heroes |
| `text-display-lg` | 3rem | 1.1 | -0.02em | Section heroes |
| `text-display-md` | 2.25rem | 1.15 | -0.02em | Section headings |
| `text-display-sm` | 1.875rem | 1.2 | -0.01em | Card titles, admin page titles |
| `text-body-xl` | 1.25rem | 1.75 | — | Large body copy |
| `text-body-lg` | 1.125rem | 1.75 | — | Standard body |
| `text-body-md` | 1rem | 1.625 | — | Default body |
| `text-body-sm` | 0.875rem | 1.5 | — | Secondary text, labels |
| `text-caption` | 0.75rem | 1.5 | 0.025em | Captions, timestamps |
| `text-overline` | 0.6875rem | 1.5 | 0.1em | Section labels (uppercase) |

---

## Shadows

| Class | Usage |
|-------|-------|
| `shadow-gold` | Gold glow on cards |
| `shadow-gold-lg` | Stronger gold glow (hover) |
| `shadow-gold-glow` | Focus/active gold bloom |
| `shadow-elevated` | Standard card elevation |
| `shadow-elevated-lg` | Modals, dropdowns |
| `shadow-inner-border` | Inset border illusion |

---

## Animation Tokens

| Class | Duration | Usage |
|-------|----------|-------|
| `animate-fade-in` | 300ms | Enter transitions |
| `animate-fade-up` | 400ms | Entrance from below |
| `animate-fade-down` | 400ms | Entrance from above |
| `animate-shimmer` | 2s loop | Loading skeletons |
| `animate-pulse-gold` | 2s loop | Gold pulsing glow |
| `animate-accordion-down/up` | 200ms | Accordion expand/collapse |

CSS variables: `--duration-fast: 150ms`, `--duration-base: 250ms`, `--duration-slow: 400ms`.

---

## Component Library (`apps/web/components/ui/`)

All components are RTL-correct — they use Tailwind logical properties (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `text-end`) and Radix UI's built-in RTL support.

| Component | File | Notes |
|-----------|------|-------|
| Button | `button.tsx` | CVA variants: default/secondary/outline/ghost/destructive/link × default/sm/lg/xl/icon |
| Card | `card.tsx` | CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| Input | `input.tsx` | Gold focus ring |
| Label | `label.tsx` | Radix label primitive |
| Textarea | `textarea.tsx` | Auto-resize friendly |
| Select | `select.tsx` | Full Radix Select, gold check indicator |
| Checkbox | `checkbox.tsx` | Gold checked state |
| RadioGroup | `radio-group.tsx` | Gold indicator |
| Switch | `switch.tsx` | Gold track when checked |
| Dialog | `dialog.tsx` | DialogContent/Header/Footer/Title/Description |
| Sheet | `sheet.tsx` | Side panel — top/bottom/left/right variants |
| DropdownMenu | `dropdown-menu.tsx` | Full Radix dropdown with groups, separators, shortcuts |
| Tabs | `tabs.tsx` | Gold active tab |
| Table | `table.tsx` | TableHeader/Body/Footer/Head/Row/Cell/Caption |
| Badge | `badge.tsx` | default/secondary/outline/success/warning/destructive/info |
| Tooltip | `tooltip.tsx` | TooltipProvider required at root |
| Skeleton | `skeleton.tsx` | Shimmer animation |
| Separator | `separator.tsx` | Horizontal and vertical |
| Avatar | `avatar.tsx` | AvatarImage + AvatarFallback with gold initials |
| Text | `text.tsx` | Polymorphic text with `dir` prop for RTL bidi fix |

### Usage — RTL bidi fix

When rendering English text on an RTL page (before T-081 translations land), wrap in `<Text dir="ltr">` to prevent punctuation flipping:

```tsx
import { Text } from '@/components/ui/text';

// Instead of: <p>Premium Airport Services.</p>
<Text as="h1" size="display-lg" dir="ltr">Premium Airport Services.</Text>
```

Or use `<span dir="ltr">` inline for mixed content within a larger block.

### cn() utility

```ts
import { cn } from '@/lib/utils';
// Merges clsx + tailwind-merge
cn('px-4 py-2', condition && 'bg-brand-gold', className)
```

---

## Kitchen-Sink Route

`/[locale]/_design` — renders every primitive for visual QA. Not gated by NODE_ENV in the current build (gating can be added once CI env vars are configured).

---

## RTL Rules

1. Use Tailwind logical properties everywhere: `ps-` not `pl-`, `ms-` not `ml-`, `start-` not `left-`, etc.
2. The `<html dir="rtl">` is set by `app/[locale]/layout.tsx` — components inherit it automatically.
3. Radix UI primitives handle RTL alignment and keyboard navigation internally.
4. framer-motion animations that translate on X-axis must check `dir` or use `translateX(var(--motion-x))` with a CSS var that flips in RTL.
5. For English text in RTL context: `<Text dir="ltr">` or `<bdi>` or `dir="auto"`.

---

## Pending

- [ ] Add Arabic font (Noto Sans Arabic) via `next/font/google` for proper Arabic rendering
- [ ] Add display serif font (Fraunces or Instrument Serif) for hero headings
- [ ] Storybook or dedicated visual test harness (post-MVP)
- [ ] Complete translation wiring once T-081 strings land
