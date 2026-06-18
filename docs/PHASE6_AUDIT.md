# Phase 6 Audit

Date: 2026-06-17  
Scope: `working-memory/playground` (backend) + `working-memory/apps/cortex-ui` (frontend)  
Method: Static codebase inspection — no code modified.

---

## Database tables

| Artifact | Status | Location | Notes |
|----------|--------|----------|-------|
| `activity_sessions` | **EXISTS** | `playground/lib/memory-db.ts` (lines 210–224) | Columns: `id`, `start_time`, `end_time`, `duration_minutes`, `dominant_app`, `dominant_project`, `session_type`, `date`. Indexes on `date`, `start_time`. Written by `analytics-db.ts` → `saveSessions()`. |
| `application_usage` | **EXISTS** | `playground/lib/memory-db.ts` (lines 226–231) | Columns: `date`, `app_name`, `active_minutes`. PK `(date, app_name)`. Written by `saveApplicationUsage()`. |
| `website_usage` | **EXISTS** | `playground/lib/memory-db.ts` (lines 233–239) | Columns: `date`, `domain`, `active_minutes`, `visit_count`. PK `(date, domain)`. Written by `saveWebsiteUsage()`. |
| `daily_activity_summary` | **EXISTS** | `playground/lib/memory-db.ts` (lines 241–249) | Columns: `date`, `active_minutes`, `idle_minutes`, `focused_minutes`, `meeting_minutes`, `project_count`, `open_loop_count`. Written by `saveDailySummary()`. |
| `analytics_runs` | **EXISTS** | `playground/lib/memory-db.ts` (lines 195–208) | Required columns present: `started_at`, `completed_at`, `status`, `duration_ms`, `records_processed`, `window_start`, `window_end`. Also has `id`, `error_message`. Written by `startAnalyticsRun()` / `completeAnalyticsRun()`. |

**Migration:** All tables created via `CREATE TABLE IF NOT EXISTS` inside `migrate()` in `memory-db.ts`. No separate migration runner. Tables appear on first `ensureDbConnection()` call.

---

## API routes

| Endpoint | Status | Route file | Notes |
|----------|--------|------------|-------|
| `GET /api/analytics/today` | **EXISTS** | `playground/app/api/analytics/today/route.ts` | Calls `buildTodayActivity()` → on-demand `syncDay()` for today. Returns full `TodayActivity` DTO. |
| `GET /api/analytics/day?date=` | **EXISTS** | `playground/app/api/analytics/day/route.ts` | Same builder; `date` query param via `todayDateParam()`. |
| `GET /api/analytics/week?start=` | **EXISTS** | `playground/app/api/analytics/week/route.ts` | Syncs full 7-day range via `ensureWeekSynced()`. Returns `WeekActivity` shape with `days`, rollups, memory panels. |
| `GET /api/analytics/month?start=` | **EXISTS** | `playground/app/api/analytics/month/route.ts` | Syncs full calendar month via `ensureMonthSynced()`. Returns `MonthActivity` with `weeks` buckets. |
| `GET /api/analytics/apps` | **PARTIAL** | `playground/app/api/analytics/apps/route.ts` | Supports `?date=`, `?from=&to=`. **Only triggers sync when `from === to` (single day).** Multi-day `from`/`to` reads DB without syncing intermediate days. |
| `GET /api/analytics/websites` | **PARTIAL** | `playground/app/api/analytics/websites/route.ts` | Same sync gap as `/apps` for multi-day ranges. |
| `GET /api/analytics/projects` | **PARTIAL** | `playground/app/api/analytics/projects/route.ts` | Same sync gap as `/apps` for multi-day ranges. |
| `GET /api/analytics/sessions` | **PARTIAL** | `playground/app/api/analytics/sessions/route.ts` | Same sync gap as `/apps` for multi-day ranges. |

All routes use `{ success, data }` envelope via `apiSuccess()` / `apiError()`.

---

## Supporting backend pipeline (reference)

