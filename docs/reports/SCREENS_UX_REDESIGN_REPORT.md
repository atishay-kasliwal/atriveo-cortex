# Screens UX Simplification (Phase 15.6B)

## Goal

Transform **Screens** from a debugging view into a **memory view**. Users should answer within ~5 seconds:

- Which monitor was work?
- Which monitor was research?
- What was on my screens at 2 PM?

## Before

The page exposed raw monitor intelligence:

- Five insight chips (most used, productive, research, entertainment, distracting)
- Monitor utilization heatmap
- One large card **per monitor** with summary + **full timeline ribbon + up to 12 segment rows**
- Category bars repeated under each monitor
- Scroll depth **~2500–4000px** on multi-monitor days (1100+ segments)

**Problems:**

- User must manually compare Monitor 2 vs Monitor 4
- Minute-by-minute rows dominate the page
- No “what was on screen at 2 PM?” memory feature
- Generic “Monitor 1 / Monitor 2” labels without roles

## After

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Across all screens** | Build / Research / Comm / Fun totals + per-monitor contribution bars |
| 2 | **What was on my screens?** | Snapshot mode with time pills (09:00, 12:00, 15:00, 18:00) |
| 3 | **Monitor cards** | Compact cards: role, time, top apps/sites, categories, condensed ribbon |
| — | **View details →** | Right drawer with full segment list (not on default page) |

### Monitor roles (inferred)

From dominant category share (≥40%):

- Build Monitor
- Research Monitor
- Communication Monitor
- Entertainment Monitor
- Mixed Use

### Removed from default view

- Minute-by-minute segment rows
- Per-monitor segment tables above the fold
- Utilization heatmap
- Five insight chips (replaced by comparison + roles)

## Architecture

```
playground/lib/analytics/screens-decision.ts
  buildScreensDecisionView() → categoryComparison, monitorCards, snapshots
```

Embedded in `DayScreensDTO.decision` via `buildDayScreens()` — no new API route.

## Scroll depth reduction

| Metric | Before | After |
|--------|--------|-------|
| Default visible sections | ~3 + N monitors × (ribbon + 12 rows) | 3 sections + compact cards |
| Segment rows above fold | Up to 12 × N monitors | 0 |
| Estimated scroll (1080p, 4 monitors) | ~3000px | ~900px |
| Target | — | **<1000px** to first meaningful answer |

## Time-to-answer reduction

| Question | Before | After |
|----------|--------|-------|
| Which monitor was work? | Scan chips + category bars per monitor | Role badge on card + comparison section |
| Which monitor was research? | Same | Research row in comparison + role |
| What at 2 PM? | Not available | Snapshot section (12:00 / 15:00 pills) |

Target: **<5 seconds** for all three questions from comparison + snapshot + first monitor row.

## Files changed

| File | Change |
|------|--------|
| `playground/lib/analytics/screens-decision.ts` | Decision / memory layer (new) |
| `playground/lib/analytics/screens-decision.test.ts` | Unit tests |
| `playground/lib/analytics/screens_prci.ts` | `decision` on `DayScreensDTO` |
| `apps/cortex-ui/src/lib/api/types.ts` | `ScreensDecisionView` types |
| `apps/cortex-ui/src/components/screens/screens-view.tsx` | Full UX rewrite |
| `apps/cortex-ui/src/routes/screens.tsx` | Page copy |

## Testing

```bash
cd playground && npm test -- lib/analytics/screens-decision.test.ts
```

## Screenshots

Capture from `/screens` after deploy:

- **Before:** metric-heavy per-monitor timelines (commit before 15.6B)
- **After:** comparison + snapshot + compact cards

## Success criteria

- [x] Category comparison across monitors at top
- [x] Screen snapshot mode with time selector
- [x] Monitor roles on cards
- [x] Compact monitor cards with condensed ribbon only
- [x] Full segments in expandable drawer
- [x] No segment rows on default page

## Follow-up

- Custom snapshot time picker (e.g. 14:17) using client-side `resolveScreenSnapshot`
- Screens week view with same executive-summary pattern
