# Phase 6 Deliverables

Date: 2026-06-17

## Status

| Phase | Status | Tests |
|-------|--------|-------|
| 6A — Analytics tables + pipeline | ✅ Complete | 11 analytics unit tests |
| 6B — `/api/analytics/*` routes | ✅ Complete | 45 total playground tests passing |
| 6C — Activity-first UI | ✅ Complete | `npm run build` succeeds |

---

## Phase 6A — Backend pipeline

### Tables (auto-migrated in `memory-db.ts`)

- `analytics_runs` — observability per on-demand sync
- `activity_sessions`
- `application_usage`
- `website_usage`
- `daily_activity_summary`

### Core modules

```
playground/lib/analytics/
  types.ts
  category-map.ts
  website-parser.ts
  session-detector.ts
  aggregator.ts
  analytics-db.ts
  analytics-service.ts
  analytics-api.ts
```

### Session rules

- New session on **>10 min** inactivity or **significant app change** (3 consecutive frames)
- Active time attributed between frames (capped at 10 min per gap)
- Website domains from Chrome/Arc/Safari window titles
- Categories: BUILD, RESEARCH, COMMUNICATION, PLANNING, ENTERTAINMENT, OTHER

---

## Phase 6B — API routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/analytics/today` | Today activity + timeline |
| `GET /api/analytics/day?date=` | Specific day |
| `GET /api/analytics/week?start=` | 7-day window |
| `GET /api/analytics/month?start=` | Calendar month |
| `GET /api/analytics/apps` | App usage rollup |
| `GET /api/analytics/websites` | Domain rollup |
| `GET /api/analytics/projects` | Project time rollup |
| `GET /api/analytics/sessions` | Session list |

### Example response (`/api/analytics/today`)

```json
{
  "success": true,
  "data": {
    "date": "2026-06-17",
    "generatedAt": "2026-06-17T16:51:41.048Z",
    "activeSec": 0,
    "focusSec": 0,
    "idleSec": 0,
    "meetingSec": 0,
    "projectsTouched": 0,
    "openLoopsCount": 0,
    "timeline": [],
    "apps": [],
    "websites": [],
    "projects": [],
    "emergingIdeas": [],
    "openLoops": []
  }
}
```

Empty arrays are expected when ScreenPipe DB is missing or has no frames for the day. Set `SCREENPIPE_DB` or ensure `../data/screenpipe/db.sqlite` exists with frame data.

### `analytics_runs` observability

Each on-demand sync inserts a row:

```sql
SELECT id, status, duration_ms, records_processed, window_start, window_end
FROM analytics_runs ORDER BY started_at DESC LIMIT 5;
```

---

## Phase 6C — Frontend

### Preserved

- `cortex-adapter.ts`, `cortex-fetch.ts`, `cortex-types.ts`
- All memory routes (actions, ideas, projects, open-loops, recurrence)

### Added

- `analytics-adapter.ts` → `/api/analytics/*`
- `components/dashboard/time.tsx`
- Activity dashboard at `/` (Today / Week / Month tabs)
- Memory overview moved to `/overview`
- Sidebar: Activity → Today, Memory → Overview

### Verify locally

```bash
# Terminal 1 — engine
cd playground && npm run dev

# Terminal 2 — UI
cd apps/cortex-ui && npm run dev
```

- http://localhost:5173/ — activity dashboard
- http://localhost:5173/overview — memory dashboard

---

## Screenshots

Screenshots require a running UI with ScreenPipe capture data. With no ScreenPipe DB at `working-memory/data/screenpipe/db.sqlite`, the activity dashboard shows empty states (by design).

To capture screenshots with real data:

1. Run ScreenPipe and capture frames
2. Point engine at DB: `SCREENPIPE_DB=/path/to/screenpipe/db.sqlite npm run dev`
3. Open http://localhost:5173/ — timeline and allocation panels populate on first API call

---

## Migration

See [`PHASE6_MIGRATION.md`](./PHASE6_MIGRATION.md).

---

## Not implemented (per spec)

- Daily / weekly review
- AI summaries
- Forecasting
- Background jobs / cron / workers
