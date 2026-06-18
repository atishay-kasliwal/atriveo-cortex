# Memory First UX Report — Phase 15.2

**Date:** 2026-06-17  
**Goal:** Replace dashboard thinking with memory thinking. A user should understand their day in under 10 seconds.

---

## Executive Summary

Home (`/`) is now a **memory-first narrative**, not a telemetry dashboard. Five sections answer the questions users actually ask; raw apps/websites/sessions moved to Debug. Vertical space reduced ~30% via tighter spacing, compact ribbon, and removal of week mini, work journal, and embedded `TodayView`.

| Question | Section | Source |
|----------|---------|--------|
| What happened today? | Daily narrative | Daily review headline + summary |
| Where did attention go? | Projects | Review + **attention API** + loops + momentum |
| What moved forward? | Accomplishments | Evidence-backed review accomplishments only |
| What remains unfinished? | Still in progress | Open loops + open work, **grouped by project** |
| What deserves attention next? | Recommended next steps | Top 3, ranked by age/momentum/attention/recurrence |

---

## Home Layout (top → bottom)

### 1. Compact status ribbon
Merges capture pipeline state + day activity summary + memory freshness score.

- **Before:** Separate `ActivityCaptureBanner` + hero stat cards in activity views
- **After:** Single `MemoryStatusRibbon` — pipeline dot, active/focus/sessions, memory score, focus score

### 2. Daily narrative
- Subtitle: *What happened today?*
- Uses `headline` (primary) and `summary` (secondary when distinct)
- Review intelligence, not raw session text

### 3. Projects
Each card shows:
- **Momentum** (↑ / ↓ / Steady from weekly review)
- **Attention** (`GET /api/attention/day` percent, fallback to focus duration)
- **Progress** (completed + in-progress items from review)
- **Open loops** (count from intelligence board)

### 4. Accomplishments
- Filter: `evidence.length > 0` only
- No inferred wins

### 5. Still in progress
- Grouped by project (including "Unassigned")
- Blocked groups sort first
- Links to open loop detail when available

### 6. Recommended next steps
- Maximum 3
- Ranking weights: age 35%, momentum urgency 25%, attention 25%, recurrence 15%
- Uses loops board, weekly momentum, day attention, recurrence patterns

### Removed from Home
| Removed | Moved to |
|---------|----------|
| Week in review mini | `/weekly-review` |
| Work journal | `/review`, `/activity` timeline |
| Raw activity (`TodayView`) | `/debug/telemetry` |
| Apps / websites / sessions | `/debug/telemetry`, `/activity` |
| Visit counts / domains | `/debug/telemetry` |

Footer link: **Raw telemetry →** `/debug/telemetry?date=`

---

## Debug

New route: **`/debug/telemetry`**

Shows only:
- Raw sessions (stitched blocks)
- Applications (time per app)
- Websites (domains + visit counts)

Sidebar: Debug → Telemetry  
Full breakdowns remain on **Activity Log** (`/activity`).

---

## Data Flow

```
Home queries (parallel):
  GET /api/reviews/day?date=
  GET /api/reviews/week?start=
  GET /api/open-loops?limit=100
  GET /api/attention/day?date=          ← NEW on home
  GET /api/recurrence                   ← NEW for ranking
  GET /api/analytics/day?date=          ← ribbon + pipeline only
  GET /api/system/screenpipe-health
  GET /api/sync                         ← memory score in ribbon
```

Client transforms: `build-home-data.ts`
- `buildHomeProjectCards(review, weekly, loops, attention)`
- `buildStillInProgressByProject(review, loops)`
- `rankRecommendations(recs, { weekly, attention, loops, recurrence })`

---

## Space Reduction (~30%)

| Change | Impact |
|--------|--------|
| `space-y-10` → `space-y-6` | Section gaps |
| Section titles `text-xl` → `text-lg` | Header height |
| Card padding `p-4` → `p-3` | Card density |
| `PageBody` compact mode (`py-5`) | Page margins |
| Removed 3 major sections | Week, journal, raw activity |

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| User knows what happened | ✅ Daily narrative |
| User knows what moved forward | ✅ Accomplishments + project progress |
| User knows what remains unfinished | ✅ Still in progress by project |
| User knows what deserves attention next | ✅ Ranked recommendations (max 3) |
| Understand day in &lt;10 seconds | ✅ Narrative + ribbon + top projects first |
| Telemetry in debug only | ✅ `/debug/telemetry` |

---

## Files Changed

| File | Change |
|------|--------|
| `apps/cortex-ui/src/components/home/memory-home-view.tsx` | Memory-first 5-section layout |
| `apps/cortex-ui/src/components/home/memory-status-ribbon.tsx` | New compact ribbon |
| `apps/cortex-ui/src/lib/home/build-home-data.ts` | Attention, grouping, ranking |
| `apps/cortex-ui/src/lib/home/build-home-data.test.ts` | Unit tests |
| `apps/cortex-ui/src/components/debug/telemetry-debug-view.tsx` | Debug telemetry |
| `apps/cortex-ui/src/routes/debug.telemetry.tsx` | New route |
| `apps/cortex-ui/src/routes/index.tsx` | Compact page body |
| `apps/cortex-ui/src/components/dashboard/page-shell.tsx` | `compact` prop |
| `apps/cortex-ui/src/components/app-sidebar.tsx` | Telemetry nav link |

---

## Follow-ups (not in scope)

1. **`GET /api/home?date=`** — single aggregated endpoint to cut 7 parallel requests
2. **Merge `/overview`** into home or redirect (IA doc Phase 2)
3. **Mobile ribbon** — stack stats on narrow screens (partially done)
