# Lovable Diff Report

Date: 2026-06-17

## Export location

**New Lovable export:** `/Volumes/Kasliwal v2/Screenpipe/Dashboard Ideas Hub`  
**Last modified:** 2026-06-17 12:33

**Integrated Cortex UI:** `/Volumes/Kasliwal v2/working-memory/apps/cortex-ui`

This is an **in-place update** of the same Lovable project (not a separate folder). The export adds Phase 6 **Time & Activity** UI on top of the original memory dashboard.

---

## Summary

| Area | Lovable (new) | cortex-ui (integrated) | Verdict |
|------|---------------|------------------------|---------|
| Routes | 12 files, same paths | 12 files, same paths | **No new route files** — activity is tab-based on `/` |
| Home page | Activity-first Today/Week/Month | Memory-first Overview | **Major conflict** |
| API layer | Raw Lovable client (`/time/*`, `/overview`) | Cortex adapter (`cortex-*`) | **Do not overwrite** |
| Sidebar | Activity → Today | Memory → Overview | Merge nav only |
| Dependencies | Identical `package.json` | Identical | No new packages |
| Charts | Recharts already present; week/month bar viz in `index.tsx` | No charts on home | **UI addition** |

---

## New files (in Lovable export only)

| File | Purpose |
|------|---------|
| `src/components/dashboard/time.tsx` | Activity category colors, `fmtDuration`, `fmtClock` helpers |

---

## Files only in cortex-ui (must preserve)

| File | Purpose |
|------|---------|
| `src/lib/api/cortex-adapter.ts` | Maps Cortex `{ success, data }` → UI types |
| `src/lib/api/cortex-fetch.ts` | Engine URL, envelope parsing, CORS dev |
| `src/lib/api/cortex-types.ts` | Backend DTO mirrors |
| `.env.development` | `VITE_API_URL=http://127.0.0.1:3456` |
| `vite.config.ts` | Port 5173, `/tmp` cache, proxy fallback |

---

## Changed files (meaningful diff)

### Routes

| File | Lovable change | cortex-ui state | Conflict risk |
|------|----------------|-----------------|---------------|
| `src/routes/index.tsx` | **782 lines** — Today/Week/Month activity dashboard with timeline ribbon, allocation tabs, emerging ideas, open loops panels | **233 lines** — memory Overview (project/action/idea counts) | **HIGH** — merge UI only, keep Cortex data layer |
| `src/routes/actions.tsx` | Original open/completed/review tabs | Adapted to unresolved/recurring/newest + Cortex API | **MEDIUM** — keep cortex-ui version |
| `src/routes/projects.tsx` | Original action/idea/open stats | Adapted mention counts + Cortex API | **LOW** — keep cortex-ui version |
| Other routes (`actions.$id`, `ideas`, `open-loops`, `recurrence`, `projects.$id`) | Unchanged vs first export | Wired to Cortex | **LOW** |

### Components

| File | Lovable change | Conflict risk |
|------|----------------|---------------|
| `src/components/app-sidebar.tsx` | Nav groups: **Activity** (Today), **Work** (Projects), **Extracted** (Actions/Ideas/Open Loops/Recurrence) | **MEDIUM** — merge groups, add Week/Month links later |
| `src/components/dashboard/time.tsx` | **NEW** — category chips, duration formatting | **NONE** — safe to copy |
| `src/components/dashboard/states.tsx` | Same | None |
| `src/components/dashboard/page-shell.tsx` | Same | None |
| `src/components/dashboard/why.tsx` | Same | None |

### API layer

| File | Lovable | cortex-ui | Action |
|------|---------|-----------|--------|
| `src/lib/api/client.ts` | Raw fetch to `/api` + `api.time.today/week/month` at `/time/*` | Delegates to `cortex-adapter` | **Keep cortex-ui** |
| `src/lib/api/types.ts` | +130 lines activity types (`TodayActivity`, `WeekActivity`, `MonthActivity`, `TimelineBlock`, etc.) | Memory types only | **Merge types** into cortex-ui `types.ts` |
| `src/lib/api/queries.ts` | +`todayQuery`, `weekQuery`, `monthQuery` | Cortex memory queries | **Extend** queries, wire to analytics adapter |

