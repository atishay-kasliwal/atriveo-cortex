# Attention Weather Map (Phase 16.2)

## Goal

Describe the day as **weather** — fog, storms, drizzle — instead of bar charts. Tier 2 memory visualization beside Sankey / Focus Mountain.

## Data

- `playground/lib/analytics/attention-weather.ts` — six 4-hour periods, cell kinds: `clear`, `storm`, `fog`, `drizzle`, `overcast`, `windy`
- Added to `AttentionVisualizations.weather` in `buildAttentionVisualizations()`

## UI

- `apps/cortex-ui/src/components/attention/visualizations/attention-weather-map.tsx`
- Full map + legend on `/attention` via `AttentionMemorySection`
- Compact sky strip on Home Attention section

## Success

User describes the day in weather words within ~5 seconds without reading percentages.
