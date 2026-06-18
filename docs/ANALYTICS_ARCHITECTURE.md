# Analytics Architecture — Phase 6

Date: 2026-06-17  
Engine: `playground/` (Next.js + SQLite)  
Data source: **ScreenPipe only** (read-only `screenpipe/db.sqlite`)  
Constraints: No LLMs, no embeddings, no vector DB

---

## Overview

Phase 6 adds Apple Screen Time–style analytics: Today, Week, Month views powered by ScreenPipe frame timestamps, app names, and window titles. Analytics are **derived** from raw capture data and stored in the Cortex working-memory SQLite database (`working-memory.db`), separate from ScreenPipe's DB.

```
ScreenPipe DB (readonly)          Cortex DB (read/write)
┌─────────────────────┐          ┌──────────────────────────┐
│ frames              │──read──▶ │ activity_sessions        │
│ ui_events           │          │ application_usage        │
│ audio_transcriptions│          │ website_usage            │
└─────────────────────┘          │ daily_activity_summary   │
                                 └──────────────────────────┘
                                            │
                                            ▼
                                 GET /api/analytics/*
```

Existing reference: `playground/lib/screenpipe-db.ts` already reads `frames`, `ui_events`, and `audio_transcriptions` for evidence extraction.

---

## Analytics tables

### `activity_sessions`

One row per detected work session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto |
| `start_time` | TEXT ISO | Session start |
| `end_time` | TEXT ISO | Session end |
| `duration_minutes` | REAL | `(end - start)` in minutes |
| `dominant_app` | TEXT | App with most frame time in session |
| `dominant_project` | TEXT NULL | Best-effort project from window title / memory join |
| `session_type` | TEXT | Category: `BUILD`, `RESEARCH`, `COMMUNICATION`, `PLANNING`, `ENTERTAINMENT`, `OTHER` |

### `application_usage`

Daily rollup per application.

| Column | Type | Description |
|--------|------|-------------|
| `date` | TEXT `YYYY-MM-DD` | Local calendar date |
| `app_name` | TEXT | e.g. `Cursor`, `Google Chrome` |
| `active_minutes` | REAL | Active time in app |

### `website_usage`

Daily rollup per domain (browser windows only).

| Column | Type | Description |
|--------|------|-------------|
| `date` | TEXT | Local date |
| `domain` | TEXT | e.g. `github.com` |
| `active_minutes` | REAL | Active time on domain |
| `visit_count` | INTEGER | Distinct visit segments |

### `daily_activity_summary`

One row per calendar day.

| Column | Type | Description |
|--------|------|-------------|
| `date` | TEXT | Local date |
| `active_minutes` | REAL | Total active time |
| `idle_minutes` | REAL | Gaps > 10 min between frames |
| `focused_minutes` | REAL | Longest continuous BUILD/PLANNING block |
| `meeting_minutes` | REAL | Zoom/Meet/Teams/Slack huddle time |
| `project_count` | INTEGER | Distinct projects touched |
| `open_loop_count` | INTEGER | From existing `open_loops` table |

---

## Active time calculation

**Input:** ScreenPipe `frames` table (`timestamp`, `app_name`, `window_name`).

**Algorithm:**

1. Load frames for time window, ordered by `timestamp`.
2. Between consecutive frames, compute gap `Δt`.
3. If `Δt ≤ 10 minutes`, attribute `Δt` to the **previous frame's app** (user was still in context).
4. If `Δt > 10 minutes`, count as **idle** — do not attribute to any app.
5. Cap any single gap attribution at 10 minutes (prevents overnight inflation).
6. Sum attributed seconds per app → `active_minutes = seconds / 60`.

**Rationale:** ScreenPipe captures frames on an interval (not continuous video). Gap-based attribution is the standard Screen Time proxy without ML.

```
Frame: 09:00 Cursor
Frame: 09:02 Cursor     → +2 min active (Cursor)
Frame: 09:03 Chrome     → +1 min active (Cursor), session break candidate
[gap 45 min]
Frame: 09:48 Cursor     → +45 min idle (gap > 10 min)
```

---

## Idle time calculation

**Idle** = sum of gaps where `Δt > 10 minutes` between consecutive frames (any app).

Stored in `daily_activity_summary.idle_minutes`.

Displayed on Today/Week/Month summary cards as `idleSec` in UI (adapter converts minutes → seconds).

---

## Session segmentation

A **new session** starts when:

1. **Inactivity gap > 10 minutes** between frames, OR
2. **Dominant application changes significantly** — previous session's top app ≠ new frame's app AND the new app has persisted for ≥ 3 consecutive frames (≈2–3 min debounce to avoid alt-tab noise).

**Per session, compute:**

- `start_time` / `end_time` from first/last frame
- `duration_minutes`
- `dominant_app` — app with highest attributed seconds
- `dominant_project` — optional join to `project_memory` via window title tokens
- `session_type` — category of `dominant_app` + domain (see below)

Sessions map to UI `TimelineBlock[]` for the Today view ribbon.

---

## Website extraction

**Sources:** Browser window titles from Chrome, Arc, Safari.

**Detection:**

```sql
SELECT app_name, window_name, timestamp
FROM frames
WHERE lower(app_name) LIKE '%chrome%'
   OR lower(app_name) LIKE '%arc%'
   OR lower(app_name) LIKE '%safari%'
```

**Domain parsing** (no LLM):

