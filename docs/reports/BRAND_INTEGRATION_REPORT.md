# Brand integration report — Atriveo Cortex UI

**Date:** 2026-06-17  
**Source:** `Atriveo Brand Foundation` (Lovable brand kit)  
**Scope:** Visual design only — no layout, routing, analytics logic, or API changes

---

## Summary

Cortex UI now uses the official **Atriveo Bone / Ink / Signal** palette, typography system (Instrument Serif + Inter + JetBrains Mono), and the **Directional Apex** logo mark. The dark product theme is preserved while replacing the previous purple-accent design with Atriveo Signal blue.

---

## Design tokens created

| File | Purpose |
|------|---------|
| `apps/cortex-ui/src/theme/colors.ts` | Brand hex values + semantic CSS var aliases |
| `apps/cortex-ui/src/theme/typography.ts` | Font families, type scale, Tailwind class presets |
| `apps/cortex-ui/src/theme/spacing.ts` | Spacing scale + layout constants |
| `apps/cortex-ui/src/theme/shadows.ts` | Shadow tokens + utility classes |
| `apps/cortex-ui/src/theme/radius.ts` | Border radius scale |
| `apps/cortex-ui/src/theme/index.ts` | Barrel export |

### CSS token layer

`apps/cortex-ui/src/styles.css` — single source of truth for runtime theming:

- **Core:** `--bone`, `--ink`, `--signal`, `--signal-soft`, `--signal-deep`, `--hairline`, `--acid`
- **Semantic:** `--background`, `--foreground`, `--surface`, `--surface-2`, `--border`, `--ring`
- **Legacy aliases:** `--brand` → `--signal`, `--gradient-brand` → `--grad-signal` (backward compatible)
- **Utilities:** `surface-card`, `bg-gradient-brand`, `text-gradient-brand`, `font-display`

---

## Brand assets integrated

| Asset | Location | Usage |
|-------|----------|-------|
| **Atriveo Mark** (Directional Apex) | `src/components/brand/atriveo-mark.tsx` | Sidebar logo icon |
| **Atriveo Wordmark** | `src/components/brand/atriveo-wordmark.tsx` | Available for marketing surfaces |
| **Favicon / app icon** | `public/favicon.svg` | Browser tab, apple-touch-icon |

### Metadata & fonts

`src/routes/__root.tsx`:

- Favicon linked (`/favicon.svg`)
- **Instrument Serif** added to Google Fonts alongside Inter + JetBrains Mono
- Existing Atriveo Cortex OG/title metadata retained

---

## Components updated

### Navigation & shell

| Component | Changes |
|-----------|---------|
| `app-sidebar.tsx` | Replaced Lucide `Brain` with `AtriveoMark`; ink/bone icon tile; `font-display` product name; mono eyebrow labels |
| `routes/__root.tsx` | Signal notification dot; Instrument Serif font; favicon links |
| `dashboard/page-shell.tsx` | Brand typography presets for eyebrows + page titles |

### Activity (primary experience)

| Component | Changes |
|-----------|---------|
| `routes/index.tsx` | Today/Week/Month tabs use Signal active state (`bg-signal text-bone`) |
| `activity/today-view.tsx` | Focus metric accent → `text-signal` |
| `activity/week-view.tsx` | Peak day ring → `ring-signal/50` |
| `activity/month-view.tsx` | Heatmap cells + focus stats → Signal scale |
| `activity/shared.tsx` | Section titles use `font-display` |

### Dashboard & lists

| Component | Changes |
|-----------|---------|
| `dashboard/states.tsx` | Error state uses `destructive` tokens; empty titles use `font-display` |
| `dashboard/page-shell.tsx` | Typography system applied |
| `routes/ideas.tsx` | Idea intensity dots → Signal color |
| `lib/error-page.ts` | SSR error page styled with Ink/Bone dark theme |

### Inherited via token aliases (no file change required)

These continue to work via `--color-brand` → `--signal`:

- `routes/overview.tsx`, `projects.tsx`, `actions.tsx`, `projects.$id.tsx`
- `components/dashboard/why.tsx`

---

## Color system migration

| Before | After |
|--------|-------|
| Purple accent `oklch(0.68 0.18 285)` | Atriveo Signal `oklch(0.65 0.2 264)` / `#2B59FF` |
| `--gradient-brand` purple→blue | `--grad-signal` (Signal gradient) |
| Generic Inter-only headings | Instrument Serif display headings |
| Lucide Brain placeholder | Official Atriveo Mark SVG |

**Dark mode:** Preserved as default (`:root` dark-first). Background `#0B0D12` ink family with subtle Signal radial glow.

---

## Accessibility

- Contrast pairs from brand book maintained (Ink on Bone, Signal on dark surfaces)
- Focus rings use `--ring: var(--signal)`
- Keyboard navigation unchanged (no structural changes)
- Responsive behavior unchanged
- `font-display` used for headings only; body remains Inter for readability

---

## Build verification

```bash
cd apps/cortex-ui && npm run build:pages
```

**Result:** Build succeeded after brand integration.

---

## Remaining inconsistencies

| Item | Notes |
|------|-------|
| `debug.analytics.tsx` | Dev-only route still uses inline `#111` debug styles (intentional for diagnostics) |
| `components/dashboard/time.tsx` | Activity category colors remain distinct hues (functional, not brand accents) |
| `components/ui/*` | shadcn primitives inherit theme via CSS vars — no per-component overrides needed |
| Light mode | Brand kit defines light mode; Cortex remains dark-first only |
| `AtriveoWordmark` | Component created but not placed in compact sidebar (mark + text used instead) |
| Category chart colors | Chart-1..5 updated to Signal-led palette; per-category bars unchanged for readability |

---

## What was NOT changed

- Routes, navigation structure, information architecture
- API clients, analytics logic, data fetching
- Backend, Worker, database code
- Component layouts and grid structures
- Business logic and user flows

---

## Reference

Brand kit source: `/Volumes/Kasliwal v2/working-memory/Atriveo Brand Foundation/`

Key brand primitives:
- **Mark:** Directional Apex (serif A + compass needle)
- **Palette:** Bone `#FAFAF7`, Ink `#0B0D12`, Signal `#2B59FF`
- **Type:** Instrument Serif (display), Inter (UI), JetBrains Mono (data/labels)
