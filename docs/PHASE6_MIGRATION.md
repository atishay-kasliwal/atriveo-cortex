# Phase 6 Migration Notes

Date: 2026-06-17

## Database

New tables in `working-memory.db` (auto-created on first API call):

| Table | Purpose |
|-------|---------|
| `analytics_runs` | Observability for on-demand sync runs |
| `activity_sessions` | Detected work sessions |
| `application_usage` | Daily app time rollups |
| `website_usage` | Daily domain rollups |
| `daily_activity_summary` | Per-day totals |

No manual migration required — `memory-db.ts` `migrate()` runs on `ensureDbConnection()`.

## Behavior

- Analytics are **regenerated on every API request** for the requested date range.
- Each sync writes one `analytics_runs` row with `started_at`, `completed_at`, `status`, `duration_ms`, `records_processed`, `window_start`, `window_end`.
- Data source: ScreenPipe `frames` table (read-only). If ScreenPipe DB is missing, APIs return empty analytics (0 minutes, empty arrays).

## API examples

```bash
# Today
curl -s http://127.0.0.1:3456/api/analytics/today | jq .

# Specific day
curl -s "http://127.0.0.1:3456/api/analytics/day?date=2026-06-17" | jq .

# Week (7 days from start, or last 7 days)
curl -s "http://127.0.0.1:3456/api/analytics/week?start=2026-06-11" | jq .

# Month
curl -s "http://127.0.0.1:3456/api/analytics/month?start=2026-06" | jq .

# Granular endpoints
curl -s http://127.0.0.1:3456/api/analytics/apps | jq .
curl -s http://127.0.0.1:3456/api/analytics/websites | jq .
curl -s http://127.0.0.1:3456/api/analytics/projects | jq .
curl -s http://127.0.0.1:3456/api/analytics/sessions | jq .
```

## Response envelope

All routes return `{ "success": true, "data": { ... } }`.

Durations are in **seconds** (`activeSec`, `durationSec`) for UI compatibility.

Categories are lowercase (`build`, `research`, etc.).

## Rollback

Tables can be dropped without affecting memory/extraction data:

```sql
DROP TABLE IF EXISTS analytics_runs;
DROP TABLE IF EXISTS activity_sessions;
DROP TABLE IF EXISTS application_usage;
DROP TABLE IF EXISTS website_usage;
DROP TABLE IF EXISTS daily_activity_summary;
```