1. Regex URL in title: `(https?://)?([a-z0-9-]+\.)+[a-z]{2,}`
2. Fallback: known patterns — `github.com` from "GitHub — ...", `mail.google.com` from "Gmail", etc.
3. Strip `www.` prefix; lowercase.

**Visit count:** increment when domain changes or gap > 5 minutes within same browser session.

---

## Activity categories

Map apps and domains to session type:

| Category | Apps (examples) | Domains (examples) |
|----------|-----------------|-------------------|
| `BUILD` | Cursor, VS Code, Xcode, Terminal, iTerm | `github.com`, `localhost` |
| `RESEARCH` | Safari, Chrome, Arc, Firefox | `stackoverflow.com`, `docs.*`, `arxiv.org` |
| `COMMUNICATION` | Slack, Discord, Messages, Mail | `gmail.com`, `linkedin.com`, `twitter.com` |
| `PLANNING` | Notion, Linear, Jira, Asana, Calendar | `notion.so`, `linear.app` |
| `ENTERTAINMENT` | Spotify, Netflix, YouTube app | `youtube.com`, `netflix.com`, `reddit.com` |
| `OTHER` | Everything else | Unmatched |

**Meeting detection** (for `meeting_minutes`): app in (`Zoom`, `Google Meet`, `Microsoft Teams`, `FaceTime`) OR window title contains `Meeting`, `Huddle`, `Standup`.

**Focused minutes:** longest contiguous session where `session_type ∈ (BUILD, PLANNING)` and duration ≥ 15 minutes.

---

## Week / month aggregation

### Week (`GET /api/analytics/week`)

1. Query `daily_activity_summary` for last 7 days (or `?start=` param).
2. Build `days[]` array with per-day `activeSec`, `focusSec`, `meetingSec`, `idleSec`.
3. Per day, sum `application_usage` grouped by category → `byCategory[]`.
4. Roll up top apps/websites/projects across the week.
5. Attach `emergingIdeas` + `openLoops` from existing memory APIs (read-only join).

### Month (`GET /api/analytics/month`)

1. Query `daily_activity_summary` for calendar month.
2. Group days into ISO weeks → `weeks[]` with `weekStart`, `activeSec`, `focusSec`, `meetingSec`, `idleSec`.
3. Same app/website/project rollups as week.
4. Attach memory panels.

### Today (`GET /api/analytics/today`)

1. Run session detection for today 00:00 → now.
2. Return `timeline[]` from `activity_sessions` as `TimelineBlock` DTOs.
3. Return summary totals from `daily_activity_summary` for today.
4. Return apps/websites/projects for today from usage tables.
5. Attach emerging ideas + open loops.

---

## API surface

All routes use `{ success: true, data: ... }` envelope (existing Cortex convention).

| Endpoint | Returns | UI consumer |
|----------|---------|-------------|
| `GET /api/analytics/today` | `TodayActivityDTO` | `/` Today tab |
| `GET /api/analytics/day?date=YYYY-MM-DD` | `TodayActivityDTO` | `/day` |
| `GET /api/analytics/week?start=` | `WeekActivityDTO` | Week tab |
| `GET /api/analytics/month?start=` | `MonthActivityDTO` | Month tab |
| `GET /api/analytics/apps?date=&from=&to=` | `AppUsageDTO[]` | Allocation tab |
| `GET /api/analytics/websites?date=&from=&to=` | `WebsiteUsageDTO[]` | Allocation tab |
| `GET /api/analytics/projects?date=&from=&to=` | `ProjectTimeDTO[]` | Allocation tab |
| `GET /api/analytics/sessions?date=&from=&to=` | `SessionDTO[]` | Timeline |

DTO field names: **camelCase** in JSON. Durations exposed as **seconds** in API responses to match Lovable UI types (`activeSec`, `durationSec`).

---

## Pipeline / refresh

```
On demand (API request) or scheduled job:
  1. Read ScreenPipe frames for date range
  2. Compute sessions + usage rollups
  3. UPSERT into analytics tables (idempotent per date)
  4. Return DTO
```

**Incremental strategy:** Track `analytics_sync_cursor` (last processed frame timestamp) to avoid full re-scan.

**No extraction logic changes** — analytics reads ScreenPipe directly, parallel to the existing hourly extraction pipeline.

---

## UI type mapping

| Backend (DB) | API DTO | Lovable UI type |
|--------------|---------|-----------------|
| `duration_minutes` | `durationSec` | `TimelineBlock.durationSec` |
| `session_type` `BUILD` | `category: "build"` | `ActivityCategory` |
| `active_minutes` | `activeSec` | `TodayActivity.activeSec` |
| `open_loop_count` | `openLoopsCount` | summary card |

Adapter lives in `analytics-adapter.ts` (new file in cortex-ui, parallel to `cortex-adapter.ts`).

---

## Files to add (backend — planned)

```
playground/lib/analytics/
  ├── session-detector.ts
  ├── website-parser.ts
  ├── category-map.ts
  ├── aggregator.ts
  ├── analytics-db.ts
  └── types.ts

playground/app/api/analytics/
  ├── today/route.ts
  ├── day/route.ts
  ├── week/route.ts
  ├── month/route.ts
  ├── apps/route.ts
  ├── websites/route.ts
  ├── projects/route.ts
  └── sessions/route.ts
```

---

## Out of scope (per spec)

- Daily Review / Weekly Review UI
- Vector DB / embeddings
- LLM-based categorization
- Changes to extraction prompt or `extract.ts` logic