### Config

| File | Lovable | cortex-ui |
|------|---------|-----------|
| `vite.config.ts` | Default Lovable (port 8080) | Port 5173, cacheDir, proxy |
| `package.json` | `tanstack_start_ts` | `cortex-ui` |

---

## New pages (Lovable UI — not separate routes)

Lovable implements Today / Week / Month as **tabs on `/`**, not separate URLs:

| Desired route (Phase 6 spec) | Lovable implementation | Notes |
|----------------------------|------------------------|-------|
| `/overview` | Not present — `/` is Today | Spec wants `/overview`; Lovable uses `/` |
| `/day` | Tab on `/` | Could split to `/day` route |
| `/week` | Tab on `/` | Could split to `/week` |
| `/month` | Tab on `/` | Could split to `/month` |
| `/timeline` | Embedded in Today tab (`DayRibbon` + `BlockList`) | Could extract to `/timeline` |
| `/projects/:id` | Already exists | No Lovable change |

---

## New UI elements (from Lovable `index.tsx`)

### Summary cards
- Active, Focused, Idle, Meetings, Projects touched, Open loops count

### Today view
- 24h category ribbon (`DayRibbon`)
- Activity block list with category chips
- Category legend (build, research, communication, planning, entertainment)

### Week view
- 7-day stacked bar chart (`DailyBars`) by category

### Month view
- Weekly aggregation bars (`WeeklyBars`)

### Time allocation tabs
- Applications list (`AppList`)
- Websites list (`WebsiteList`)
- Projects list (`ProjectList`) — links to `/projects/$id`

### Memory panels (bottom)
- Emerging ideas table with trend chips
- Open loops table with days open / mentions

### New charts
- Custom CSS bar visualizations (not Recharts components in home page)
- `components/ui/chart.tsx` exists in both (shadcn/Recharts wrapper) — unchanged

---

## New dependencies

**None.** `package.json` dependencies are identical between exports. Recharts was already present.

---

## Lovable API expectations (not Cortex)

Lovable `client.ts` expects these endpoints (will 404 against current engine):

| Lovable path | Cortex equivalent (to build) |
|--------------|------------------------------|
| `GET /api/time/today?date=` | `GET /api/analytics/today` or `/api/analytics/day?date=` |
| `GET /api/time/week?start=` | `GET /api/analytics/week` |
| `GET /api/time/month?start=` | `GET /api/analytics/month` |
| `GET /api/overview` | `GET /api/dashboard/overview` (exists) |
| `GET /api/projects` | `GET /api/memory/projects` (exists, different shape) |

Lovable types use **seconds** (`activeSec`, `durationSec`). Phase 6 spec tables use **minutes** — adapter must convert.

Lovable categories are lowercase (`build`, `research`, …). Phase 6 spec uses uppercase (`BUILD`, `RESEARCH`, …) — map in adapter.

---

## Files removed

None in Lovable export vs first export. cortex-ui **added** files (adapter layer) that Lovable does not have.

---

## Potential conflicts (ranked)

1. **`index.tsx`** — full replacement if copied blindly; destroys working memory Overview
2. **`client.ts`** — overwrites Cortex adapter integration
3. **`queries.ts`** — loses Cortex query wiring for memory pages
4. **`app-sidebar.tsx`** — nav structure change; manageable merge
5. **`actions.tsx`** — Lovable revert would break Cortex action buckets
6. **Route tree** — adding `/day`, `/week`, `/month` requires new files + `routeTree.gen.ts` regen

---

## Recommended merge strategy (preview)

See `INTEGRATION_PLAN.md` for full rollout. Short version:

1. Copy `time.tsx` component as-is
2. Merge activity types into `types.ts`
3. Add `analytics-adapter.ts` (parallel to `cortex-adapter.ts`) — map `/api/analytics/*` → Lovable UI types
4. Port Lovable `index.tsx` UI into new routes incrementally (`/`, `/week`, `/month`) without touching memory pages
5. **Never** replace `cortex-fetch.ts`, `cortex-adapter.ts`, or memory adapter functions