| Component | Status | Path |
|-----------|--------|------|
| Session detector | **EXISTS** | `playground/lib/analytics/session-detector.ts` |
| Website parser | **EXISTS** | `playground/lib/analytics/website-parser.ts` |
| Category map | **EXISTS** | `playground/lib/analytics/category-map.ts` |
| Aggregator / date helpers | **EXISTS** | `playground/lib/analytics/aggregator.ts` |
| Analytics DB layer | **EXISTS** | `playground/lib/analytics/analytics-db.ts` |
| On-demand sync service | **EXISTS** | `playground/lib/analytics/analytics-service.ts` |
| API builders | **EXISTS** | `playground/lib/analytics/analytics-api.ts` |
| DTOs | **EXISTS** | `playground/lib/api/analytics-dtos.ts` |
| ScreenPipe frame reader | **EXISTS** | `playground/lib/screenpipe-db.ts` (`fetchFramesForWindow`, `screenpipeDbExists`) |

---

## Tests

| Test file | Status |
|-----------|--------|
| `lib/analytics/session-detector.test.ts` | **EXISTS** (4 tests) |
| `lib/analytics/website-parser.test.ts` | **EXISTS** (5 tests) |
| `lib/analytics/analytics-db.test.ts` | **EXISTS** (2 tests) |
| API route integration tests | **MISSING** | No `app/api/analytics/**/*.test.ts` |

---

## Frontend (Phase 6C)

| Artifact | Status | Path |
|----------|--------|------|
| `analytics-adapter.ts` | **EXISTS** | `apps/cortex-ui/src/lib/api/analytics-adapter.ts` |
| Activity types | **EXISTS** | `apps/cortex-ui/src/lib/api/types.ts` |
| `todayQuery` / `weekQuery` / `monthQuery` | **EXISTS** | `apps/cortex-ui/src/lib/api/queries.ts` |
| `api.analytics` client | **EXISTS** | `apps/cortex-ui/src/lib/api/client.ts` |
| `time.tsx` helpers | **EXISTS** | `apps/cortex-ui/src/components/dashboard/time.tsx` |
| Activity homepage `/` | **EXISTS** | `apps/cortex-ui/src/routes/index.tsx` |
| Memory overview `/overview` | **EXISTS** | `apps/cortex-ui/src/routes/overview.tsx` |
| Sidebar nav update | **EXISTS** | `apps/cortex-ui/src/components/app-sidebar.tsx` |
| Separate `/day`, `/week`, `/month` routes | **MISSING** | Implemented as tabs on `/` only |
| `/timeline` route | **MISSING** | Timeline embedded in Today tab on `/` |

---

## Documentation

| Doc | Status |
|-----|--------|
| `docs/ANALYTICS_ARCHITECTURE.md` | **EXISTS** |
| `docs/PHASE6_MIGRATION.md` | **EXISTS** |
| `docs/PHASE6_DELIVERABLES.md` | **EXISTS** |
| `docs/INTEGRATION_PLAN.md` | **EXISTS** |
| `docs/LOVABLE_DIFF_REPORT.md` | **EXISTS** |

---

## Summary checklist (requested items only)

### Tables

- [x] `activity_sessions` — **EXISTS**
- [x] `application_usage` — **EXISTS**
- [x] `website_usage` — **EXISTS**
- [x] `daily_activity_summary` — **EXISTS**
- [x] `analytics_runs` — **EXISTS**

### APIs

- [x] `/api/analytics/today` — **EXISTS**
- [x] `/api/analytics/day` — **EXISTS**
- [x] `/api/analytics/week` — **EXISTS**
- [x] `/api/analytics/month` — **EXISTS**
- [~] `/api/analytics/apps` — **PARTIAL** (multi-day `from`/`to` does not sync)
- [~] `/api/analytics/websites` — **PARTIAL** (multi-day `from`/`to` does not sync)
- [~] `/api/analytics/projects` — **PARTIAL** (multi-day `from`/`to` does not sync)
- [~] `/api/analytics/sessions` — **PARTIAL** (multi-day `from`/`to` does not sync)

### Counts

| Status | Count |
|--------|-------|
| **EXISTS** | 13 / 13 requested items fully or substantially present |
| **PARTIAL** | 4 / 13 (granular rollup endpoints only) |
| **MISSING** | 0 / 13 among requested tables + APIs |

---

## Runtime caveat

Schema and routes exist in code. **Live data depends on ScreenPipe DB availability** (`SCREENPIPE_DB` or default `../data/screenpipe/db.sqlite`). At audit time that file was not present on disk, so APIs return empty analytics even though all artifacts exist in the codebase.
