# Product Momentum Map (Phase 16.1)

## Goal

Surface **project trajectory** on Home — which projects are gaining or losing attention — without opening `/projects`.

## Data

- `playground/lib/analytics/product-momentum.ts` — `buildProductMomentum(today, yesterday)`
- Wired into `DayAttentionDTO.productMomentum` via `buildDayAttention()` (day-over-day from previous day's `projectAttention`)

## UI

- `apps/cortex-ui/src/components/home/product-momentum-map.tsx`
- Home section between **Activity log** and **Screens**
- Bar length = attention share; color = momentum; % = day-over-day change
- Row links to `/projects/$id`

## Success

User opens Home and immediately sees which projects are heating up or cooling off.
